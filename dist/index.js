"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  APIError: () => APIError,
  AuthenticationError: () => AuthenticationError,
  RadarDOU: () => RadarDOU,
  RadarDOUError: () => RadarDOUError,
  RateLimitError: () => RateLimitError,
  SessionConflictError: () => SessionConflictError
});
module.exports = __toCommonJS(index_exports);

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
var import_crypto = require("crypto");
var import_os = require("os");
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
      (0, import_os.hostname)(),
      (0, import_os.platform)(),
      (0, import_os.arch)(),
      (0, import_os.release)(),
      (0, import_crypto.randomBytes)(8).toString("hex")
      // Adiciona componente único por instalação
    ];
    const fingerprintString = components.join("|");
    return (0, import_crypto.createHash)("sha256").update(fingerprintString).digest("hex").substring(0, 32);
  }
  /**
   * Obtém informações do dispositivo
   */
  getDeviceInfo() {
    return {
      hostname: (0, import_os.hostname)(),
      os: (0, import_os.platform)(),
      osVersion: (0, import_os.release)(),
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
var DEFAULT_BASE_URL = "https://www.radar-dou.com/api/v1";
var DEFAULT_TIMEOUT = 3e4;
var SDK_VERSION2 = "1.0.1";
var RadarDOU = class {
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
  constructor(config) {
    if (!config.apiKey) {
      throw new AuthenticationError(
        "API Key e obrigatoria. Obtenha em https://www.radar-dou.com/api-keys",
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
  async initSession() {
    try {
      await this.sessionManager.startSession();
    } catch (error) {
      if (error instanceof SessionConflictError) {
        throw error;
      }
    }
  }
  async _request(method, endpoint, body, params) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== void 0 && value !== null) {
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
      const data = await response.json().catch(() => ({ error: "Erro desconhecido" }));
      if (response.ok) {
        return data;
      }
      return this.handleError(response.status, data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new APIError("Timeout na requisicao", void 0, "TIMEOUT");
      }
      if (error instanceof RadarDOUError) {
        throw error;
      }
      throw new APIError(
        error.message || "Erro de conexao",
        void 0,
        "CONNECTION_ERROR"
      );
    }
  }
  handleError(status, data) {
    const message = data.error || data.message || "Erro desconhecido";
    const code = data.code || "UNKNOWN_ERROR";
    const details = data.details;
    if (status === 400) {
      throw new APIError(message, 400, code, details);
    }
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
  async buscar(params) {
    if (!params.query && !params.dateFrom && !params.dateTo && !params.secao && !params.tipo) {
      throw new APIError(
        "Pelo menos um filtro e obrigatorio: query, dateFrom, dateTo, secao ou tipo.",
        400,
        "FILTER_REQUIRED"
      );
    }
    return this._request("GET", "/publications", void 0, {
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
  async obterPublicacao(id) {
    return this._request("GET", `/publications/${id}`);
  }
  // ========================================
  // Alertas
  // ========================================
  /**
   * Lista alertas configurados pelo usuario.
   */
  async listarAlertas(opts) {
    return this._request("GET", "/alerts", void 0, {
      page: opts?.page || 1,
      limit: Math.min(opts?.limit || 20, 100),
      active: opts?.activeOnly ? "true" : void 0
    });
  }
  /**
   * Cria um novo alerta.
   */
  async criarAlerta(params) {
    return this._request("POST", "/alerts", {
      name: params.name,
      searchCriteria: params.searchCriteria,
      description: params.description,
      frequency: params.frequency || "daily",
      emailNotification: params.emailNotification ?? true,
      soundAlert: params.soundAlert ?? false
    });
  }
  // ========================================
  // Favoritos, Colecoes, Vocabulario
  // ========================================
  async listarFavoritos(opts) {
    return this._request("GET", "/favorites", void 0, {
      page: opts?.page || 1,
      limit: Math.min(opts?.limit || 20, 100)
    });
  }
  async adicionarFavorito(publicationId, notes) {
    return this._request("POST", "/favorites", { publicationId, notes });
  }
  async removerFavorito(publicationId) {
    return this._request("DELETE", "/favorites", void 0, { publicationId });
  }
  async listarColecoes() {
    return this._request("GET", "/collections");
  }
  async criarColecao(name, description) {
    return this._request("POST", "/collections", { name, description });
  }
  async vocabulario() {
    return this._request("GET", "/vocabulary");
  }
  // ========================================
  // Sessao
  // ========================================
  async validarSessao() {
    return this.sessionManager.validateSession();
  }
  async close() {
    await this.sessionManager.endSession();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APIError,
  AuthenticationError,
  RadarDOU,
  RadarDOUError,
  RateLimitError,
  SessionConflictError
});
