/**
 * Cliente principal do SDK RadarDOU
 */

import type {
  RadarDOUConfig,
  SearchParams,
  SearchResult,
  Publication,
  Alert,
  CreateAlertParams,
  UsageInfo,
  AccountInfo
} from './types';
import {
  RadarDOUError,
  AuthenticationError,
  SessionConflictError,
  RateLimitError,
  APIError
} from './errors';
import { SessionManager } from './session';

const DEFAULT_BASE_URL = 'https://api.radar-dou.com/v1';
const DEFAULT_TIMEOUT = 30000;
const SDK_VERSION = '1.0.0';

export class RadarDOU {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private sessionManager: SessionManager;

  /**
   * Cria uma nova instância do cliente RadarDOU.
   *
   * @example
   * ```typescript
   * const client = new RadarDOU({ apiKey: 'sua_api_key' });
   *
   * // Buscar publicações
   * const resultado = await client.buscar({ termo: 'licitação' });
   *
   * // Ao finalizar
   * await client.close();
   * ```
   */
  constructor(config: RadarDOUConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError(
        'API Key é obrigatória. Obtenha sua chave em https://radar-dou.com/api-keys',
        'API_KEY_REQUIRED'
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.sessionManager = new SessionManager(this);

    // Inicia sessão automaticamente se configurado
    if (config.autoSession !== false) {
      this.initSession();
    }
  }

  /**
   * Inicializa a sessão (async)
   */
  private async initSession(): Promise<void> {
    try {
      await this.sessionManager.startSession();
    } catch (error) {
      if (error instanceof SessionConflictError) {
        throw error;
      }
      // Outros erros são ignorados no startup
    }
  }

  /**
   * Faz uma requisição para a API
   */
  async _request<T = any>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Adiciona query params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
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

      const data = await response.json().catch(() => ({ message: 'Erro desconhecido' }));

      if (response.ok) {
        return data as T;
      }

      return this.handleError(response.status, data);
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new APIError('Timeout na requisição', undefined, 'TIMEOUT');
      }

      if (error instanceof RadarDOUError) {
        throw error;
      }

      throw new APIError(
        error.message || 'Erro de conexão',
        undefined,
        'CONNECTION_ERROR'
      );
    }
  }

  /**
   * Trata erros da API
   */
  private handleError(status: number, data: any): never {
    const message = data.message || 'Erro desconhecido';
    const code = data.code || 'UNKNOWN_ERROR';
    const details = data.details;

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
  // Métodos de Busca
  // ========================================

  /**
   * Busca publicações no DOU.
   *
   * @example
   * ```typescript
   * const resultado = await client.buscar({
   *   termo: 'licitação',
   *   orgao: 'Ministério da Saúde',
   *   dataInicio: '2024-01-01'
   * });
   * ```
   */
  async buscar(params: SearchParams): Promise<SearchResult> {
    return this._request('GET', '/search', undefined, {
      q: params.termo,
      data_inicio: params.dataInicio,
      data_fim: params.dataFim,
      orgao: params.orgao,
      tipo: params.tipo,
      secao: params.secao,
      pagina: params.pagina || 1,
      limite: Math.min(params.limite || 20, 100)
    });
  }

  /**
   * Obtém detalhes de uma publicação específica.
   */
  async obterPublicacao(id: string): Promise<Publication> {
    return this._request('GET', `/publicacoes/${id}`);
  }

  /**
   * Lista edições do DOU.
   */
  async listarEdicoes(params?: {
    data?: string;
    secao?: number;
    pagina?: number;
    limite?: number;
  }): Promise<{ edicoes: any[]; total: number }> {
    return this._request('GET', '/edicoes', undefined, {
      data: params?.data,
      secao: params?.secao,
      pagina: params?.pagina || 1,
      limite: params?.limite || 20
    });
  }

  // ========================================
  // Métodos de Alertas
  // ========================================

  /**
   * Lista todos os alertas configurados.
   */
  async listarAlertas(): Promise<{ alertas: Alert[] }> {
    return this._request('GET', '/alertas');
  }

  /**
   * Cria um novo alerta de monitoramento.
   */
  async criarAlerta(params: CreateAlertParams): Promise<Alert> {
    return this._request('POST', '/alertas', {
      nome: params.nome,
      termos: params.termos,
      orgaos: params.orgaos,
      tipos: params.tipos,
      secoes: params.secoes,
      email_notificacao: params.emailNotificacao ?? true
    });
  }

  /**
   * Atualiza um alerta existente.
   */
  async atualizarAlerta(id: string, params: Partial<CreateAlertParams>): Promise<Alert> {
    return this._request('PATCH', `/alertas/${id}`, params as Record<string, unknown>);
  }

  /**
   * Exclui um alerta.
   */
  async excluirAlerta(id: string): Promise<{ success: boolean }> {
    return this._request('DELETE', `/alertas/${id}`);
  }

  // ========================================
  // Métodos de Conta e Uso
  // ========================================

  /**
   * Obtém informações de uso da API.
   */
  async obterUso(): Promise<UsageInfo> {
    return this._request('GET', '/uso');
  }

  /**
   * Obtém informações da conta.
   */
  async obterConta(): Promise<AccountInfo> {
    return this._request('GET', '/conta');
  }

  // ========================================
  // Gerenciamento de Sessão
  // ========================================

  /**
   * Valida se a sessão atual ainda é válida.
   */
  async validarSessao(): Promise<boolean> {
    return this.sessionManager.validateSession();
  }

  /**
   * Encerra a sessão e libera recursos.
   * Deve ser chamado ao finalizar o uso do cliente.
   */
  async close(): Promise<void> {
    await this.sessionManager.endSession();
  }
}
