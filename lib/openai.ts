import OpenAI from 'openai';

// Initialize OpenAI client with error handling
let openai: OpenAI | null = null;

try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not found. AI features will be disabled.');
  } else if (apiKey.startsWith('sk-')) {
    openai = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 2, // Retry failed requests twice
    });
  } else {
    console.warn('Invalid OPENAI_API_KEY format. AI features will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

export { openai };

// Cost tracking (in cents)
let totalCost = 0;
const GPT_4O_MINI_INPUT_COST = 0.15; // per 1M tokens
const GPT_4O_MINI_OUTPUT_COST = 0.60; // per 1M tokens

export function getTotalCost(): number {
  return totalCost;
}

export function resetCostTracking(): void {
  totalCost = 0;
}

// Error types
class OpenAIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

// Rate limiting error
class RateLimitError extends OpenAIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'rate_limit_exceeded', true);
    this.name = 'RateLimitError';
  }
}

// Validation error
class ValidationError extends OpenAIError {
  constructor(message: string) {
    super(message, 'validation_error', false);
    this.name = 'ValidationError';
  }
}

// Prompt Templates for Turkish Education System
export const promptTemplates = {
  generateQuestion: (
    subject: string,
    topic: string,
    difficulty: string,
    examType: string
  ) => {
    const difficultyMap = {
      beginner: 'Kolay (Başlangıç seviyesi)',
      intermediate: 'Orta (Orta seviye)',
      advanced: 'Zor (İleri seviye)',
    };

    return `Sen ${examType} sınavına hazırlık için soru üreten uzman bir AI öğretmensin.

KONU: ${subject} - ${topic}
ZORLUK: ${difficultyMap[difficulty as keyof typeof difficultyMap]}
SINAV TİPİ: ${examType}

JSON formatında şu şablonda soru üret:
{
  "question": "soru metni (net, anlaşılır, müfredata uygun)",
  "choices": ["A seçeneği", "B seçeneği", "C seçeneği", "D seçeneği"],
  "correctAnswer": 0,
  "explanation": "adım adım çözüm ve neden doğru cevap bu"
}

KURALLAR:
- Soru müfredata uygun olmalı
- Seçenekler mantıklı ve karıştırıcı olmalı
- Çözüm detaylı ve öğretici olmalı
- JSON formatına tam uyun
- Türkçe karakterleri doğru kullan`;
  },

  generateExplanation: (question: string, userAnswer: number, correctAnswer: number) => {
    return `Sınav sorusu için detaylı açıklama:

SORU: ${question}
ÖĞRENCİNİN CEVABI: ${userAnswer}. seçenek
DOĞRU CEVAP: ${correctAnswer}. seçenek

Öğrenciye:
1. Neden yanlış yaptığı (veya doğru olduğu)
2. Doğru çözüm yöntemi
3. Benzer sorularda dikkat etmesi gerekenler

hakkında detaylı ve motive edici açıklama yap.`;
  },
};

// Retry wrapper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Check if error is retryable
      const err = error as { code?: string; status?: number };
      if (err?.code === 'rate_limit_exceeded' || err?.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Don't retry other errors
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Validate question response
function validateQuestionResponse(data: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Response is not an object' };
  }

  if (!data.question || typeof data.question !== 'string') {
    return { valid: false, error: 'Missing or invalid question field' };
  }

  if (!Array.isArray(data.choices) || data.choices.length !== 4) {
    return { valid: false, error: 'Missing or invalid choices array' };
  }

  if (typeof data.correctAnswer !== 'number' || data.correctAnswer < 0 || data.correctAnswer > 3) {
    return { valid: false, error: 'Missing or invalid correctAnswer field' };
  }

  if (!data.explanation || typeof data.explanation !== 'string') {
    return { valid: false, error: 'Missing or invalid explanation field' };
  }

  return { valid: true };
}

// Question Generation with Validation, Retry, and Error Handling
export async function generateQuestion(params: {
  subject: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exam_type: 'TYT' | 'AYT' | 'LGS';
  maxRetries?: number;
}) {
  // Check if OpenAI is initialized
  if (!openai) {
    throw new OpenAIError(
      'OpenAI client not initialized. Please check your API key.',
      'client_not_initialized'
    );
  }

  const { maxRetries = 3 } = params;

  try {
    const completion = await withRetry(
      async () => {
        return await openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: promptTemplates.generateQuestion(
                params.subject,
                params.topic,
                params.difficulty,
                params.exam_type
              ),
            },
            {
              role: 'user',
              content: `${params.subject} - ${params.topic} konusu için ${params.difficulty} seviyesinde bir ${params.exam_type} sorusu üret.`,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        });
      },
      maxRetries
    );

    // Track cost
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    totalCost += (inputTokens * GPT_4O_MINI_INPUT_COST + outputTokens * GPT_4O_MINI_OUTPUT_COST) / 10000;

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new OpenAIError('Empty response from OpenAI', 'empty_response');
    }

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      throw new ValidationError('Failed to parse JSON response');
    }

    // Validate response structure
    const validation = validateQuestionResponse(parsedResponse);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Validation failed');
    }

    return {
      question: parsedResponse.question,
      choices: parsedResponse.choices,
      correctAnswer: parsedResponse.correctAnswer,
      explanation: parsedResponse.explanation,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
    };
  } catch (error) {
    const err = error as { code?: string; status?: number; message?: string };

    // Handle specific error types
    if (err?.code === 'rate_limit_exceeded' || err?.status === 429) {
      throw new RateLimitError('OpenAI rate limit exceeded. Please try again later.');
    }

    if (err?.code === 'insufficient_quota') {
      throw new OpenAIError('OpenAI quota exceeded. Please check your billing.', 'insufficient_quota');
    }

    if (err?.code === 'invalid_api_key') {
      throw new OpenAIError('Invalid OpenAI API key.', 'invalid_api_key');
    }

    // Log error for debugging
    console.error('Error generating question:', {
      error: err?.message,
      code: err?.code,
      status: err?.status,
      params,
    });

    throw new OpenAIError(
      `Failed to generate question: ${err?.message || 'Unknown error'}`,
      err?.code
    );
  }
}

// Generate detailed explanation
export async function generateExplanation(
  question: string,
  userAnswer: number,
  correctAnswer: number
) {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: promptTemplates.generateExplanation(question, userAnswer, correctAnswer),
        },
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating explanation:', error);
    throw error;
  }
}
