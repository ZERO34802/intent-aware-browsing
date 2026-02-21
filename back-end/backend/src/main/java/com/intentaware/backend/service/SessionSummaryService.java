package com.intentaware.backend.service;

import com.intentaware.backend.dto.SessionSummaryResponse;
import com.intentaware.backend.dto.recap.SummaryGenerationResult;
import com.intentaware.backend.entity.QuizQuestion;
import com.intentaware.backend.entity.SessionSummary;
import com.intentaware.backend.repository.SessionSummaryRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionSummaryService {

  @Autowired
  private SessionSummaryRepository sessionSummaryRepository;

  @Autowired
  private RecapService recapService;

  @Autowired
  private GeminiService geminiService;

  /**
   * Returns the session summary for the given session. If one already exists, returns it;
   * otherwise generates recap, calls Gemini, saves summary + quiz questions, and returns the result.
   */
  @Transactional
  public SessionSummaryResponse getOrCreateSummary(String sessionId) {
    Optional<SessionSummary> existing = sessionSummaryRepository.findBySessionId(sessionId);
    if (existing.isPresent()) {
      return toResponse(existing.get());
    }

    var recapData = recapService.generateRecap(sessionId);
    SummaryGenerationResult result;
    try {
      result = geminiService.generateSummaryFromRecap(recapData);
    } catch (Exception e) {
      throw new IllegalStateException("Failed to generate summary from Gemini: " + e.getMessage(), e);
    }

    List<QuizQuestion> questions = new ArrayList<>();
    if (result.getQuizQuestions() != null) {
      for (SummaryGenerationResult.QuizItemDto dto : result.getQuizQuestions()) {
        QuizQuestion q = new QuizQuestion();
        q.setQuestion(dto.getQuestion());
        q.setOptions(dto.getOptions() != null ? dto.getOptions() : List.of());
        q.setCorrectIndex(dto.getCorrectIndex() != null ? dto.getCorrectIndex() : 0);
        questions.add(q);
      }
    }

    SessionSummary summary = new SessionSummary(
        sessionId,
        result.getSummary() != null ? result.getSummary() : "",
        result.getIsEducational() != null ? result.getIsEducational() : false,
        questions
    );
    sessionSummaryRepository.save(summary);

    return toResponse(summary);
  }

  private static SessionSummaryResponse toResponse(SessionSummary summary) {
    List<SessionSummaryResponse.QuizQuestionItem> quizItems =
        summary.getQuizQuestions() == null
            ? Collections.emptyList()
            : summary.getQuizQuestions().stream()
                .map(q -> new SessionSummaryResponse.QuizQuestionItem(
                    q.getQuestion(),
                    q.getOptions(),
                    q.getCorrectIndex()))
                .collect(Collectors.toList());

    return new SessionSummaryResponse(
        summary.getSummary(),
        summary.getIsEducational(),
        quizItems
    );
  }
}
