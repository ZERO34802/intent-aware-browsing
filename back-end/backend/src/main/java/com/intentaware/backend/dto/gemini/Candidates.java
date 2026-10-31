package com.intentaware.backend.dto.gemini;

public class Candidates {
  private Content content;

  public Candidates(Content content) {
    this.content = content;
  }

  public Content getContent() {
    return content;
  }

  public void setContent(Content content) {
    this.content = content;
  }
}