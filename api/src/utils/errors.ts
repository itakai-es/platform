/**
 * Domain errors that the global Fastify error handler translates into
 * user-friendly HTTP responses. Throw these from service-layer code so the
 * client always sees a controlled message and a stable `code`, never a raw
 * stack trace or an arbitrary status code.
 */

export class HttpError extends Error {
  readonly statusCode: number
  readonly code: string
  constructor(statusCode: number, message: string, code: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.code = code
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Datos inválidos', code = 'VALIDATION_ERROR') {
    super(400, message, code)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'No autorizado', code = 'UNAUTHORIZED') {
    super(401, message, code)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Acceso denegado', code = 'FORBIDDEN') {
    super(403, message, code)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Recurso no encontrado', code = 'NOT_FOUND') {
    super(404, message, code)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflicto con el estado actual', code = 'CONFLICT') {
    super(409, message, code)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends HttpError {
  constructor(message = 'Demasiadas peticiones. Inténtalo más tarde.', code = 'RATE_LIMITED') {
    super(429, message, code)
    this.name = 'RateLimitError'
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message: string, code: string) {
    super(503, message, code)
    this.name = 'ServiceUnavailableError'
  }
}

export class AIServiceUnavailableError extends ServiceUnavailableError {
  constructor(
    message = 'El servicio de IA no está disponible ahora mismo. Inténtalo de nuevo en unos minutos.'
  ) {
    super(message, 'AI_SERVICE_UNAVAILABLE')
    this.name = 'AIServiceUnavailableError'
  }
}

export class AvatarServiceUnavailableError extends ServiceUnavailableError {
  constructor(
    message = 'El servicio de personalización de avatares no está disponible ahora mismo. Inténtalo de nuevo en unos minutos.'
  ) {
    super(message, 'AVATAR_SERVICE_UNAVAILABLE')
    this.name = 'AvatarServiceUnavailableError'
  }
}

/**
 * Para el `catch` de una ruta que responde con su propio código a cualquier
 * `Error`: relanza los `HttpError`, que resuelve el manejador global con su
 * estado y su `code`. Va antes de las ramas genéricas del catch.
 */
export function rethrowHttpError(error: unknown): void {
  if (error instanceof HttpError) throw error
}

/**
 * Run an external AI/provider call and rethrow any failure as
 * AIServiceUnavailableError. Validation errors (ZodError) and already-typed
 * ServiceUnavailableError instances pass through unchanged.
 */
export async function wrapAICall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ServiceUnavailableError) throw err
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[AI] Provider call failed:', detail)
    throw new AIServiceUnavailableError()
  }
}
