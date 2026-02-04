import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  calculateStats,
  getAllQuizSets,
  deleteQuizSet,
  deleteQuestion,
  updateQuestion,
  addQuestion,
  clearAllData,
  generateId,
} from '../services/storageService';
import { OverallStats, QuizSet, QuizQuestion } from '../types';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'manage'>('stats');
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);

  // 문제 편집 모달 상태
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{
    quizSetId: string;
    question: QuizQuestion | null;
    isNew: boolean;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    question: '',
    answer: true,
    explanation: '',
  });

  // 데이터 로드
  const loadData = async () => {
    const [statsData, setsData] = await Promise.all([
      calculateStats(),
      getAllQuizSets(),
    ]);
    setStats(statsData);
    setQuizSets(setsData);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 퀴즈 세트 펼치기/접기
  const toggleExpand = (quizSetId: string) => {
    setExpandedSetId(expandedSetId === quizSetId ? null : quizSetId);
  };

  // 퀴즈 세트 삭제
  const handleDeleteQuizSet = (quizSet: QuizSet) => {
    Alert.alert(
      '삭제 확인',
      `"${quizSet.title}" 퀴즈를 삭제하시겠습니까?\n관련된 모든 결과도 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deleteQuizSet(quizSet.id);
            setExpandedSetId(null);
            await loadData();
          },
        },
      ]
    );
  };

  // 개별 문제 삭제
  const handleDeleteQuestion = (quizSetId: string, question: QuizQuestion) => {
    Alert.alert(
      '문제 삭제',
      '이 문제를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deleteQuestion(quizSetId, question.id);
            await loadData();
          },
        },
      ]
    );
  };

  // 문제 편집 모달 열기
  const openEditModal = (quizSetId: string, question: QuizQuestion | null = null) => {
    setEditingQuestion({
      quizSetId,
      question,
      isNew: question === null,
    });
    setEditForm({
      question: question?.question || '',
      answer: question?.answer ?? true,
      explanation: question?.explanation || '',
    });
    setEditModalVisible(true);
  };

  // 문제 저장
  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;

    if (!editForm.question.trim()) {
      Alert.alert('오류', '문제 내용을 입력해주세요.');
      return;
    }

    if (editingQuestion.isNew) {
      await addQuestion(editingQuestion.quizSetId, {
        question: editForm.question,
        answer: editForm.answer,
        explanation: editForm.explanation || undefined,
      });
    } else if (editingQuestion.question) {
      await updateQuestion(
        editingQuestion.quizSetId,
        editingQuestion.question.id,
        {
          question: editForm.question,
          answer: editForm.answer,
          explanation: editForm.explanation || undefined,
        }
      );
    }

    setEditModalVisible(false);
    setEditingQuestion(null);
    await loadData();
  };

  // 전체 데이터 초기화
  const handleClearAll = () => {
    Alert.alert(
      '전체 삭제',
      '모든 퀴즈와 결과를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            setExpandedSetId(null);
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>대시보드</Text>

      {/* 탭 선택 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            통계
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
          onPress={() => setActiveTab('manage')}
        >
          <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>
            관리
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'stats' ? (
        <View>
          {/* 전체 통계 카드 */}
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>전체 현황</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats?.totalQuestions || 0}</Text>
                <Text style={styles.statLabel}>총 문제</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{stats?.totalAttempts || 0}</Text>
                <Text style={styles.statLabel}>풀이 횟수</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#34C759' }]}>
                  {stats?.totalCorrect || 0}
                </Text>
                <Text style={styles.statLabel}>정답</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
                  {stats?.totalIncorrect || 0}
                </Text>
                <Text style={styles.statLabel}>오답</Text>
              </View>
            </View>
          </View>

          {/* 정답률 */}
          <View style={styles.accuracyCard}>
            <Text style={styles.cardTitle}>전체 정답률</Text>
            <View style={styles.accuracyCircle}>
              <Text style={styles.accuracyNumber}>
                {stats?.overallAccuracy.toFixed(1) || 0}%
              </Text>
            </View>
          </View>

          {/* 취약 문제 목록 */}
          {stats && stats.questionStats.filter(q => q.totalAttempts > 0).length > 0 && (
            <View style={styles.weakCard}>
              <Text style={styles.cardTitle}>취약 문제 TOP 5</Text>
              {stats.questionStats
                .filter(q => q.totalAttempts > 0)
                .slice(0, 5)
                .map((q, index) => (
                  <View key={q.questionId} style={styles.weakItem}>
                    <View style={styles.weakRank}>
                      <Text style={styles.weakRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.weakContent}>
                      <Text style={styles.weakQuestion} numberOfLines={2}>
                        {q.question}
                      </Text>
                      <View style={styles.weakStats}>
                        <Text style={styles.weakAccuracy}>
                          정답률: {q.accuracy.toFixed(1)}%
                        </Text>
                        <Text style={styles.weakAttempts}>
                          ({q.correctCount}/{q.totalAttempts})
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          )}

          {/* 데이터 없음 */}
          {(!stats || stats.totalAttempts === 0) && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>아직 통계 데이터가 없습니다</Text>
              <Text style={styles.emptySubtext}>
                퀴즈를 풀면 통계가 표시됩니다
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View>
          {/* 퀴즈 세트 관리 */}
          <View style={styles.manageHeader}>
            <Text style={styles.manageCount}>
              총 {quizSets.length}개의 퀴즈 세트
            </Text>
            {quizSets.length > 0 && (
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={styles.clearAllButton}>전체 삭제</Text>
              </TouchableOpacity>
            )}
          </View>

          {quizSets.length > 0 ? (
            quizSets.map(quizSet => (
              <View key={quizSet.id} style={styles.quizSetContainer}>
                {/* 퀴즈 세트 헤더 */}
                <TouchableOpacity
                  style={styles.quizSetCard}
                  onPress={() => toggleExpand(quizSet.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.quizSetInfo}>
                    <View style={styles.quizSetHeader}>
                      <Text style={styles.expandIcon}>
                        {expandedSetId === quizSet.id ? '▼' : '▶'}
                      </Text>
                      <Text style={styles.quizSetTitle}>{quizSet.title}</Text>
                    </View>
                    <Text style={styles.quizSetMeta}>
                      {quizSet.questions.length}문제 • {new Date(quizSet.createdAt).toLocaleDateString('ko-KR')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteSetButton}
                    onPress={() => handleDeleteQuizSet(quizSet)}
                  >
                    <Text style={styles.deleteSetButtonText}>삭제</Text>
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* 펼쳐진 문제 목록 */}
                {expandedSetId === quizSet.id && (
                  <View style={styles.questionsContainer}>
                    {quizSet.questions.map((question, index) => (
                      <View key={question.id} style={styles.questionItem}>
                        <View style={styles.questionContent}>
                          <View style={styles.questionHeader}>
                            <Text style={styles.questionNumber}>Q{index + 1}</Text>
                            <View style={[
                              styles.answerBadge,
                              question.answer ? styles.answerO : styles.answerX
                            ]}>
                              <Text style={styles.answerBadgeText}>
                                {question.answer ? 'O' : 'X'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.questionText} numberOfLines={3}>
                            {question.question}
                          </Text>
                          {question.explanation && (
                            <Text style={styles.explanationText} numberOfLines={2}>
                              💡 {question.explanation}
                            </Text>
                          )}
                        </View>
                        <View style={styles.questionActions}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => openEditModal(quizSet.id, question)}
                          >
                            <Text style={styles.editButtonText}>수정</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteQuestionButton}
                            onPress={() => handleDeleteQuestion(quizSet.id, question)}
                          >
                            <Text style={styles.deleteQuestionButtonText}>삭제</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {/* 문제 추가 버튼 */}
                    <TouchableOpacity
                      style={styles.addQuestionButton}
                      onPress={() => openEditModal(quizSet.id)}
                    >
                      <Text style={styles.addQuestionButtonText}>+ 문제 추가</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyText}>저장된 퀴즈가 없습니다</Text>
              <Text style={styles.emptySubtext}>
                카메라 탭에서 문서를 촬영해 퀴즈를 만들어보세요
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.bottomSpacer} />

      {/* 문제 편집 모달 */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingQuestion?.isNew ? '문제 추가' : '문제 수정'}
            </Text>

            <Text style={styles.inputLabel}>문제</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.question}
              onChangeText={(text) => setEditForm({ ...editForm, question: text })}
              placeholder="문제 내용을 입력하세요"
              multiline
            />

            <Text style={styles.inputLabel}>정답</Text>
            <View style={styles.answerToggle}>
              <TouchableOpacity
                style={[
                  styles.answerOption,
                  editForm.answer && styles.answerOptionActive
                ]}
                onPress={() => setEditForm({ ...editForm, answer: true })}
              >
                <Text style={[
                  styles.answerOptionText,
                  editForm.answer && styles.answerOptionTextActive
                ]}>O (참)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.answerOption,
                  !editForm.answer && styles.answerOptionActive
                ]}
                onPress={() => setEditForm({ ...editForm, answer: false })}
              >
                <Text style={[
                  styles.answerOptionText,
                  !editForm.answer && styles.answerOptionTextActive
                ]}>X (거짓)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>해설 (선택)</Text>
            <TextInput
              style={[styles.textInput, styles.explanationInput]}
              value={editForm.explanation}
              onChangeText={(text) => setEditForm({ ...editForm, explanation: text })}
              placeholder="해설을 입력하세요"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveQuestion}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  accuracyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  accuracyCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accuracyNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  weakCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
  },
  weakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weakRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  weakRankText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  weakContent: {
    flex: 1,
  },
  weakQuestion: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  weakStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weakAccuracy: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
  weakAttempts: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  manageCount: {
    fontSize: 16,
    color: '#666',
  },
  clearAllButton: {
    color: '#FF3B30',
    fontSize: 14,
  },
  quizSetContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  quizSetCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizSetInfo: {
    flex: 1,
  },
  quizSetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  quizSetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  quizSetMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginLeft: 20,
  },
  deleteSetButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteSetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  questionsContainer: {
    backgroundColor: '#fff',
    marginTop: 2,
    borderRadius: 12,
    padding: 10,
  },
  questionItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  questionContent: {
    marginBottom: 10,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 10,
  },
  answerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  answerO: {
    backgroundColor: '#34C759',
  },
  answerX: {
    backgroundColor: '#FF3B30',
  },
  answerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  explanationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  questionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 13,
  },
  deleteQuestionButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteQuestionButtonText: {
    color: '#fff',
    fontSize: 13,
  },
  addQuestionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addQuestionButtonText: {
    color: '#666',
    fontSize: 14,
  },
  bottomSpacer: {
    height: 40,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  explanationInput: {
    minHeight: 60,
  },
  answerToggle: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  answerOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f5f5f5',
  },
  answerOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  answerOptionText: {
    fontSize: 16,
    color: '#666',
  },
  answerOptionTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ddd',
    paddingVertical: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
