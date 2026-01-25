/**
 * Tipos do SDK RadarDOU
 */

export interface RadarDOUConfig {
  /** Sua API Key de assinante */
  apiKey: string;
  /** URL base da API (padrão: https://api.radar-dou.com/v1) */
  baseUrl?: string;
  /** Timeout em milissegundos (padrão: 30000) */
  timeout?: number;
  /** Iniciar sessão automaticamente (padrão: true) */
  autoSession?: boolean;
}

export interface SearchParams {
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

export interface SearchResult {
  resultados: Publication[];
  total: number;
  pagina: number;
  total_paginas: number;
}

export interface Publication {
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

export interface Alert {
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

export interface CreateAlertParams {
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

export interface UsageInfo {
  requisicoes_hoje: number;
  requisicoes_mes: number;
  limite_hora: number;
  limite_mes: number;
  plano: string;
}

export interface AccountInfo {
  id: string;
  email: string;
  nome: string;
  plano: string;
  status: string;
  max_sessoes: number;
}

export interface SessionInfo {
  session_id: string;
  expires_at: string;
  heartbeat_interval: number;
}

export interface DeviceInfo {
  hostname?: string;
  os?: string;
  osVersion?: string;
  nodeVersion?: string;
  sdkVersion?: string;
}

export interface APIError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
  status?: number;
}
