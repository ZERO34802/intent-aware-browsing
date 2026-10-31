package com.intentaware.backend.entity;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import java.time.LocalDateTime;
import java.util.UUID;
import jakarta.persistence.Table;

@Entity
@Table(name = "sessions")
public class Session {


  public Session() {
    this.sessionId = UUID.randomUUID().toString();
    this.createdAt = LocalDateTime.now();
  }
  
  @Id
  private String sessionId;
  private String intent;
  private String platform;
  private LocalDateTime startTime;
  private LocalDateTime endTime;
  private String status;
  private LocalDateTime createdAt;

  public String getSessionId() {
    return sessionId;
  }

  public void setSessionId(String sessionId) {
    this.sessionId = sessionId;
  }

  public String getIntent() {
    return intent;
  }

  public void setIntent(String intent) {
    this.intent = intent;
  }

  public String getPlatform() {
    return platform;
  }

  public void setPlatform(String platform) {
    this.platform = platform;
  }

  public LocalDateTime getStartTime() {
    return startTime;
  }
  
  public void setStartTime(LocalDateTime startTime) {
    this.startTime = startTime;
  }

  public LocalDateTime getEndTime() {
    return endTime;
  }
  
  public void setEndTime(LocalDateTime endTime) {
    this.endTime = endTime;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  } 
}