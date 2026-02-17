package com.intentaware.backend.controller;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.beans.factory.annotation.Autowired;
import com.intentaware.backend.service.SessionService;
import org.springframework.http.ResponseEntity;
import com.intentaware.backend.entity.Session;
import org.springframework.http.HttpStatus;
import com.intentaware.backend.dto.SessionResponse;
import com.intentaware.backend.dto.CreateSessionRequest;
import org.springframework.web.bind.annotation.CrossOrigin;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.Instant;


@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
public class SessionController {
  @Autowired
  private SessionService sessionService;

  @PostMapping("/start")
  public ResponseEntity<SessionResponse> createSession(@RequestBody CreateSessionRequest request) {
    Session session = sessionService.createSession(request);
    SessionResponse response = new SessionResponse(session.getSessionId(), session.getStatus(), session.getCreatedAt().atZone(ZoneId.systemDefault())
    .toInstant()
    .toEpochMilli());
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

}