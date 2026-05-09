/**
 * Tipos do SDK RadarDOU
 */

export interface RadarDOUConfig {
  /** Sua API Key de assinante */
  apiKey: string;
  /** URL base da API (padrao: https://www.radar-dou.com/api/v1) */
  baseUrl?: string;
  /** Timeout em milissegundos (padrao: 30000) */
  timeout?: number;
  /** Iniciar sessao automaticamente (padrao: true) */
  autoSession?: boolean;
}

export interface SearchParams {
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

export interface SearchResult {
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

export interface Publication {
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

export interface Alert {
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

export interface CreateAlertParams {
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
