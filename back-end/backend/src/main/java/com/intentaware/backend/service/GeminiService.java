package com.intentaware.backend.service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.json.JSONObject;
import org.json.JSONArray;
import java.util.Arrays;
import java.util.List;
import com.intentaware.backend.dto.gemini.Part;
import com.intentaware.backend.dto.gemini.InlineData;
import com.intentaware.backend.dto.gemini.Content;
import com.intentaware.backend.dto.gemini.GeminiRequest;
import com.intentaware.backend.dto.gemini.GeminiResponse;
import com.intentaware.backend.dto.gemini.Candidates;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

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
}