package com.intentaware.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.intentaware.backend.dto.gemini.Content;
import com.intentaware.backend.dto.gemini.GeminiRequest;
import com.intentaware.backend.dto.gemini.GeminiResponse;
import com.intentaware.backend.dto.gemini.Candidates;
import com.intentaware.backend.dto.gemini.InlineData;
import com.intentaware.backend.dto.gemini.Part;
import com.intentaware.backend.dto.recap.RecapData;
import com.intentaware.backend.dto.recap.SummaryGenerationResult;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class GeminiService {
  @Value("${gemini.api.key}")
  private String apiKey;

  @Value("${gemini.api.url}")
  private String apiUrl;

  @Autowired
  private RestTemplate restTemplate;

  public GeminiResponse checkAlignment(String intent, String screenshot) throws JsonProcessingException {
    Part textPart = new Part(
      "User's browsing intent: " + intent + "\n\n" +
      "Analyze this screenshot of a YouTube page. Does the content align with the user's intent?\n\n" +
      "Respond in this exact format:\n" +
      "ALIGNED: [brief reason]\n" +
      "or\n" +
      "MISALIGNED: [brief reason]"
  );
    Part imagepart = new Part(new InlineData("image/png",screenshot));
    Content content = new Content(Arrays.asList(textPart, imagepart));
    GeminiRequest request = new GeminiRequest(Arrays.asList(content));
    String requestJson = new ObjectMapper().writeValueAsString(request);
    HttpHeaders headers = new HttpHeaders();
    headers.set("x-goog-api-key", apiKey);
    headers.set("Content-Type", "application/json");
    HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);
    ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
    JSONObject responseJson = new JSONObject(response.getBody());
    JSONArray candidatesArray = responseJson.getJSONArray("candidates");
    if (candidatesArray == null || candidatesArray.length() == 0) {
      throw new IllegalStateException("Gemini returned no candidates");
    }
    JSONObject firstCandidate = candidatesArray.getJSONObject(0);
    JSONObject contentObj = firstCandidate.getJSONObject("content");
    JSONArray partsArray = contentObj.getJSONArray("parts");
    if (partsArray == null || partsArray.length() == 0) {
      throw new IllegalStateException("Gemini returned no parts");
    }
    JSONObject firstPart = partsArray.getJSONObject(0);
    String responseText = firstPart.optString("text", "").trim();
    if (responseText.isEmpty()) {
      throw new IllegalStateException("Gemini returned empty text");
    }

    // Build GeminiResponse (your DTO) - for now minimal structure
    List<Part> responseParts = List.of(new Part(responseText));
    Content responseContent = new Content(responseParts);
    Candidates candidate = new Candidates(responseContent);  // Candidates has Content content
    GeminiResponse geminiResponse = new GeminiResponse(List.of(candidate));
    return geminiResponse;
  }

  private static final String SUMMARY_INSTRUCTIONS =
      "Based on the following session recap data, generate a concise session summary with some constructive feedback if required. "
          + "If the content is educational (e.g. tutorial, course, explainer), set isEducational to true and generate 3–5 quiz questions with exactly 4 options each and correctIndex 0–3. "
          + "If not educational, set isEducational to false and set quizQuestions to null.\n\n"
          + "Respond with a single JSON object only, no markdown or extra text. Use this exact structure:\n"
          + "{\"summary\": \"...\", \"isEducational\": true or false, \"quizQuestions\": [{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctIndex\": 0}] or null}\n\n"
          + "Session recap data (JSON):\n";

  /**
   * Builds a GeminiRequest from RecapData. No inline data — a single Content with a single text Part.
   */
  public GeminiRequest buildSummaryRequest(RecapData recapData) throws JsonProcessingException {
    String recapJson = new ObjectMapper().writeValueAsString(recapData);
    String promptText = SUMMARY_INSTRUCTIONS + recapJson;
    Part textPart = new Part(promptText);
    Content content = new Content(Collections.singletonList(textPart));
    return new GeminiRequest(Collections.singletonList(content));
  }

  /**
   * Calls Gemini with the recap data, parses the JSON response into SummaryGenerationResult.
   */
  public SummaryGenerationResult generateSummaryFromRecap(RecapData recapData)
      throws JsonProcessingException {
    GeminiRequest request = buildSummaryRequest(recapData);
    String requestJson = new ObjectMapper().writeValueAsString(request);
    HttpHeaders headers = new HttpHeaders();
    headers.set("x-goog-api-key", apiKey);
    headers.set("Content-Type", "application/json");
    HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);
    ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
    String body = response.getBody();
    if (body == null || body.isBlank()) {
      throw new IllegalStateException("Gemini API returned empty response (status: " + response.getStatusCode() + ")");
    }
    if (!response.getStatusCode().is2xxSuccessful()) {
      throw new IllegalStateException("Gemini API error: " + response.getStatusCode() + " - " + body);
    }
    JSONObject responseJson = new JSONObject(body);
    JSONArray candidatesArray = responseJson.getJSONArray("candidates");
    if (candidatesArray == null || candidatesArray.length() == 0) {
      throw new IllegalStateException("Gemini returned no candidates");
    }
    JSONObject firstCandidate = candidatesArray.getJSONObject(0);
    JSONObject contentObj = firstCandidate.getJSONObject("content");
    JSONArray partsArray = contentObj.getJSONArray("parts");
    if (partsArray == null || partsArray.length() == 0) {
      throw new IllegalStateException("Gemini returned no parts");
    }
    String responseText = partsArray.getJSONObject(0).optString("text", "").trim();
    if (responseText.isEmpty()) {
      throw new IllegalStateException("Gemini returned empty text");
    }
    // Strip optional markdown code fence if present
    if (responseText.startsWith("```json")) {
      responseText = responseText.replaceFirst("^```json\\s*", "").replaceFirst("\\s*```\\s*$", "").trim();
    } else if (responseText.startsWith("```")) {
      responseText = responseText.replaceFirst("^```\\s*", "").replaceFirst("\\s*```\\s*$", "").trim();
    }
    return new ObjectMapper().readValue(responseText, SummaryGenerationResult.class);
  }
}