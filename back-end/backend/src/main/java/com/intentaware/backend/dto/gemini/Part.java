package com.intentaware.backend.dto.gemini;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.intentaware.backend.dto.gemini.InlineData;
import java.util.List;

public class Part {
  @JsonProperty("text")
  private String text;

  @JsonProperty("inline_data")
  private InlineData inlineData;


  public Part(String text) {
    this.text = text;
    this.inlineData = null;
  }

  public Part(InlineData inlineData) {
    this.text = null;
    this.inlineData = inlineData;
  }

  public Part(String text,InlineData inlineData) {
    this.text = text;
    this.inlineData = inlineData;
  }

  public String getText() {
    return text;
  }

  public void setText(String text) {
    this.text = text;
  }
  
  public InlineData getInlineData() {
    return inlineData;
  }

  public void setInlineData(InlineData inlineData) {
    this.inlineData = inlineData;
  }
}