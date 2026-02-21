package com.intentaware.backend.service;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.intentaware.backend.repository.SessionVideoNotesRepository;
import com.intentaware.backend.entity.SessionVideoNotes;
import java.util.Optional;
import com.intentaware.backend.dto.SessionVideoNotesRequest;
import com.intentaware.backend.dto.SessionVideoNotesResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class SessionVideoNotesService {

  private static final Logger log = LoggerFactory.getLogger(SessionVideoNotesService.class);
  @Autowired
  private SessionVideoNotesRepository sessionVideoNotesRepository;

  public SessionVideoNotesResponse createSessionVideoNotes(SessionVideoNotesRequest request) {
    Optional<SessionVideoNotes> existing = sessionVideoNotesRepository.findBySessionIdAndVideoId(request.getSessionId(), request.getVideoId());
    SessionVideoNotes sessionVideoNotes;
    if (existing.isPresent()) {
      sessionVideoNotes = existing.get();
      sessionVideoNotes.setNotes(request.getNotes());
      sessionVideoNotes.setTranscript(request.getTranscript());
    } else {
      sessionVideoNotes = new SessionVideoNotes(request.getSessionId(), request.getVideoId(), request.getNotes(), request.getTranscript());
    }
    try {
      sessionVideoNotesRepository.save(sessionVideoNotes);
      return new SessionVideoNotesResponse("Success");
    } catch (Exception e) {
      log.error("Error creating session video notes: {}", e.getMessage());
      throw new RuntimeException("Error creating session video notes", e);
    }
  }
}