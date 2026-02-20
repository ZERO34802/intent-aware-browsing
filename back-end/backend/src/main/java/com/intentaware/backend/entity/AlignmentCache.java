package com.intentaware.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
  name = "alignment_cache",
  uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "video_id"})
)
public class AlignmentCache {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private String sessionId;
  private String videoId;
  private Boolean aligned;
  private String reason;
  private Double confidence;
  private LocalDateTime createdAt;

  public AlignmentCache() {
  }

  public AlignmentCache(String sessionId, String videoId, Boolean aligned, Double confidence, String reason) {
    this.createdAt = LocalDateTime.now();
    this.sessionId = sessionId;
    this.videoId = videoId;
    this.aligned = aligned;
    this.reason = reason;
    this.confidence = confidence;
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

  public String getVideoId() {
    return videoId;
  }

  public void setVideoId(String videoId) {
    this.videoId = videoId;
  }

  public Boolean getAligned() {
    return aligned;
  }

  public void setAligned(Boolean aligned) {
    this.aligned = aligned;
  }

  public String getReason() {
    return reason;
  }

  public void setReason(String reason) {
    this.reason = reason;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public Double getConfidence() {
    return confidence;
  }

  public void setConfidence(Double confidence) {
    this.confidence = confidence;
  }
}