package com.intentaware.backend.service;

import com.intentaware.backend.dto.recap.RecapData;
import com.intentaware.backend.dto.recap.VideoRecapData;
import com.intentaware.backend.entity.AlignmentCache;
import com.intentaware.backend.entity.Session;
import com.intentaware.backend.entity.SessionVideoNotes;
import com.intentaware.backend.repository.AlignmentCacheRepository;
import com.intentaware.backend.repository.SessionRepository;
import com.intentaware.backend.repository.SessionVideoNotesRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RecapService {
  @Autowired
  private AlignmentCacheRepository alignmentCacheRepository;

  @Autowired
  private SessionVideoNotesRepository sessionVideoNotesRepository;

  @Autowired
  private SessionRepository sessionRepository;

  public RecapData generateRecap(String sessionId) {
    List<AlignmentCache> alignmentCaches = alignmentCacheRepository.findAllBySessionIdOrderByCreatedAtAsc(sessionId);
    List<SessionVideoNotes> sessionVideoNotesList = sessionVideoNotesRepository.findAllBySessionIdOrderByCreatedAtAsc(sessionId);

    Set<String> uniqueVideoIds = new HashSet<>();
    for (AlignmentCache ac : alignmentCaches) {
      uniqueVideoIds.add(ac.getVideoId());
    }
    for (SessionVideoNotes svn : sessionVideoNotesList) {
      uniqueVideoIds.add(svn.getVideoId());
    }

    String intent = "";
    String platform = "";
    Optional<Session> sessionOpt = sessionRepository.findById(sessionId);
    if (sessionOpt.isPresent()) {
      Session s = sessionOpt.get();
      intent = s.getIntent() != null ? s.getIntent() : "";
      platform = s.getPlatform() != null ? s.getPlatform() : "";
    }

    List<VideoRecapData> videoRecapDataList = new ArrayList<>();
    for (String videoId : uniqueVideoIds) {
      String videoUrl = "https://www.youtube.com/watch?v=" + videoId;

      Optional<AlignmentCache> alignmentOpt = alignmentCacheRepository.findBySessionIdAndVideoId(sessionId, videoId);
      Optional<SessionVideoNotes> notesOpt = sessionVideoNotesRepository.findBySessionIdAndVideoId(sessionId, videoId);

      Boolean aligned = alignmentOpt.map(AlignmentCache::getAligned).orElse(null);
      String reason = alignmentOpt.map(AlignmentCache::getReason).orElse(null);
      String notes = notesOpt.map(SessionVideoNotes::getNotes).orElse(null);
      String transcript = notesOpt.map(SessionVideoNotes::getTranscript).orElse(null);

      VideoRecapData videoRecapData = new VideoRecapData(videoId, videoUrl, aligned, reason, notes, transcript);
      videoRecapDataList.add(videoRecapData);
    }

    return new RecapData(sessionId, intent, platform, videoRecapDataList);
  }
}