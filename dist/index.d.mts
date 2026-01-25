/**
 * Tipos do SDK RadarDOU
 */
interface RadarDOUConfig {
    /** Sua API Key de assinante */
    apiKey: string;
    /** URL base da API (padrão: https://api.radar-dou.com/v1) */
    baseUrl?: string;
    /** Timeout em milissegundos (padrão: 30000) */
    timeout?: number;
    /** Iniciar sessão automaticamente (padrão: true) */
    autoSession?: boolean;
}
interface SearchParams {
    /** Termo de busca */
    termo: string;
    /** Data inicial (YYYY-MM-DD) */
    dataInicio?: string;
    /** Data final (YYYY-MM-DD) */
    dataFim?: string;
    /** Filtrar por órgão */
    orgao?: string;
    /** Tipo de publicação */
    tipo?: string;
    /** Seção do DOU (1, 2 ou 3) */
    secao?: number;
    /** Número da página */
    pagina?: number;
    /** Quantidade por página (máx: 100) */
    limite?: number;
}
interface SearchResult {
    resultados: Publication[];
    total: number;
    pagina: number;
    total_paginas: number;
}
interface Publication {
    id: string;
    titulo: string;
    subtitulo?: string;
    texto_resumo?: string;
    texto_html?: string;
    data_publicacao: string;
    data_diario: string;
    secao_codigo: string;
    secao_descricao: string;
    edicao_numero: string;
    numero_pagina?: string;
    tipo_ato?: string;
    orgao_hierarquia?: string;
    link_ato?: string;
}
interface Alert {
    id: string;
    nome: string;
    termos: string[];
    orgaos?: string[];
    tipos?: string[];
    secoes?: number[];
    email_notificacao: boolean;
    ativo: boolean;
    created_at: string;
}
interface CreateAlertParams {
    /** Nome do alerta */
    nome: string;
    /** Termos para monitorar */
    termos: string[];
    /** Órgãos para filtrar */
    orgaos?: string[];
    /** Tipos de publicação */
    tipos?: string[];
    /** Seções do DOU */
    secoes?: number[];
    /** Receber notificação por email */
    emailNotificacao?: boolean;
}
interface UsageInfo {
    requisicoes_hoje: number;
    requisicoes_mes: number;
    limite_hora: number;
    limite_mes: number;
    plano: string;
}
interface AccountInfo {
    id: string;
    email: string;
    nome: string;
    plano: string;
    status: string;
    max_sessoes: number;
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
    constructor(config: RadarDOUConfig);
    /**
     * Inicializa a sessão (async)
     */
    private initSession;
    /**
     * Faz uma requisição para a API
     */
    _request<T = any>(method: string, endpoint: string, body?: Record<string, unknown>, params?: Record<string, string | number | undefined>): Promise<T>;
    /**
     * Trata erros da API
     */
    private handleError;
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
    buscar(params: SearchParams): Promise<SearchResult>;
    /**
     * Obtém detalhes de uma publicação específica.
     */
    obterPublicacao(id: string): Promise<Publication>;
    /**
     * Lista edições do DOU.
     */
    listarEdicoes(params?: {
        data?: string;
        secao?: number;
        pagina?: number;
        limite?: number;
    }): Promise<{
        edicoes: any[];
        total: number;
    }>;
    /**
     * Lista todos os alertas configurados.
     */
    listarAlertas(): Promise<{
        alertas: Alert[];
    }>;
    /**
     * Cria um novo alerta de monitoramento.
     */
    criarAlerta(params: CreateAlertParams): Promise<Alert>;
    /**
     * Atualiza um alerta existente.
     */
    atualizarAlerta(id: string, params: Partial<CreateAlertParams>): Promise<Alert>;
    /**
     * Exclui um alerta.
     */
    excluirAlerta(id: string): Promise<{
        success: boolean;
    }>;
    /**
     * Obtém informações de uso da API.
     */
    obterUso(): Promise<UsageInfo>;
    /**
     * Obtém informações da conta.
     */
    obterConta(): Promise<AccountInfo>;
    /**
     * Valida se a sessão atual ainda é válida.
     */
    validarSessao(): Promise<boolean>;
    /**
     * Encerra a sessão e libera recursos.
     * Deve ser chamado ao finalizar o uso do cliente.
     */
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

export { APIError, type AccountInfo, type Alert, AuthenticationError, type CreateAlertParams, type DeviceInfo, type Publication, RadarDOU, type RadarDOUConfig, RadarDOUError, RateLimitError, type SearchParams, type SearchResult, SessionConflictError, type SessionInfo, type UsageInfo };
