package com.intentaware.backend.dto.recap;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Parsed result from Gemini's summary + quiz JSON response.
 */
public class SummaryGenerationResult {
  private String summary;
  private Boolean isEducational;
  private List<QuizItemDto> quizQuestions;

  public SummaryGenerationResult() {
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String summary) {
    this.summary = summary;
  }

  @JsonProperty("isEducational")
  public Boolean getIsEducational() {
    return isEducational;
  }

  @JsonProperty("isEducational")
  public void setIsEducational(Boolean isEducational) {
    this.isEducational = isEducational;
  }

  public List<QuizItemDto> getQuizQuestions() {
    return quizQuestions;
  }

  public void setQuizQuestions(List<QuizItemDto> quizQuestions) {
    this.quizQuestions = quizQuestions;
  }

  /** One quiz question in Gemini's response (question, options[4], correctIndex 0-3). */
  public static class QuizItemDto {
    private String question;
    private List<String> options;
    private Integer correctIndex;

    public QuizItemDto() {
    }

    public String getQuestion() {
      return question;
    }

    public void setQuestion(String question) {
      this.question = question;
    }

    public List<String> getOptions() {
      return options;
    }

    public void setOptions(List<String> options) {
      this.options = options;
    }

    public Integer getCorrectIndex() {
      return correctIndex;
    }

    public void setCorrectIndex(Integer correctIndex) {
      this.correctIndex = correctIndex;
    }
  }
}
