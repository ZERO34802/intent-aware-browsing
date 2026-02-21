package com.intentaware.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.List;

@Entity
@Table(name = "quiz_question")
public class QuizQuestion {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "session_summary_id", nullable = false)
  private SessionSummary sessionSummary;

  @Column(length = 2000)
  private String question;
  @Column(length = 500)
  private String optionA;
  @Column(length = 500)
  private String optionB;
  @Column(length = 500)
  private String optionC;
  @Column(length = 500)
  private String optionD;
  private Integer correctIndex;

  public QuizQuestion() {
  }

  public QuizQuestion(String question, String optionA, String optionB, String optionC, String optionD, Integer correctIndex) {
    this.question = question;
    this.optionA = optionA;
    this.optionB = optionB;
    this.optionC = optionC;
    this.optionD = optionD;
    this.correctIndex = correctIndex;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public SessionSummary getSessionSummary() {
    return sessionSummary;
  }

  public void setSessionSummary(SessionSummary sessionSummary) {
    this.sessionSummary = sessionSummary;
  }

  public String getQuestion() {
    return question;
  }

  public void setQuestion(String question) {
    this.question = question;
  }

  /** Returns options as list [A, B, C, D] for API response. */
  public List<String> getOptions() {
    return List.of(
        optionA != null ? optionA : "",
        optionB != null ? optionB : "",
        optionC != null ? optionC : "",
        optionD != null ? optionD : ""
    );
  }

  /** Set options from list (e.g. from Gemini). Expects 4 elements; pads with empty string if fewer. */
  public void setOptions(List<String> options) {
    if (options == null) options = List.of();
    this.optionA = options.size() > 0 ? options.get(0) : "";
    this.optionB = options.size() > 1 ? options.get(1) : "";
    this.optionC = options.size() > 2 ? options.get(2) : "";
    this.optionD = options.size() > 3 ? options.get(3) : "";
  }

  public void setOptionA(String optionA) { this.optionA = optionA; }
  public void setOptionB(String optionB) { this.optionB = optionB; }
  public void setOptionC(String optionC) { this.optionC = optionC; }
  public void setOptionD(String optionD) { this.optionD = optionD; }

  public String getOptionA() { return optionA; }
  public String getOptionB() { return optionB; }
  public String getOptionC() { return optionC; }
  public String getOptionD() { return optionD; }

  public Integer getCorrectIndex() {
    return correctIndex;
  }

  public void setCorrectIndex(Integer correctIndex) {
    this.correctIndex = correctIndex;
  }
}
