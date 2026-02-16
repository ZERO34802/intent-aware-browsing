package com.intentaware.backend.dto;

public class SessionResponse {
    private String sessionId;
    private String status;
    private Long createdAt;
    
    // Constructor
    public SessionResponse(String sessionId, String status, Long createdAt) {
        this.sessionId = sessionId;
        this.status = status;
        this.createdAt = createdAt;
    }
    
    // Getters and setters
    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Long createdAt) {
        this.createdAt = createdAt;
    } 
}