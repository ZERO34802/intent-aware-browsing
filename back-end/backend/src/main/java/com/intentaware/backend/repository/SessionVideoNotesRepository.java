package com.intentaware.backend.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.intentaware.backend.entity.SessionVideoNotes;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionVideoNotesRepository extends JpaRepository<SessionVideoNotes, Long> {
  Optional<SessionVideoNotes> findBySessionIdAndVideoId(String sessionId, String videoId);

  List<SessionVideoNotes> findAllBySessionIdOrderByCreatedAtAsc(String sessionId);
}