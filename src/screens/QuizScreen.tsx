import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getRandomQuizQuestions,
  saveQuizResult,
  generateId,
} from '../services/storageService';
import { QuizQuestion, QuizResult } from '../types';

interface QuizItem {
  question: QuizQuestion;
  quizSetId: string;
}

type QuizState = 'idle' | 'playing' | 'answered' | 'finished';

export default function QuizScreen() {
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });

  // 애니메이션 값
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 화면 포커스 시 퀴즈 데이터 로드
  useFocusEffect(
    useCallback(() => {
      if (quizState === 'idle') {
        loadQuizzes();
      }
    }, [quizState])
  );

  const loadQuizzes = async () => {
    const questions = await getRandomQuizQuestions();
    setQuizItems(questions);
  };

  // 퀴즈 시작
  const startQuiz = () => {
    if (quizItems.length === 0) {
      Alert.alert('알림', '저장된 퀴즈가 없습니다.\n카메라 탭에서 퀴즈를 먼저 만들어주세요.');
      return;
    }

    // 셔플
    const shuffled = [...quizItems].sort(() => Math.random() - 0.5);
    setQuizItems(shuffled);
    setCurrentIndex(0);
    setScore({ correct: 0, incorrect: 0 });
    setQuizState('playing');
    animateIn();
  };

  // 애니메이션
  const animateIn = () => {
    slideAnim.setValue(-300);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(callback);
  };

  // 답변 선택
  const selectAnswer = async (answer: boolean) => {
    if (quizState !== 'playing') return;

    setSelectedAnswer(answer);
    setQuizState('answered');

    const currentQuestion = quizItems[currentIndex];
    const isCorrect = answer === currentQuestion.question.answer;

    // 점수 업데이트
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));

    // 결과 저장
    const result: QuizResult = {
      id: generateId(),
      questionId: currentQuestion.question.id,
      quizSetId: currentQuestion.quizSetId,
      isCorrect,
      answeredAt: Date.now(),
      userAnswer: answer,
    };

    try {
      await saveQuizResult(result);
    } catch (error) {
      console.error('Error saving result:', error);
    }
  };

  // 다음 문제
  const nextQuestion = () => {
    if (currentIndex + 1 >= quizItems.length) {
      setQuizState('finished');
      return;
    }

    animateOut(() => {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setQuizState('playing');
      animateIn();
    });
  };

  // 다시 시작
  const restartQuiz = () => {
    setQuizState('idle');
    setSelectedAnswer(null);
    loadQuizzes();
  };

  // 대기 화면
  if (quizState === 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.idleContainer}>
          <Text style={styles.idleEmoji}>📝</Text>
          <Text style={styles.idleTitle}>OX 퀴즈</Text>
          <Text style={styles.idleSubtitle}>
            {quizItems.length > 0
              ? `${quizItems.length}개의 문제가 준비되었습니다`
              : '저장된 퀴즈가 없습니다'}
          </Text>
          <TouchableOpacity
            style={[styles.startButton, quizItems.length === 0 && styles.startButtonDisabled]}
            onPress={startQuiz}
          >
            <Text style={styles.startButtonText}>퀴즈 시작</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 결과 화면
  if (quizState === 'finished') {
    const total = score.correct + score.incorrect;
    const percentage = total > 0 ? Math.round((score.correct / total) * 100) : 0;

    return (
      <View style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>
            {percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '💪'}
          </Text>
          <Text style={styles.resultTitle}>퀴즈 완료!</Text>

          <View style={styles.resultScore}>
            <Text style={styles.resultPercentage}>{percentage}%</Text>
            <Text style={styles.resultDetail}>
              {total}문제 중 {score.correct}문제 정답
            </Text>
          </View>

          <View style={styles.resultStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{score.correct}</Text>
              <Text style={styles.statLabel}>정답</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statValueIncorrect]}>{score.incorrect}</Text>
              <Text style={styles.statLabel}>오답</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.restartButton} onPress={restartQuiz}>
            <Text style={styles.restartButtonText}>다시 풀기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 퀴즈 진행 화면
  const currentQuestion = quizItems[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion.question.answer;

  return (
    <View style={styles.container}>
      {/* 진행 바 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / quizItems.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {quizItems.length}
        </Text>
      </View>

      {/* 점수 */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreCorrect}>O {score.correct}</Text>
        <Text style={styles.scoreIncorrect}>X {score.incorrect}</Text>
      </View>

      {/* 문제 카드 */}
      <Animated.View
        style={[
          styles.questionCard,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <Text style={styles.questionText}>{currentQuestion.question.question}</Text>
      </Animated.View>

      {/* 정답 피드백 */}
      {quizState === 'answered' && (
        <View style={[styles.feedback, isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
          <Text style={styles.feedbackEmoji}>{isCorrect ? '⭕' : '❌'}</Text>
          <Text style={styles.feedbackText}>
            {isCorrect ? '정답입니다!' : '틀렸습니다'}
          </Text>
          <Text style={styles.feedbackAnswer}>
            정답: {currentQuestion.question.answer ? 'O' : 'X'}
          </Text>
          {currentQuestion.question.explanation && (
            <Text style={styles.feedbackExplanation}>
              {currentQuestion.question.explanation}
            </Text>
          )}
        </View>
      )}

      {/* 답변 버튼 */}
      {quizState === 'playing' ? (
        <View style={styles.answerButtons}>
          <TouchableOpacity
            style={[styles.answerButton, styles.answerButtonO]}
            onPress={() => selectAnswer(true)}
          >
            <Text style={styles.answerButtonText}>O</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.answerButton, styles.answerButtonX]}
            onPress={() => selectAnswer(false)}
          >
            <Text style={styles.answerButtonText}>X</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
          <Text style={styles.nextButtonText}>
            {currentIndex + 1 >= quizItems.length ? '결과 보기' : '다음 문제'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // 대기 화면
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  idleEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  idleTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  idleSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // 진행 바
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  // 점수
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    paddingVertical: 10,
  },
  scoreCorrect: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  scoreIncorrect: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  // 문제 카드
  questionCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 30,
    borderRadius: 20,
    minHeight: 200,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  questionText: {
    fontSize: 22,
    lineHeight: 34,
    textAlign: 'center',
    color: '#333',
  },
  // 피드백
  feedback: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  feedbackCorrect: {
    backgroundColor: '#d4edda',
  },
  feedbackIncorrect: {
    backgroundColor: '#f8d7da',
  },
  feedbackEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  feedbackAnswer: {
    fontSize: 16,
    color: '#666',
  },
  feedbackExplanation: {
    fontSize: 14,
    color: '#555',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  // 답변 버튼
  answerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginTop: 'auto',
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  answerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  answerButtonO: {
    backgroundColor: '#34C759',
  },
  answerButtonX: {
    backgroundColor: '#FF3B30',
  },
  answerButtonText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  // 다음 버튼
  nextButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 40,
    marginTop: 'auto',
    marginBottom: 50,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 결과 화면
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  resultScore: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resultPercentage: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  resultDetail: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  resultStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ddd',
  },
  statValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#34C759',
  },
  statValueIncorrect: {
    color: '#FF3B30',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  restartButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
