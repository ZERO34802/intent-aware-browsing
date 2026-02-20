package com.intentaware.backend.dto;

public class LastAlignedVideoResponse {

  private String videoId;
  private String videoUrl;

  public LastAlignedVideoResponse(String videoId, String videoUrl) {
    this.videoId = videoId;
    this.videoUrl = videoUrl;
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
}