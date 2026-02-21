package com.intentaware.backend.dto.recap;

public class VideoRecapData {
  private String videoId;
  private String videoUrl;
  private Boolean aligned;
  private String reason;
  private String notes;
  private String transcript;

  public VideoRecapData(String videoId, String videoUrl, Boolean aligned, String reason, String notes, String transcript) {
    this.videoId = videoId;
    this.videoUrl = videoUrl;
    this.aligned = aligned;
    this.reason = reason;
    this.notes = notes;
    this.transcript = transcript;
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

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getTranscript() {
    return transcript;
  }

  public void setTranscript(String transcript) {
    this.transcript = transcript;
  }
}
