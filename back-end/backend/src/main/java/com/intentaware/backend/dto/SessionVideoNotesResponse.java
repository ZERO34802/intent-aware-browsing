package com.intentaware.backend.dto;

public class SessionVideoNotesResponse {
  String status;
  public SessionVideoNotesResponse(String status) {
    this.status = status;
  }
  public String getStatus() {
    return status;
  }
  public void setStatus(String status) {
    this.status = status;
  }
}