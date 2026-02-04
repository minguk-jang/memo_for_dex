# OX 퀴즈 메이커

카메라로 문서를 촬영하여 OX 퀴즈를 자동 생성하고, 학습 및 통계를 관리하는 모바일 앱입니다.

## 주요 기능

### 1. 촬영 탭
- 카메라로 문서 촬영 또는 갤러리에서 이미지 선택
- LLM(Claude/GPT-4)을 통한 자동 OX 퀴즈 추출
- 추출된 문제 수정/추가/삭제 기능
- 로컬 저장소에 퀴즈 저장

### 2. 퀴즈 탭
- 저장된 문제들을 랜덤 순서로 출제
- O/X 버튼으로 직관적인 답변
- 정답/오답 즉시 피드백 및 해설 표시
- 퀴즈 완료 후 결과 요약

### 3. 대시보드 탭
- 전체 통계 현황 (문제 수, 풀이 횟수, 정답/오답)
- 정답률 시각화 (원형 차트)
- 취약 문제 분석 (막대 차트)
- 퀴즈 세트 관리 (조회/삭제)

## 기술 스택

- **Framework**: React Native + Expo
- **Navigation**: React Navigation (Bottom Tabs)
- **Storage**: AsyncStorage (로컬 저장)
- **Charts**: react-native-chart-kit
- **LLM**: Anthropic Claude API / OpenAI GPT-4 Vision

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example`을 `.env`로 복사하고 API 키 설정:
```bash
cp .env.example .env
```

```env
# Anthropic Claude API (권장)
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_api_key_here

# 또는 OpenAI API
EXPO_PUBLIC_OPENAI_API_KEY=your_api_key_here
```

### 3. 앱 실행
```bash
# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android

# Expo Go 앱으로 실행
npm start
```

## 프로젝트 구조

```
src/
├── components/       # 재사용 컴포넌트
├── navigation/       # 네비게이션 설정
│   └── TabNavigator.tsx
├── screens/          # 화면 컴포넌트
│   ├── CameraScreen.tsx    # 촬영 탭
│   ├── QuizScreen.tsx      # 퀴즈 탭
│   └── DashboardScreen.tsx # 대시보드 탭
├── services/         # 비즈니스 로직
│   ├── llmService.ts       # LLM API 호출
│   └── storageService.ts   # 로컬 저장소 관리
└── types/            # TypeScript 타입 정의
    └── index.ts
```

## 데이터 구조

### QuizSet (퀴즈 세트)
```typescript
{
  id: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: number;
}
```

### QuizQuestion (문제)
```typescript
{
  id: string;
  question: string;
  answer: boolean;  // true=O, false=X
  explanation?: string;
}
```

### QuizResult (결과)
```typescript
{
  id: string;
  questionId: string;
  isCorrect: boolean;
  answeredAt: number;
}
```

## 라이선스

MIT License
