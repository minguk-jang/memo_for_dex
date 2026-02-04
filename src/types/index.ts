// OX 퀴즈 문제 타입
export interface QuizQuestion {
  id: string;
  question: string;
  answer: boolean; // true = O, false = X
  explanation?: string;
  createdAt: number;
  category?: string;
}

// 퀴즈 세트 (한 번의 카메라 촬영으로 생성된 문제들)
export interface QuizSet {
  id: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: number;
  sourceImageUri?: string;
}

// 퀴즈 결과 기록
export interface QuizResult {
  id: string;
  questionId: string;
  quizSetId: string;
  isCorrect: boolean;
  answeredAt: number;
  userAnswer: boolean;
}

// 문제별 통계
export interface QuestionStats {
  questionId: string;
  question: string;
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
}

// 전체 통계
export interface OverallStats {
  totalQuestions: number;
  totalAttempts: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  questionStats: QuestionStats[];
}

// LLM 응답 타입
export interface LLMQuizResponse {
  questions: {
    question: string;
    answer: boolean;
    explanation?: string;
  }[];
}

// 저장소 데이터 구조
export interface StorageData {
  quizSets: QuizSet[];
  results: QuizResult[];
}
