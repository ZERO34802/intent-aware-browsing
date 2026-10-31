package com.intentaware.backend.dto.gemini;

import java.util.List;
import com.intentaware.backend.dto.gemini.Candidates;
import com.fasterxml.jackson.annotation.JsonProperty;

public class GeminiResponse {
  @JsonProperty("candidates")
  private List<Candidates> candidates;

  public GeminiResponse(List<Candidates> candidates) {
    this.candidates = candidates;
  }

  public List<Candidates> getCandidates() {
    return candidates;
  }

  public void setCandidates(List<Candidates> candidates) {
    this.candidates = candidates;
  }
}