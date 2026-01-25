/**
 * Gerenciamento de sessão e validação de IP.
 */

import { createHash, randomBytes } from 'crypto';
import { hostname, platform, release, arch } from 'os';
import type { SessionInfo, DeviceInfo } from './types';

const SDK_VERSION = '1.0.0';

export class SessionManager {
  private client: any;
  private sessionId: string | null = null;
  private deviceFingerprint: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatIntervalMs = 30000; // 30 segundos

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Gera um fingerprint único do dispositivo
   */
  private generateDeviceFingerprint(): string {
    const components = [
      hostname(),
      platform(),
      arch(),
      release(),
      randomBytes(8).toString('hex') // Adiciona componente único por instalação
    ];

    const fingerprintString = components.join('|');
    return createHash('sha256').update(fingerprintString).digest('hex').substring(0, 32);
  }

  /**
   * Obtém informações do dispositivo
   */
  private getDeviceInfo(): DeviceInfo {
    return {
      hostname: hostname(),
      os: platform(),
      osVersion: release(),
      nodeVersion: process.version,
      sdkVersion: SDK_VERSION
    };
  }

  /**
   * Inicia uma nova sessão
   */
  async startSession(): Promise<SessionInfo> {
    this.deviceFingerprint = this.generateDeviceFingerprint();

    const response = await this.client._request('POST', '/session/start', {
      device_fingerprint: this.deviceFingerprint,
      device_info: this.getDeviceInfo()
    });

    this.sessionId = response.session_id;
    this.heartbeatIntervalMs = (response.heartbeat_interval || 30) * 1000;

    this.startHeartbeat();

    return response;
  }

  /**
   * Valida se a sessão atual é válida
   */
  async validateSession(): Promise<boolean> {
    if (!this.sessionId || !this.deviceFingerprint) {
      return false;
    }

    try {
      const response = await this.client._request('POST', '/session/validate', {
        session_id: this.sessionId,
        device_fingerprint: this.deviceFingerprint
      });

      return response.valid === true;
    } catch {
      return false;
    }
  }

  /**
   * Encerra a sessão atual
   */
  async endSession(): Promise<void> {
    this.stopHeartbeat();

    if (this.sessionId) {
      try {
        await this.client._request('POST', '/session/end', {
          session_id: this.sessionId
        });
      } catch {
        // Ignora erros ao encerrar
      }

      this.sessionId = null;
    }
  }

  /**
   * Inicia o heartbeat para manter a sessão ativa
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(async () => {
      if (!this.sessionId || !this.deviceFingerprint) {
        this.stopHeartbeat();
        return;
      }

      try {
        await this.client._request('POST', '/session/heartbeat', {
          session_id: this.sessionId,
          device_fingerprint: this.deviceFingerprint
        });
      } catch {
        // Se falhar, a próxima requisição tentará reconectar
      }
    }, this.heartbeatIntervalMs);

    // Permite que o processo termine mesmo com o interval ativo
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Para o heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Retorna o ID da sessão atual
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Verifica se há uma sessão ativa
   */
  isActive(): boolean {
    return this.sessionId !== null;
  }
}
