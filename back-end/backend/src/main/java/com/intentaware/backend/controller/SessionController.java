package com.intentaware.backend.controller;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.beans.factory.annotation.Autowired;
import com.intentaware.backend.service.SessionService;
import com.intentaware.backend.service.GeminiService;
import com.intentaware.backend.repository.SessionRepository;
import org.springframework.http.ResponseEntity;
import com.intentaware.backend.entity.Session;
import org.springframework.http.HttpStatus;
import com.intentaware.backend.dto.SessionResponse;
import com.intentaware.backend.dto.CreateSessionRequest;
import com.intentaware.backend.dto.AlignmentCheckRequest;
import com.intentaware.backend.dto.AlignmentCheckResponse;
import com.intentaware.backend.dto.gemini.GeminiResponse;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.ZoneId;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SessionController {
  private static final Logger log = LoggerFactory.getLogger(SessionController.class);

  @Autowired
  private SessionService sessionService;

  @Autowired
  private GeminiService geminiService;

  @Autowired
  private SessionRepository sessionRepository;

  @PostMapping("/sessions/start")
  public ResponseEntity<SessionResponse> createSession(@RequestBody CreateSessionRequest request) {
    Session session = sessionService.createSession(request);
    SessionResponse response = new SessionResponse(session.getSessionId(), session.getStatus(), session.getCreatedAt().atZone(ZoneId.systemDefault())
        .toInstant()
        .toEpochMilli());
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/alignment/check")
  public ResponseEntity<?> checkAlignment(@RequestBody AlignmentCheckRequest request) {
    // 1. Get session from database to retrieve intent
    Optional<Session> sessionOpt = sessionRepository.findById(request.getSessionId());
    if (sessionOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    String intent = sessionOpt.get().getIntent();

    // 2. Call Gemini to analyze screenshot
    GeminiResponse geminiResponse;
    try {
      geminiResponse = geminiService.checkAlignment(intent, request.getScreenshot());
    } catch (Exception e) {
      log.error("Alignment check failed for session {}: {}", request.getSessionId(), e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Alignment check failed: " + e.getMessage());
    }

    // 3. Extract text from Gemini response (candidates[0].content.parts[0].text)
    var candidates = geminiResponse.getCandidates();
    if (candidates == null || candidates.isEmpty()) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Gemini returned no candidates");
    }
    var content = candidates.get(0).getContent();
    if (content == null || content.getParts() == null || content.getParts().isEmpty()) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Gemini returned no content/parts");
    }
    String responseText = content.getParts().get(0).getText();
    if (responseText == null || responseText.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Gemini returned empty text");
    }

    // 4. Parse ALIGNED / MISALIGNED from response text
    boolean aligned = responseText.toUpperCase().trim().startsWith("ALIGNED");
    double confidence = aligned ? 0.9 : 0.2;
    long timestamp = System.currentTimeMillis();

    // 5. Build and return AlignmentCheckResponse
    AlignmentCheckResponse response = new AlignmentCheckResponse(aligned, confidence, timestamp, responseText);
    return ResponseEntity.ok(response);
  }
}