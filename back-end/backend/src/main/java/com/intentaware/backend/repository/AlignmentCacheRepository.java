package com.intentaware.backend.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.intentaware.backend.entity.AlignmentCache;

@Repository
public interface AlignmentCacheRepository extends JpaRepository<AlignmentCache, Long> {

  /**
   * Find a cached alignment result for the given session and video.
   * Returns empty if no cache entry exists (cache miss).
   */
  Optional<AlignmentCache> findBySessionIdAndVideoId(String sessionId, String videoId);

  Optional<AlignmentCache> findFirstBySessionIdAndAlignedTrueOrderByCreatedAtDesc(String sessionId);

  List<AlignmentCache> findAllBySessionIdOrderByCreatedAtAsc(String sessionId);
}
