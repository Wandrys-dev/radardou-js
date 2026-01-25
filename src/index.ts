/**
 * RadarDOU SDK - Cliente JavaScript/TypeScript para a API do Radar DOU
 * =====================================================================
 *
 * SDK oficial para integração com a API do Radar DOU.
 * Requer uma API Key válida de assinante para funcionamento.
 *
 * @example
 * ```typescript
 * import { RadarDOU } from '@radardou/sdk';
 *
 * const client = new RadarDOU({ apiKey: 'sua_api_key' });
 *
 * const resultado = await client.buscar({ termo: 'licitação' });
 * console.log(resultado);
 *
 * await client.close();
 * ```
 *
 * @packageDocumentation
 */

export { RadarDOU } from './client';
export {
  RadarDOUError,
  AuthenticationError,
  SessionConflictError,
  RateLimitError,
  APIError
} from './errors';
export type {
  RadarDOUConfig,
  SearchParams,
  SearchResult,
  Publication,
  Alert,
  CreateAlertParams,
  UsageInfo,
  AccountInfo,
  SessionInfo,
  DeviceInfo
} from './types';
