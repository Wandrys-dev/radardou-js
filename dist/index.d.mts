/**
 * Tipos do SDK RadarDOU
 */
interface RadarDOUConfig {
    /** Sua API Key de assinante */
    apiKey: string;
    /** URL base da API (padrao: https://www.radar-dou.com/api/v1) */
    baseUrl?: string;
    /** Timeout em milissegundos (padrao: 30000) */
    timeout?: number;
    /** Iniciar sessao automaticamente (padrao: true) */
    autoSession?: boolean;
}
interface SearchParams {
    /** Termo de busca em titulo/conteudo */
    query?: string;
    /** Data inicial (YYYY-MM-DD) */
    dateFrom?: string;
    /** Data final (YYYY-MM-DD) */
    dateTo?: string;
    /** Secao do DOU: "DO1" | "DO2" | "DO3" | "Extra" */
    secao?: string;
    /** Tipo do ato (Portaria, Edital, etc.) */
    tipo?: string;
    /** Numero da pagina (1+) */
    page?: number;
    /** Quantidade por pagina (max: 100) */
    limit?: number;
}
interface SearchResult {
    data: Publication[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    meta?: {
        responseTime?: string;
    };
}
interface Publication {
    id: string;
    titulo: string;
    subtitulo?: string;
    texto_resumo?: string;
    texto_html?: string;
    texto_puro?: string;
    data_publicacao: string;
    data_diario?: string;
    secao_codigo: string;
    secao_descricao: string;
    edicao_numero: string;
    numero_pagina?: string;
    tipo_ato?: string;
    orgao_hierarquia?: string;
    orgao_hierarquia_lista?: string;
    urltitulo?: string;
    link_ato?: string;
    created_at?: string;
    updated_at?: string;
}
interface Alert {
    id: string;
    name: string;
    description?: string;
    searchCriteria: Record<string, unknown>;
    isActive: boolean;
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    lastChecked?: string;
    matchCount?: number;
    emailNotification: boolean;
    soundAlert: boolean;
    createdAt: string;
    updatedAt?: string;
}
interface CreateAlertParams {
    /** Nome do alerta */
    name: string;
    /** Criterios de busca (query, secao, tipo, etc.) */
    searchCriteria: Record<string, unknown>;
    /** Descricao opcional */
    description?: string;
    /** Frequencia */
    frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
    /** Receber por email */
    emailNotification?: boolean;
    /** Tocar som ao detectar match */
    soundAlert?: boolean;
}
interface SessionInfo {
    session_id: string;
    expires_at: string;
    heartbeat_interval: number;
}
interface DeviceInfo {
    hostname?: string;
    os?: string;
    osVersion?: string;
    nodeVersion?: string;
    sdkVersion?: string;
}

/**
 * Cliente principal do SDK RadarDOU
 */

declare class RadarDOU {
    private apiKey;
    private baseUrl;
    private timeout;
    private sessionManager;
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
    constructor(config: RadarDOUConfig);
    private initSession;
    _request<T = any>(method: string, endpoint: string, body?: Record<string, unknown>, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    private handleError;
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
    buscar(params: SearchParams): Promise<SearchResult>;
    /**
     * Obtem detalhes completos de uma publicacao (texto_html e texto_puro inclusos).
     */
    obterPublicacao(id: string): Promise<Publication>;
    /**
     * Lista alertas configurados pelo usuario.
     */
    listarAlertas(opts?: {
        page?: number;
        limit?: number;
        activeOnly?: boolean;
    }): Promise<{
        data: Alert[];
        pagination: any;
    }>;
    /**
     * Cria um novo alerta.
     */
    criarAlerta(params: CreateAlertParams): Promise<Alert>;
    listarFavoritos(opts?: {
        page?: number;
        limit?: number;
    }): Promise<any>;
    adicionarFavorito(publicationId: string, notes?: string): Promise<any>;
    removerFavorito(publicationId: string): Promise<any>;
    listarColecoes(): Promise<any>;
    criarColecao(name: string, description?: string): Promise<any>;
    vocabulario(): Promise<any>;
    validarSessao(): Promise<boolean>;
    close(): Promise<void>;
}

/**
 * Exceções customizadas do SDK RadarDOU
 */
declare class RadarDOUError extends Error {
    code: string;
    details?: Record<string, unknown>;
    constructor(message: string, code?: string, details?: Record<string, unknown>);
}
/**
 * Erro de autenticação.
 * Ocorre quando a API Key é inválida, expirada ou não fornecida.
 */
declare class AuthenticationError extends RadarDOUError {
    constructor(message: string, code?: string, details?: Record<string, unknown>);
}
/**
 * Erro de conflito de sessão.
 * Ocorre quando outro dispositivo já está usando a API Key.
 */
declare class SessionConflictError extends RadarDOUError {
    activeIp?: string;
    constructor(message: string, activeIp?: string, code?: string, details?: Record<string, unknown>);
}
/**
 * Erro de limite de requisições.
 * Ocorre quando o limite do plano foi atingido.
 */
declare class RateLimitError extends RadarDOUError {
    limit?: number;
    resetAt?: string;
    constructor(message: string, limit?: number, resetAt?: string, code?: string, details?: Record<string, unknown>);
}
/**
 * Erro genérico da API.
 */
declare class APIError extends RadarDOUError {
    statusCode?: number;
    constructor(message: string, statusCode?: number, code?: string, details?: Record<string, unknown>);
}

export { APIError, type Alert, AuthenticationError, type CreateAlertParams, type DeviceInfo, type Publication, RadarDOU, type RadarDOUConfig, RadarDOUError, RateLimitError, type SearchParams, type SearchResult, SessionConflictError, type SessionInfo };
