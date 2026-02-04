import * as FileSystem from 'expo-file-system/legacy';
import { LLMQuizResponse } from '../types';

// 환경 변수에서 API 키 가져오기
const getGLMApiKey = (): string => {
  // @ts-ignore - 런타임에 주입됨
  return process.env.EXPO_PUBLIC_GLM_API_KEY || '';
};

const getGeminiApiKey = (): string => {
  // @ts-ignore - 런타임에 주입됨
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
};

const getGeminiModel = (): string => {
  // @ts-ignore - 런타임에 주입됨
  return process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
};

// 퀴즈 생성 프롬프트
const QUIZ_PROMPT = `이 이미지에서 텍스트를 추출하고, 해당 내용을 기반으로 OX 퀴즈 문제를 만들어주세요.

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "questions": [
    {
      "question": "문제 내용 (O 또는 X로 답할 수 있는 문장)",
      "answer": true 또는 false (true=O, false=X),
      "explanation": "정답에 대한 간단한 설명"
    }
  ]
}

규칙:
1. 이미지에서 핵심 정보를 추출하여 OX 문제로 변환
2. 각 문제는 명확한 참/거짓 판단이 가능해야 함
3. 최소 3개 이상의 문제 생성
4. 문제는 한국어로 작성
5. 일부 문제는 참(O), 일부는 거짓(X)이 되도록 다양하게 구성`;

// 이미지를 base64로 변환
const imageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

// JSON 응답 파싱
const parseQuizResponse = (textContent: string): LLMQuizResponse => {
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    // answer가 문자열 "true"/"false"로 올 경우 boolean으로 변환
    if (parsed.questions) {
      parsed.questions = parsed.questions.map((q: any) => ({
        ...q,
        answer: typeof q.answer === 'string' ? q.answer.toLowerCase() === 'true' : !!q.answer,
      }));
    }
    return parsed;
  }
  throw new Error('No valid JSON found in response');
};

// GLM-4.6V-Flash API 호출
const callGLMApi = async (base64Image: string): Promise<LLMQuizResponse> => {
  const apiKey = getGLMApiKey();

  if (!apiKey) {
    throw new Error('GLM API 키가 설정되지 않았습니다.');
  }

  console.log('GLM API 호출 중...');

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4v-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: QUIZ_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GLM API Error:', errorText);
    throw new Error(`GLM API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`GLM API Error: ${data.error.message}`);
  }

  const textContent = data.choices[0].message.content;
  return parseQuizResponse(textContent);
};

// Gemini API 호출
const callGeminiApi = async (base64Image: string): Promise<LLMQuizResponse> => {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();

  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  console.log('Gemini API 호출 중... (모델:', model, ')');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                text: QUIZ_PROMPT,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message}`);
  }

  const textContent = data.candidates[0].content.parts[0].text;
  return parseQuizResponse(textContent);
};

// 메인 함수: 이미지에서 OX 퀴즈 추출 (GLM 우선, Gemini fallback)
export const extractQuizFromImage = async (imageUri: string): Promise<LLMQuizResponse> => {
  const base64Image = await imageToBase64(imageUri);

  const hasGLM = getGLMApiKey().length > 0;
  const hasGemini = getGeminiApiKey().length > 0;

  // GLM API 먼저 시도
  if (hasGLM) {
    try {
      return await callGLMApi(base64Image);
    } catch (error) {
      console.error('GLM API 실패:', error);

      // Gemini fallback
      if (hasGemini) {
        console.log('Gemini API로 fallback...');
        return await callGeminiApi(base64Image);
      }
      throw error;
    }
  }

  // GLM 키가 없으면 Gemini 시도
  if (hasGemini) {
    return await callGeminiApi(base64Image);
  }

  throw new Error('API 키가 설정되지 않았습니다. .env 파일에 EXPO_PUBLIC_GLM_API_KEY 또는 EXPO_PUBLIC_GEMINI_API_KEY를 설정해주세요.');
};

// API 키 확인
export const hasApiKey = (): boolean => {
  return getGLMApiKey().length > 0 || getGeminiApiKey().length > 0;
};
