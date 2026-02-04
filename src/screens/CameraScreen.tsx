import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { extractQuizFromImage, hasApiKey } from '../services/llmService';
import { saveQuizSet, generateId } from '../services/storageService';
import { QuizQuestion, QuizSet } from '../types';

interface EditableQuestion {
  id: string;
  question: string;
  answer: boolean;
  explanation: string;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<EditableQuestion[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // 카메라 권한 요청
  if (!permission) {
    return <View style={styles.container}><Text>권한 확인 중...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>카메라 권한이 필요합니다</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>권한 허용</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 사진 촬영
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        if (photo) {
          setCapturedImage(photo.uri);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('오류', '사진 촬영에 실패했습니다.');
      }
    }
  };

  // 갤러리에서 선택
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  // LLM으로 퀴즈 추출
  const processImage = async () => {
    if (!capturedImage) return;

    if (!hasApiKey()) {
      Alert.alert('오류', 'API 키가 설정되지 않았습니다.\n.env 파일에 EXPO_PUBLIC_GLM_API_KEY를 설정해주세요.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await extractQuizFromImage(capturedImage);

      const questions: EditableQuestion[] = response.questions.map((q, index) => ({
        id: generateId(),
        question: q.question,
        answer: q.answer,
        explanation: q.explanation || '',
      }));

      setExtractedQuestions(questions);
      setQuizTitle(`퀴즈 ${new Date().toLocaleDateString('ko-KR')}`);
      setShowEditor(true);
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('오류', 'LLM 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 문제 수정
  const updateQuestion = (id: string, field: keyof EditableQuestion, value: string | boolean) => {
    setExtractedQuestions(prev =>
      prev.map(q => {
        if (q.id === id) {
          if (field === 'answer' && typeof value === 'string') {
            return { ...q, [field]: value.toLowerCase() === 'true' };
          }
          return { ...q, [field]: value };
        }
        return q;
      })
    );
  };

  // 문제 삭제
  const deleteQuestion = (id: string) => {
    setExtractedQuestions(prev => prev.filter(q => q.id !== id));
  };

  // 문제 추가
  const addQuestion = () => {
    setExtractedQuestions(prev => [
      ...prev,
      {
        id: generateId(),
        question: '',
        answer: true,
        explanation: '',
      },
    ]);
  };

  // 저장
  const saveQuiz = async () => {
    if (!quizTitle.trim()) {
      Alert.alert('오류', '퀴즈 제목을 입력해주세요.');
      return;
    }

    if (extractedQuestions.length === 0) {
      Alert.alert('오류', '최소 1개 이상의 문제가 필요합니다.');
      return;
    }

    const validQuestions = extractedQuestions.filter(q => q.question.trim());
    if (validQuestions.length === 0) {
      Alert.alert('오류', '문제 내용을 입력해주세요.');
      return;
    }

    const quizSet: QuizSet = {
      id: generateId(),
      title: quizTitle,
      questions: validQuestions.map(q => ({
        id: q.id,
        question: q.question,
        answer: q.answer,
        explanation: q.explanation || undefined,
        createdAt: Date.now(),
      })),
      createdAt: Date.now(),
      sourceImageUri: capturedImage || undefined,
    };

    try {
      await saveQuizSet(quizSet);
      Alert.alert('성공', '퀴즈가 저장되었습니다!', [
        {
          text: '확인',
          onPress: () => {
            setCapturedImage(null);
            setExtractedQuestions([]);
            setQuizTitle('');
            setShowEditor(false);
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving quiz:', error);
      Alert.alert('오류', '저장에 실패했습니다.');
    }
  };

  // 다시 촬영
  const retake = () => {
    setCapturedImage(null);
    setExtractedQuestions([]);
    setShowEditor(false);
  };

  // 에디터 화면
  if (showEditor) {
    return (
      <ScrollView style={styles.editorContainer}>
        <Text style={styles.editorTitle}>퀴즈 편집</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>퀴즈 제목</Text>
          <TextInput
            style={styles.titleInput}
            value={quizTitle}
            onChangeText={setQuizTitle}
            placeholder="퀴즈 제목을 입력하세요"
          />
        </View>

        {extractedQuestions.map((q, index) => (
          <View key={q.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>문제 {index + 1}</Text>
              <TouchableOpacity onPress={() => deleteQuestion(q.id)}>
                <Text style={styles.deleteButton}>삭제</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.questionInput}
              value={q.question}
              onChangeText={(text) => updateQuestion(q.id, 'question', text)}
              placeholder="문제를 입력하세요"
              multiline={true}
            />

            <View style={styles.answerRow}>
              <Text style={styles.answerLabel}>정답:</Text>
              <TouchableOpacity
                style={[styles.answerButton, q.answer && styles.answerButtonActive]}
                onPress={() => updateQuestion(q.id, 'answer', true)}
              >
                <Text style={[styles.answerButtonText, q.answer && styles.answerButtonTextActive]}>O</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.answerButton, !q.answer && styles.answerButtonActive]}
                onPress={() => updateQuestion(q.id, 'answer', false)}
              >
                <Text style={[styles.answerButtonText, !q.answer && styles.answerButtonTextActive]}>X</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.explanationInput}
              value={q.explanation}
              onChangeText={(text) => updateQuestion(q.id, 'explanation', text)}
              placeholder="해설 (선택사항)"
              multiline={true}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addQuestion}>
          <Text style={styles.addButtonText}>+ 문제 추가</Text>
        </TouchableOpacity>

        <View style={styles.editorActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={retake}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={saveQuiz}>
            <Text style={styles.saveButtonText}>저장</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // 촬영된 이미지 미리보기
  if (capturedImage) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />

        {isProcessing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>AI가 문서를 분석하고 있습니다...</Text>
          </View>
        ) : (
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
              <Text style={styles.retakeButtonText}>다시 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.processButton} onPress={processImage}>
              <Text style={styles.processButtonText}>퀴즈 추출</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // 카메라 화면
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <View style={styles.cameraOverlay}>
          <View style={styles.guideFrame} />
          <Text style={styles.guideText}>문서를 프레임 안에 맞춰주세요</Text>
        </View>
      </CameraView>

      <View style={styles.cameraControls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
          <Text style={styles.galleryButtonText}>갤러리</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: '85%',
    height: '60%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 10,
  },
  guideText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#000',
  },
  galleryButton: {
    padding: 15,
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#fff',
  },
  spacer: {
    width: 60,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 30,
    backgroundColor: '#000',
  },
  retakeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  processButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  editorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  deleteButton: {
    color: '#FF3B30',
    fontSize: 14,
  },
  questionInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  answerLabel: {
    fontSize: 15,
    marginRight: 15,
  },
  answerButton: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 10,
  },
  answerButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  answerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  answerButtonTextActive: {
    color: '#fff',
  },
  explanationInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#666',
    fontSize: 16,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
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
