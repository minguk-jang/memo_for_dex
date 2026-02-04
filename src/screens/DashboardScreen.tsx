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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import {
  calculateStats,
  getAllQuizSets,
  deleteQuizSet,
  clearAllData,
} from '../services/storageService';
import { OverallStats, QuizSet } from '../types';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'manage'>('stats');

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
            await loadData();
          },
        },
      ]
    );
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
            await loadData();
          },
        },
      ]
    );
  };

  // 파이 차트 데이터
  const pieChartData = stats && stats.totalAttempts > 0
    ? [
        {
          name: '정답',
          population: stats.totalCorrect,
          color: '#34C759',
          legendFontColor: '#333',
          legendFontSize: 14,
        },
        {
          name: '오답',
          population: stats.totalIncorrect,
          color: '#FF3B30',
          legendFontColor: '#333',
          legendFontSize: 14,
        },
      ]
    : [];

  // 바 차트 데이터 (정확도 낮은 문제 top 5)
  const barChartData = stats && stats.questionStats.length > 0
    ? {
        labels: stats.questionStats
          .filter(q => q.totalAttempts > 0)
          .slice(0, 5)
          .map((_, i) => `Q${i + 1}`),
        datasets: [
          {
            data: stats.questionStats
              .filter(q => q.totalAttempts > 0)
              .slice(0, 5)
              .map(q => q.accuracy),
          },
        ],
      }
    : null;

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
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

          {/* 파이 차트 */}
          {pieChartData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>정답/오답 비율</Text>
              <PieChart
                data={pieChartData}
                width={screenWidth - 40}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}

          {/* 바 차트 */}
          {barChartData && barChartData.labels.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>문제별 정답률 (낮은 순)</Text>
              <BarChart
                data={barChartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                yAxisSuffix="%"
                yAxisLabel=""
                style={styles.barChart}
                fromZero
              />
            </View>
          )}

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
              <View key={quizSet.id} style={styles.quizSetCard}>
                <View style={styles.quizSetInfo}>
                  <Text style={styles.quizSetTitle}>{quizSet.title}</Text>
                  <Text style={styles.quizSetMeta}>
                    {quizSet.questions.length}문제 •
                    {new Date(quizSet.createdAt).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteQuizSet(quizSet)}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
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
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  barChart: {
    marginTop: 10,
    borderRadius: 10,
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
  quizSetCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quizSetInfo: {
    flex: 1,
  },
  quizSetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quizSetMeta: {
    fontSize: 13,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
