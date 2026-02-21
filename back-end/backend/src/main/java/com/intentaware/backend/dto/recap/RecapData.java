// This is the recap data that will be given to Gemini to generate the recap as well as quiz.
package com.intentaware.backend.dto.recap;

import java.util.List;

public class RecapData {
  private String sessionId;
  private String intent;
  private String platform;
  private List<VideoRecapData> videoRecapData;

  public RecapData(String sessionId, String intent, String platform, List<VideoRecapData> videoRecapData) { 
    this.sessionId = sessionId;
    this.intent = intent;
    this.platform = platform;
    this.videoRecapData = videoRecapData;
  }

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

  public List<VideoRecapData> getVideoRecapData() {
    return videoRecapData;
  }

  public void setVideoRecapData(List<VideoRecapData> videoRecapData) {
    this.videoRecapData = videoRecapData;
  }
}