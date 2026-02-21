package com.intentaware.backend.repository;

import com.intentaware.backend.entity.SessionSummary;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SessionSummaryRepository extends JpaRepository<SessionSummary, Long> {

  Optional<SessionSummary> findBySessionId(String sessionId);
}
