import * as FileSystem from 'expo-file-system';
import { LLMQuizResponse } from '../types';

// 환경 변수에서 API 키 가져오기 (Expo에서는 process.env 대신 Constants 사용)
// 앱 빌드 시 EAS Secrets 또는 app.config.js의 extra 필드 사용
const getApiKey = (): string => {
  // @ts-ignore - 런타임에 주입됨
  return process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
         process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
         '';
};

const getApiProvider = (): 'anthropic' | 'openai' => {
  // @ts-ignore
  if (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  return 'openai';
};

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

// Anthropic Claude API 호출
const callAnthropicApi = async (base64Image: string): Promise<LLMQuizResponse> => {
  const apiKey = getApiKey();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `이 이미지에서 텍스트를 추출하고, 해당 내용을 기반으로 OX 퀴즈 문제를 만들어주세요.

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
5. 일부 문제는 참(O), 일부는 거짓(X)이 되도록 다양하게 구성`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.content[0].text;

  // JSON 파싱
  try {
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (e) {
    console.error('Error parsing LLM response:', e);
    throw new Error('Failed to parse LLM response');
  }
};

// OpenAI GPT-4 Vision API 호출
const callOpenAiApi = async (base64Image: string): Promise<LLMQuizResponse> => {
  const apiKey = getApiKey();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 4096,
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
              text: `이 이미지에서 텍스트를 추출하고, 해당 내용을 기반으로 OX 퀴즈 문제를 만들어주세요.

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
5. 일부 문제는 참(O), 일부는 거짓(X)이 되도록 다양하게 구성`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.choices[0].message.content;

  // JSON 파싱
  try {
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (e) {
    console.error('Error parsing LLM response:', e);
    throw new Error('Failed to parse LLM response');
  }
};

// 메인 함수: 이미지에서 OX 퀴즈 추출
export const extractQuizFromImage = async (imageUri: string): Promise<LLMQuizResponse> => {
  const base64Image = await imageToBase64(imageUri);
  const provider = getApiProvider();

  if (provider === 'anthropic') {
    return callAnthropicApi(base64Image);
  } else {
    return callOpenAiApi(base64Image);
  }
};

// API 키 확인
export const hasApiKey = (): boolean => {
  return getApiKey().length > 0;
};
