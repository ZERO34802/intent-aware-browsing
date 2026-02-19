package com.intentaware.backend.dto.gemini;

import java.util.List;
import com.intentaware.backend.dto.gemini.Content;

public class GeminiRequest {
  private List<Content> contents;

  public GeminiRequest(List<Content> contents) {
    this.contents = contents;
  }

  public List<Content> getContents() {
    return contents;
  }

  public void setContents(List<Content> contents) {
    this.contents = contents;
  }
}