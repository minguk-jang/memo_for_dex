import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuizSet, QuizResult, StorageData, OverallStats, QuestionStats } from '../types';

const STORAGE_KEY = '@memo_for_dex_data';

// 모든 데이터 가져오기
export const getAllData = async (): Promise<StorageData> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue) {
      return JSON.parse(jsonValue);
    }
    return { quizSets: [], results: [] };
  } catch (e) {
    console.error('Error reading data:', e);
    return { quizSets: [], results: [] };
  }
};

// 모든 데이터 저장
const saveAllData = async (data: StorageData): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
    throw e;
  }
};

// 퀴즈 세트 저장
export const saveQuizSet = async (quizSet: QuizSet): Promise<void> => {
  const data = await getAllData();
  data.quizSets.push(quizSet);
  await saveAllData(data);
};

// 퀴즈 세트 업데이트
export const updateQuizSet = async (quizSet: QuizSet): Promise<void> => {
  const data = await getAllData();
  const index = data.quizSets.findIndex(qs => qs.id === quizSet.id);
  if (index !== -1) {
    data.quizSets[index] = quizSet;
    await saveAllData(data);
  }
};

// 퀴즈 세트 삭제
export const deleteQuizSet = async (quizSetId: string): Promise<void> => {
  const data = await getAllData();
  data.quizSets = data.quizSets.filter(qs => qs.id !== quizSetId);
  data.results = data.results.filter(r => r.quizSetId !== quizSetId);
  await saveAllData(data);
};

// 개별 문제 삭제
export const deleteQuestion = async (quizSetId: string, questionId: string): Promise<void> => {
  const data = await getAllData();
  const quizSet = data.quizSets.find(qs => qs.id === quizSetId);
  if (quizSet) {
    quizSet.questions = quizSet.questions.filter(q => q.id !== questionId);
    // 문제가 0개가 되면 퀴즈 세트도 삭제
    if (quizSet.questions.length === 0) {
      data.quizSets = data.quizSets.filter(qs => qs.id !== quizSetId);
    }
    data.results = data.results.filter(r => r.questionId !== questionId);
    await saveAllData(data);
  }
};

// 개별 문제 수정
export const updateQuestion = async (
  quizSetId: string,
  questionId: string,
  updates: { question?: string; answer?: boolean; explanation?: string }
): Promise<void> => {
  const data = await getAllData();
  const quizSet = data.quizSets.find(qs => qs.id === quizSetId);
  if (quizSet) {
    const question = quizSet.questions.find(q => q.id === questionId);
    if (question) {
      if (updates.question !== undefined) question.question = updates.question;
      if (updates.answer !== undefined) question.answer = updates.answer;
      if (updates.explanation !== undefined) question.explanation = updates.explanation;
      await saveAllData(data);
    }
  }
};

// 개별 문제 추가
export const addQuestion = async (
  quizSetId: string,
  question: { question: string; answer: boolean; explanation?: string }
): Promise<void> => {
  const data = await getAllData();
  const quizSet = data.quizSets.find(qs => qs.id === quizSetId);
  if (quizSet) {
    quizSet.questions.push({
      id: generateId(),
      question: question.question,
      answer: question.answer,
      explanation: question.explanation,
      createdAt: Date.now(),
    });
    await saveAllData(data);
  }
};

// 모든 퀴즈 세트 가져오기
export const getAllQuizSets = async (): Promise<QuizSet[]> => {
  const data = await getAllData();
  return data.quizSets;
};

// 퀴즈 결과 저장
export const saveQuizResult = async (result: QuizResult): Promise<void> => {
  const data = await getAllData();
  data.results.push(result);
  await saveAllData(data);
};

// 모든 결과 가져오기
export const getAllResults = async (): Promise<QuizResult[]> => {
  const data = await getAllData();
  return data.results;
};

// 통계 계산
export const calculateStats = async (): Promise<OverallStats> => {
  const data = await getAllData();
  const { quizSets, results } = data;

  // 모든 문제 수집
  const allQuestions = quizSets.flatMap(qs =>
    qs.questions.map(q => ({ ...q, quizSetId: qs.id }))
  );

  // 문제별 통계 계산
  const questionStats: QuestionStats[] = allQuestions.map(question => {
    const questionResults = results.filter(r => r.questionId === question.id);
    const correctCount = questionResults.filter(r => r.isCorrect).length;
    const incorrectCount = questionResults.length - correctCount;

    return {
      questionId: question.id,
      question: question.question,
      totalAttempts: questionResults.length,
      correctCount,
      incorrectCount,
      accuracy: questionResults.length > 0
        ? (correctCount / questionResults.length) * 100
        : 0,
    };
  });

  // 전체 통계 계산
  const totalAttempts = results.length;
  const totalCorrect = results.filter(r => r.isCorrect).length;
  const totalIncorrect = totalAttempts - totalCorrect;

  return {
    totalQuestions: allQuestions.length,
    totalAttempts,
    totalCorrect,
    totalIncorrect,
    overallAccuracy: totalAttempts > 0
      ? (totalCorrect / totalAttempts) * 100
      : 0,
    questionStats: questionStats.sort((a, b) => a.accuracy - b.accuracy), // 정확도 낮은 순
  };
};

// 랜덤 퀴즈 문제 가져오기
export const getRandomQuizQuestions = async (count?: number): Promise<{ question: QuizSet['questions'][0]; quizSetId: string }[]> => {
  const quizSets = await getAllQuizSets();

  // 모든 문제를 평탄화
  const allQuestions = quizSets.flatMap(qs =>
    qs.questions.map(q => ({ question: q, quizSetId: qs.id }))
  );

  if (allQuestions.length === 0) {
    return [];
  }

  // 셔플
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

  // count가 지정되면 해당 개수만큼, 아니면 전체 반환
  return count ? shuffled.slice(0, count) : shuffled;
};

// 데이터 초기화
export const clearAllData = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

// ID 생성 유틸리티
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
