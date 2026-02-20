package com.intentaware.backend.service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.intentaware.backend.repository.AlignmentCacheRepository;
import com.intentaware.backend.entity.AlignmentCache;
import com.intentaware.backend.dto.AlignmentCheckRequest;
import com.intentaware.backend.dto.AlignmentCheckResponse;
import java.time.ZoneId;
import java.util.Optional;


@Service
public class AlignmentService {
  private static final Logger log = LoggerFactory.getLogger(AlignmentService.class);

  @Autowired
  AlignmentCacheRepository alignmentCacheRepository;

  public AlignmentCheckResponse checkIfCached(AlignmentCheckRequest request) {
    Optional<AlignmentCache> alignmentCache = alignmentCacheRepository.findBySessionIdAndVideoId(request.getSessionId(), request.getVideoId());
    if (alignmentCache.isPresent()) {
      AlignmentCache cached = alignmentCache.get();
      log.info("Alignment cache HIT for sessionId={}, videoId={} (skipping Gemini request)", request.getSessionId(), request.getVideoId());
      long timestamp = cached.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
      return new AlignmentCheckResponse(cached.getAligned(), cached.getConfidence(), timestamp, cached.getReason());
    }
    log.debug("Alignment cache MISS for sessionId={}, videoId={} (Gemini request will be made)", request.getSessionId(), request.getVideoId());
    return null;
  }

  public void createAlignmentCache(String sessionId, String videoId, Boolean aligned, Double confidence, String reason) {
    AlignmentCache alignmentCache = new AlignmentCache(sessionId, videoId, aligned, confidence, reason);
    alignmentCacheRepository.save(alignmentCache);
  }
}