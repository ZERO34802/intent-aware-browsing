package com.intentaware.backend.dto;


public class AlignmentCheckRequest {
  private String sessionId;
  private String videoId;
  private String videoUrl;
  private String screenshot;
  private Long timestamp;

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

  public String getVideoUrl() {
    return videoUrl;
  }
  
  public void setVideoUrl(String videoUrl) {
    this.videoUrl = videoUrl;
  }

  public String getScreenshot() {
    return screenshot;
  }

  public void setScreenshot(String screenshot) {
    this.screenshot = screenshot;
  }
  
  public Long getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(Long timestamp) {
    this.timestamp = timestamp;
  } 
}