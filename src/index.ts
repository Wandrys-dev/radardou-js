/**
 * RadarDOU SDK - Cliente JavaScript/TypeScript para a API do Radar DOU
 *
 * @example
 * ```typescript
 * import { RadarDOU } from '@radardou/sdk';
 *
 * const client = new RadarDOU({ apiKey: process.env.RADAR_API_KEY! });
 * const resultado = await client.buscar({ dateFrom: '2026-05-01', limit: 10 });
 * await client.close();
 * ```
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
  SessionInfo,
  DeviceInfo
} from './types';
