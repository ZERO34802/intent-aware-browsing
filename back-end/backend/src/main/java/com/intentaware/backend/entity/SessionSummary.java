package com.intentaware.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
  name = "session_summary",
  uniqueConstraints = @UniqueConstraint(columnNames = "session_id")
)
public class SessionSummary {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private String sessionId;

  @Lob
  @Column(columnDefinition = "TEXT")
  private String summary;

  private Boolean isEducational;
  private LocalDateTime createdAt;

  @OneToMany(mappedBy = "sessionSummary", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  private List<QuizQuestion> quizQuestions = new ArrayList<>();

  public SessionSummary() {
  }

  public SessionSummary(String sessionId, String summary, Boolean isEducational, List<QuizQuestion> quizQuestions) {
    this.sessionId = sessionId;
    this.summary = summary;
    this.isEducational = isEducational != null ? isEducational : false;
    this.createdAt = LocalDateTime.now();
    if (quizQuestions != null) {
      this.quizQuestions = quizQuestions;
      this.quizQuestions.forEach(q -> q.setSessionSummary(this));
    }
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }
  
  public String getSessionId() {
    return sessionId;
  }

  public void setSessionId(String sessionId) {
    this.sessionId = sessionId;
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String summary) {
    this.summary = summary;
  }

  public Boolean getIsEducational() {
    return isEducational;
  }

  public void setIsEducational(Boolean isEducational) {
    this.isEducational = isEducational;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public List<QuizQuestion> getQuizQuestions() {
    return quizQuestions;
  }

  public void setQuizQuestions(List<QuizQuestion> quizQuestions) {
    this.quizQuestions = quizQuestions;
  }
}