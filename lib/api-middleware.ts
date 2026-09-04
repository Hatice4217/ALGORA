import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }
): Promise<{ success: boolean; remaining: number; resetTime?: number }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Clean old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }

  // Get or create user's rate limit entry
  let userLimit = rateLimitMap.get(identifier);

  // Reset if window expired
  if (!userLimit || userLimit.resetTime < now) {
    userLimit = { count: 0, resetTime: now + config.windowMs };
    rateLimitMap.set(identifier, userLimit);
  }

  // Check if limit exceeded
  if (userLimit.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: userLimit.resetTime,
    };
  }

  // Increment counter
  userLimit.count++;
  rateLimitMap.set(identifier, userLimit);

  return {
    success: true,
    remaining: config.maxRequests - userLimit.count,
  };
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (req: NextRequest) => {
    // Get identifier from IP or user ID
    const ip = req.headers.get('x-forwarded-for') ||
              req.headers.get('x-real-ip') ||
              'unknown';

    const result = await rateLimit(ip, config);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Lütfen bir dakika bekleyin.',
          resetTime: result.resetTime,
        },
        { status: 429 }
      );
    }

    // Add rate limit headers
    const response = await handler(req);
    response.headers.set('X-RateLimit-Limit', config?.maxRequests.toString() || '10');
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());

    return response;
  };
}

// Request validation wrapper
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Validate request body
      const validationResult = schema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResult.error.issues,
          },
          { status: 400 }
        );
      }

      // Call handler with validated data
      return await handler(req, validationResult.data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid JSON' },
          { status: 400 }
        );
      }

      console.error('Request validation error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Error handling wrapper
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      const err = error as { message?: string; stack?: string; name?: string; code?: string };
      console.error('API Error:', {
        error: err?.message,
        stack: err?.stack,
        url: req.url,
        method: req.method,
      });

      // Handle specific error types
      if (err?.name === 'OpenAIError') {
        return NextResponse.json(
          {
            error: 'AI service error',
            message: err?.message || 'Soru üretimi başarısız',
            code: err?.code,
          },
          { status: err?.code === 'rate_limit_exceeded' ? 429 : 500 }
        );
      }

      if (err?.name === 'ValidationError') {
        return NextResponse.json(
          {
            error: 'Validation error',
            message: err?.message || 'Geçersiz veri',
          },
          { status: 400 }
        );
      }

      // Generic error response
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        },
        { status: 500 }
      );
    }
  };
}

// Authentication check wrapper
export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // Get auth token from header
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // For now, we'll use a simple check
      // In production, verify with Supabase
      const token = authHeader.substring(7);

      // TODO: Verify token with Supabase
      // const { data: { user }, error } = await supabase.auth.getUser(token);

      // For development, accept any token
      if (!token || token.length < 10) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }

      // Extract user ID from token (in production, get from verified token)
      const userId = req.headers.get('x-user-id') || 'dev-user-id';

      return await handler(req, userId);
    } catch (error) {
      console.error('Auth error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

// Combined middleware wrapper
export function withMiddleware(
  handlers: {
    rateLimit?: boolean;
    validation?: z.ZodSchema<unknown>;
    auth?: boolean;
  },
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>
) {
  let wrappedHandler: (req: NextRequest) => Promise<NextResponse> = handler;

  // Add error handling
  wrappedHandler = withErrorHandler(wrappedHandler);

  // Add validation
  if (handlers.validation) {
    wrappedHandler = withValidation(handlers.validation, wrappedHandler);
  }

  // Add rate limiting
  if (handlers.rateLimit) {
    wrappedHandler = withRateLimit(wrappedHandler);
  }

  // Add auth
  if (handlers.auth) {
    wrappedHandler = withAuth(wrappedHandler);
  }

  return wrappedHandler;
}

// CORS middleware
export function withCors(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Handle preflight request
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(req);

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  };
}

// Request logging middleware
export function withLogging(
  handler: (req: NextRequest) => Promise<NextResponse>,
  context: string = 'API'
) {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const url = req.url;
    const method = req.method;

    console.log(`[${context}] ${method} ${url} - Started`);

    try {
      const response = await handler(req);
      const duration = Date.now() - startTime;

      console.log(
        `[${context}] ${method} ${url} - ${response.status} - ${duration}ms`
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[${context}] ${method} ${url} - ERROR - ${duration}ms`,
        error
      );
      throw error;
    }
  };
}
