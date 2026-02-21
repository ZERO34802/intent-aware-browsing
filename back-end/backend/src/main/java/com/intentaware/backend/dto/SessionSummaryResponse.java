package com.intentaware.backend.dto;

import java.util.List;

/**
 * API response for GET /api/sessions/{sessionId}/summary.
 */
public class SessionSummaryResponse {
  private String summary;
  private Boolean isEducational;
  private List<QuizQuestionItem> quizQuestions;

  public SessionSummaryResponse() {
  }

  public SessionSummaryResponse(String summary, Boolean isEducational, List<QuizQuestionItem> quizQuestions) {
    this.summary = summary;
    this.isEducational = isEducational != null ? isEducational : false;
    this.quizQuestions = quizQuestions;
  }

  public String getSummary() {
    return summary;
  }

  public void setSummary(String summary) {
    this.summary = summary;
  }

  public Boolean getIsEducational() {
    return isEducational;
  }

  public void setIsEducational(Boolean isEducational) {
    this.isEducational = isEducational;
  }

  public List<QuizQuestionItem> getQuizQuestions() {
    return quizQuestions;
  }

  public void setQuizQuestions(List<QuizQuestionItem> quizQuestions) {
    this.quizQuestions = quizQuestions;
  }

  public static class QuizQuestionItem {
    private String question;
    private List<String> options;
    private Integer correctIndex;

    public QuizQuestionItem() {
    }

    public QuizQuestionItem(String question, List<String> options, Integer correctIndex) {
      this.question = question;
      this.options = options;
      this.correctIndex = correctIndex;
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
