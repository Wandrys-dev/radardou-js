// src/errors.ts
var RadarDOUError = class extends Error {
  constructor(message, code = "UNKNOWN_ERROR", details) {
    super(message);
    this.name = "RadarDOUError";
    this.code = code;
    this.details = details;
  }
};
var AuthenticationError = class extends RadarDOUError {
  constructor(message, code = "AUTH_ERROR", details) {
    super(message, code, details);
    this.name = "AuthenticationError";
  }
};
var SessionConflictError = class extends RadarDOUError {
  constructor(message, activeIp, code = "SESSION_CONFLICT", details) {
    super(message, code, details);
    this.name = "SessionConflictError";
    this.activeIp = activeIp;
  }
};
var RateLimitError = class extends RadarDOUError {
  constructor(message, limit, resetAt, code = "RATE_LIMIT", details) {
    super(message, code, details);
    this.name = "RateLimitError";
    this.limit = limit;
    this.resetAt = resetAt;
  }
};
var APIError = class extends RadarDOUError {
  constructor(message, statusCode, code = "API_ERROR", details) {
    super(message, code, details);
    this.name = "APIError";
    this.statusCode = statusCode;
  }
};

// src/session.ts
import { createHash, randomBytes } from "crypto";
import { hostname, platform, release, arch } from "os";
var SDK_VERSION = "1.0.0";
var SessionManager = class {
  // 30 segundos
  constructor(client) {
    this.sessionId = null;
    this.deviceFingerprint = null;
    this.heartbeatInterval = null;
    this.heartbeatIntervalMs = 3e4;
    this.client = client;
  }
  /**
   * Gera um fingerprint único do dispositivo
   */
  generateDeviceFingerprint() {
    const components = [
      hostname(),
      platform(),
      arch(),
      release(),
      randomBytes(8).toString("hex")
      // Adiciona componente único por instalação
    ];
    const fingerprintString = components.join("|");
    return createHash("sha256").update(fingerprintString).digest("hex").substring(0, 32);
  }
  /**
   * Obtém informações do dispositivo
   */
  getDeviceInfo() {
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
  async startSession() {
    this.deviceFingerprint = this.generateDeviceFingerprint();
    const response = await this.client._request("POST", "/session/start", {
      device_fingerprint: this.deviceFingerprint,
      device_info: this.getDeviceInfo()
    });
    this.sessionId = response.session_id;
    this.heartbeatIntervalMs = (response.heartbeat_interval || 30) * 1e3;
    this.startHeartbeat();
    return response;
  }
  /**
   * Valida se a sessão atual é válida
   */
  async validateSession() {
    if (!this.sessionId || !this.deviceFingerprint) {
      return false;
    }
    try {
      const response = await this.client._request("POST", "/session/validate", {
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
  async endSession() {
    this.stopHeartbeat();
    if (this.sessionId) {
      try {
        await this.client._request("POST", "/session/end", {
          session_id: this.sessionId
        });
      } catch {
      }
      this.sessionId = null;
    }
  }
  /**
   * Inicia o heartbeat para manter a sessão ativa
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      return;
    }
    this.heartbeatInterval = setInterval(async () => {
      if (!this.sessionId || !this.deviceFingerprint) {
        this.stopHeartbeat();
        return;
      }
      try {
        await this.client._request("POST", "/session/heartbeat", {
          session_id: this.sessionId,
          device_fingerprint: this.deviceFingerprint
        });
      } catch {
      }
    }, this.heartbeatIntervalMs);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }
  /**
   * Para o heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  /**
   * Retorna o ID da sessão atual
   */
  getSessionId() {
    return this.sessionId;
  }
  /**
   * Verifica se há uma sessão ativa
   */
  isActive() {
    return this.sessionId !== null;
  }
};

// src/client.ts
var DEFAULT_BASE_URL = "https://api.radar-dou.com/v1";
var DEFAULT_TIMEOUT = 3e4;
var SDK_VERSION2 = "1.0.0";
var RadarDOU = class {
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
  constructor(config) {
    if (!config.apiKey) {
      throw new AuthenticationError(
        "API Key \xE9 obrigat\xF3ria. Obtenha sua chave em https://radar-dou.com/api-keys",
        "API_KEY_REQUIRED"
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.sessionManager = new SessionManager(this);
    if (config.autoSession !== false) {
      this.initSession();
    }
  }
  /**
   * Inicializa a sessão (async)
   */
  async initSession() {
    try {
      await this.sessionManager.startSession();
    } catch (error) {
      if (error instanceof SessionConflictError) {
        throw error;
      }
    }
  }
  /**
   * Faz uma requisição para a API
   */
  async _request(method, endpoint, body, params) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== void 0) {
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
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `RadarDOU-JS/${SDK_VERSION2}`,
          "X-SDK-Version": SDK_VERSION2
        },
        body: body ? JSON.stringify(body) : void 0,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({ message: "Erro desconhecido" }));
      if (response.ok) {
        return data;
      }
      return this.handleError(response.status, data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new APIError("Timeout na requisi\xE7\xE3o", void 0, "TIMEOUT");
      }
      if (error instanceof RadarDOUError) {
        throw error;
      }
      throw new APIError(
        error.message || "Erro de conex\xE3o",
        void 0,
        "CONNECTION_ERROR"
      );
    }
  }
  /**
   * Trata erros da API
   */
  handleError(status, data) {
    const message = data.message || "Erro desconhecido";
    const code = data.code || "UNKNOWN_ERROR";
    const details = data.details;
    if (status === 401) {
      throw new AuthenticationError(message, code, details);
    }
    if (status === 403) {
      if (code === "SESSION_CONFLICT") {
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
  async buscar(params) {
    return this._request("GET", "/search", void 0, {
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
  async obterPublicacao(id) {
    return this._request("GET", `/publicacoes/${id}`);
  }
  /**
   * Lista edições do DOU.
   */
  async listarEdicoes(params) {
    return this._request("GET", "/edicoes", void 0, {
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
  async listarAlertas() {
    return this._request("GET", "/alertas");
  }
  /**
   * Cria um novo alerta de monitoramento.
   */
  async criarAlerta(params) {
    return this._request("POST", "/alertas", {
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
  async atualizarAlerta(id, params) {
    return this._request("PATCH", `/alertas/${id}`, params);
  }
  /**
   * Exclui um alerta.
   */
  async excluirAlerta(id) {
    return this._request("DELETE", `/alertas/${id}`);
  }
  // ========================================
  // Métodos de Conta e Uso
  // ========================================
  /**
   * Obtém informações de uso da API.
   */
  async obterUso() {
    return this._request("GET", "/uso");
  }
  /**
   * Obtém informações da conta.
   */
  async obterConta() {
    return this._request("GET", "/conta");
  }
  // ========================================
  // Gerenciamento de Sessão
  // ========================================
  /**
   * Valida se a sessão atual ainda é válida.
   */
  async validarSessao() {
    return this.sessionManager.validateSession();
  }
  /**
   * Encerra a sessão e libera recursos.
   * Deve ser chamado ao finalizar o uso do cliente.
   */
  async close() {
    await this.sessionManager.endSession();
  }
};
export {
  APIError,
  AuthenticationError,
  RadarDOU,
  RadarDOUError,
  RateLimitError,
  SessionConflictError
};
