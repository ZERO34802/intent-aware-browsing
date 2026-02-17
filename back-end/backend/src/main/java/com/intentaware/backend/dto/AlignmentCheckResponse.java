package com.intentaware.backend.dto;

public class AlignmentCheckResponse {
  private Boolean aligned;
  private Double confidence;
  private Long timestamp;
  private String reason;

  public AlignmentCheckResponse(Boolean aligned, Double confidence, Long timestamp, String reason) {
    this.aligned = aligned;
    this.confidence = confidence;
    this.timestamp = timestamp;
    this.reason = reason;
  }

  public Boolean getAligned() {
    return aligned;
  }

  public void setAligned(Boolean aligned) {
    this.aligned = aligned;
  }

  public Double getConfidence() {
    return confidence;
  }
  
  public void setConfidence(Double confidence) {
    this.confidence = confidence;
  }

  public Long getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(Long timestamp) {
    this.timestamp = timestamp;
  }

  public String getReason() {
    return reason;
  }

  public void setReason(String reason) {
    this.reason = reason;
  }
}