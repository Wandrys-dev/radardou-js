/**
 * Cliente principal do SDK RadarDOU
 */

import type {
  RadarDOUConfig,
  SearchParams,
  SearchResult,
  Publication,
  Alert,
  CreateAlertParams
} from './types';
import {
  RadarDOUError,
  AuthenticationError,
  SessionConflictError,
  RateLimitError,
  APIError
} from './errors';
import { SessionManager } from './session';

const DEFAULT_BASE_URL = 'https://www.radar-dou.com/api/v1';
const DEFAULT_TIMEOUT = 30000;
const SDK_VERSION = '1.0.1';

export class RadarDOU {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private sessionManager: SessionManager;

  /**
   * Cria uma nova instancia do cliente RadarDOU.
   *
   * @example
   * ```typescript
   * const client = new RadarDOU({ apiKey: process.env.RADAR_API_KEY! });
   *
   * // Pelo menos um filtro e obrigatorio
   * const resultado = await client.buscar({ dateFrom: '2026-05-01', limit: 10 });
   *
   * await client.close();
   * ```
   */
  constructor(config: RadarDOUConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError(
        'API Key e obrigatoria. Obtenha em https://www.radar-dou.com/api-keys',
        'API_KEY_REQUIRED'
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.sessionManager = new SessionManager(this);

    if (config.autoSession !== false) {
      this.initSession();
    }
  }

  private async initSession(): Promise<void> {
    try {
      await this.sessionManager.startSession();
    } catch (error) {
      if (error instanceof SessionConflictError) {
        throw error;
      }
      // Outros erros sao ignorados no startup (chave funciona sem sessao)
    }
  }

  async _request<T = any>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': `RadarDOU-JS/${SDK_VERSION}`,
          'X-SDK-Version': SDK_VERSION
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({ error: 'Erro desconhecido' }));

      if (response.ok) {
        return data as T;
      }

      return this.handleError(response.status, data);
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new APIError('Timeout na requisicao', undefined, 'TIMEOUT');
      }

      if (error instanceof RadarDOUError) {
        throw error;
      }

      throw new APIError(
        error.message || 'Erro de conexao',
        undefined,
        'CONNECTION_ERROR'
      );
    }
  }

  private handleError(status: number, data: any): never {
    // Backend usa "error" como chave principal de mensagem
    const message = data.error || data.message || 'Erro desconhecido';
    const code = data.code || 'UNKNOWN_ERROR';
    const details = data.details;

    if (status === 400) {
      throw new APIError(message, 400, code, details);
    }
    if (status === 401) {
      throw new AuthenticationError(message, code, details);
    }
    if (status === 403) {
      if (code === 'SESSION_CONFLICT') {
        throw new SessionConflictError(message, data.active_ip, code, details);
      }
      throw new AuthenticationError(message, code, details);
    }
    if (status === 429) {
      throw new RateLimitError(message, data.limit, data.reset_at, code, details);
    }

    throw new APIError(message, status, code, details);
  }

  // ========================================
  // Publicacoes
  // ========================================

  /**
   * Busca publicacoes no DOU. Pelo menos um filtro e obrigatorio:
   * query, dateFrom, dateTo, secao ou tipo.
   *
   * @example
   * ```typescript
   * const resultado = await client.buscar({
   *   query: 'licitacao',
   *   dateFrom: '2026-05-01',
   *   limit: 10
   * });
   * ```
   */
  async buscar(params: SearchParams): Promise<SearchResult> {
    if (!params.query && !params.dateFrom && !params.dateTo && !params.secao && !params.tipo) {
      throw new APIError(
        'Pelo menos um filtro e obrigatorio: query, dateFrom, dateTo, secao ou tipo.',
        400,
        'FILTER_REQUIRED'
      );
    }

    return this._request<SearchResult>('GET', '/publications', undefined, {
      query: params.query,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      secao: params.secao,
      tipo: params.tipo,
      page: params.page || 1,
      limit: Math.min(params.limit || 20, 100)
    });
  }

  /**
   * Obtem detalhes completos de uma publicacao (texto_html e texto_puro inclusos).
   */
  async obterPublicacao(id: string): Promise<Publication> {
    return this._request<Publication>('GET', `/publications/${id}`);
  }

  // ========================================
  // Alertas
  // ========================================

  /**
   * Lista alertas configurados pelo usuario.
   */
  async listarAlertas(opts?: { page?: number; limit?: number; activeOnly?: boolean }): Promise<{ data: Alert[]; pagination: any }> {
    return this._request('GET', '/alerts', undefined, {
      page: opts?.page || 1,
      limit: Math.min(opts?.limit || 20, 100),
      active: opts?.activeOnly ? 'true' : undefined
    });
  }

  /**
   * Cria um novo alerta.
   */
  async criarAlerta(params: CreateAlertParams): Promise<Alert> {
    return this._request<Alert>('POST', '/alerts', {
      name: params.name,
      searchCriteria: params.searchCriteria,
      description: params.description,
      frequency: params.frequency || 'daily',
      emailNotification: params.emailNotification ?? true,
      soundAlert: params.soundAlert ?? false
    });
  }

  // ========================================
  // Favoritos, Colecoes, Vocabulario
  // ========================================

  async listarFavoritos(opts?: { page?: number; limit?: number }): Promise<any> {
    return this._request('GET', '/favorites', undefined, {
      page: opts?.page || 1,
      limit: Math.min(opts?.limit || 20, 100)
    });
  }

  async adicionarFavorito(publicationId: string, notes?: string): Promise<any> {
    return this._request('POST', '/favorites', { publicationId, notes });
  }

  async removerFavorito(publicationId: string): Promise<any> {
    return this._request('DELETE', '/favorites', undefined, { publicationId });
  }

  async listarColecoes(): Promise<any> {
    return this._request('GET', '/collections');
  }

  async criarColecao(name: string, description?: string): Promise<any> {
    return this._request('POST', '/collections', { name, description });
  }

  async vocabulario(): Promise<any> {
    return this._request('GET', '/vocabulary');
  }

  // ========================================
  // Sessao
  // ========================================

  async validarSessao(): Promise<boolean> {
    return this.sessionManager.validateSession();
  }

  async close(): Promise<void> {
    await this.sessionManager.endSession();
  }
}
