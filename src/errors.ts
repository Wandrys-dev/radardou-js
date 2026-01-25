/**
 * Exceções customizadas do SDK RadarDOU
 */

export class RadarDOUError extends Error {
  public code: string;
  public details?: Record<string, unknown>;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'RadarDOUError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Erro de autenticação.
 * Ocorre quando a API Key é inválida, expirada ou não fornecida.
 */
export class AuthenticationError extends RadarDOUError {
  constructor(message: string, code: string = 'AUTH_ERROR', details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Erro de conflito de sessão.
 * Ocorre quando outro dispositivo já está usando a API Key.
 */
export class SessionConflictError extends RadarDOUError {
  public activeIp?: string;

  constructor(
    message: string,
    activeIp?: string,
    code: string = 'SESSION_CONFLICT',
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    this.name = 'SessionConflictError';
    this.activeIp = activeIp;
  }
}

/**
 * Erro de limite de requisições.
 * Ocorre quando o limite do plano foi atingido.
 */
export class RateLimitError extends RadarDOUError {
  public limit?: number;
  public resetAt?: string;

  constructor(
    message: string,
    limit?: number,
    resetAt?: string,
    code: string = 'RATE_LIMIT',
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    this.name = 'RateLimitError';
    this.limit = limit;
    this.resetAt = resetAt;
  }
}

/**
 * Erro genérico da API.
 */
export class APIError extends RadarDOUError {
  public statusCode?: number;

  constructor(
    message: string,
    statusCode?: number,
    code: string = 'API_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}
