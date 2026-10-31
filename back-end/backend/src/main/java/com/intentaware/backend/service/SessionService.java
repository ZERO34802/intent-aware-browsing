package com.intentaware.backend.service;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.intentaware.backend.repository.SessionRepository;
import com.intentaware.backend.entity.Session;
import com.intentaware.backend.dto.CreateSessionRequest;
import com.intentaware.backend.dto.AlignmentCheckRequest;
import com.intentaware.backend.dto.AlignmentCheckResponse;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneId;


@Service
public class SessionService {
  @Autowired
  private SessionRepository sessionRepository;

  public Session createSession(CreateSessionRequest request) {
    Session session = new Session();
    session.setIntent(request.getIntent());
    session.setPlatform(request.getPlatform());
    session.setStatus("active");
    LocalDateTime startTime = LocalDateTime.ofInstant(
        Instant.ofEpochMilli(request.getTimestamp()),
        ZoneId.systemDefault()
    );
    session.setStartTime(startTime);
    return sessionRepository.save(session);
  }
}