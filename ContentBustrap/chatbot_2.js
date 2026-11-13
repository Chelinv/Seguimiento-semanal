"use strict";
(function () {
  if (window.__STELA_WIDGET_INITIALIZED__) return;
  window.__STELA_WIDGET_INITIALIZED__ = true;

  const divCargarData = document.getElementById(
    "contenedorPrincipalAsistenteVirtual",
  );
  const ds = divCargarData && divCargarData.dataset ? divCargarData.dataset : {};

  window.STELA_CONTEXT = window.STELA_CONTEXT || {
    identificacion: "",
    tipoDispositivo: "",
    nombreUsuario: "",
  };

  var GENESYS_CONFIG = {
    environment: "",
    deploymentId: "",
  };

  const identificacion = (ds.identificacion || "").trim();
  const nombre = (ds.nombre || "").trim();
  const env = (ds.env || "").trim();
  const deploymentId = (ds.id || "").trim();
  const canal = (ds.canal || "").trim();
  const imagen = (ds.imagen || "").trim();
  const genesysUrl = (ds.genesys || "").trim();
  const loader = (ds.loader || "").trim();

  window.STELA_CONTEXT.identificacion =
    identificacion || window.STELA_CONTEXT.identificacion || "";
  window.STELA_CONTEXT.tipoDispositivo =
    canal ||
    window.STELA_CONTEXT.tipoDispositivo ||
    (/Mobi/i.test(navigator.userAgent) ? "BM" : "IN");
  window.STELA_CONTEXT.nombreUsuario =
    nombre || window.STELA_CONTEXT.nombreUsuario || "";

  GENESYS_CONFIG.environment = env || "prod";
  GENESYS_CONFIG.deploymentId = deploymentId;

  if (divCargarData && divCargarData.remove) divCargarData.remove();

  const DEBUG_MODE = false;
  
  var GEO_ACTIVATION_KEYWORDS = [
    "__SOLICITAR_UBICACION__",
    "activar_ubicacion",
  ];

  window.STELA_CONVERSATION_ID = null;

  var UUID_CAPTURE =
    "([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";

  function registerConversationIdFromText(foundId) {
    if (!foundId) return;
    var changed = window.STELA_CONVERSATION_ID !== foundId;
    window.STELA_CONVERSATION_ID = foundId;
    if (window.STELA_CONTEXT) {
      window.STELA_CONTEXT.conversationId = foundId;
    }
  }

  /** Quita el UUID de conversación del texto mostrado; guarda el id en STELA_CONTEXT. */
  function extractConversationId(text) {
    if (text == null) return text;
    var t = String(text);
    if (!t) return t;

    var pipeRe = new RegExp("\\|\\s*" + UUID_CAPTURE);
    var m;
    while ((m = t.match(pipeRe))) {
      registerConversationIdFromText(m[1]);
      t = t.replace(m[0], "").trim();
    }

    var onlyId = t.match(new RegExp("^\\s*\\|?\\s*" + UUID_CAPTURE + "\\s*$"));
    if (onlyId) {
      registerConversationIdFromText(onlyId[1]);
      return "";
    }

    var tail = t.match(
      new RegExp(
        "^([\\s\\S]+?)(?:\\s{2,}|\\s*\\|\\s*|\\s*,\\s*)" +
          UUID_CAPTURE +
          "\\s*$",
      ),
    );
    if (tail && String(tail[1]).trim()) {
      registerConversationIdFromText(tail[2]);
      t = String(tail[1]).trim();
    }

    return t;
  }
  
  function extractStructuredMenuHints(text) {
    var t = String(text || "");
    var menuEmergencia = false;
    var re = /\|\s*menu_emergencia\s*$/i;
    if (re.test(t)) {
      menuEmergencia = true;
      t = t.replace(re, "").trim();
    }
    return { text: t, menuEmergencia: menuEmergencia };
  }

  function captureConversationIdFromInbound(m) {
    if (!m) return;
    try {
      var texts = [];
      function pushStr(s) {
        if (s && typeof s === "string" && s.indexOf("|") !== -1) texts.push(s);
      }
      pushStr(m.text);
      if (typeof m.message === "string") pushStr(m.message);
      var b = m.body;
      if (b) {
        if (typeof b === "string") pushStr(b);
        else {
          pushStr(b.text);
          var arr = b.content;
          if (Array.isArray(arr)) {
            for (var i = 0; i < arr.length; i++) {
              var it = arr[i];
              if (!it) continue;
              pushStr(it.text);
              if (it.quickReply) {
                pushStr(it.quickReply.text);
                pushStr(it.quickReply.payload);
              }
            }
          }
        }
      }
      if (Array.isArray(m.content)) {
        for (var j = 0; j < m.content.length; j++) {
          var it2 = m.content[j];
          if (it2 && it2.text) pushStr(it2.text);
        }
      }
      for (var k = 0; k < texts.length; k++) {
        extractConversationId(texts[k]);
      }
    } catch (_) {}
  }

  window.addEventListener("error", function (e) {
    
  });

  window.addEventListener("unhandledrejection", function (e) {
    
  });

  document.addEventListener("DOMContentLoaded", function () {
    if (!DEBUG_MODE) {
      var panel = document.getElementById("debug-panel");
      if (panel) panel.style.display = "none";
    }
  });

  function debugLog(msg, type) {
    if (!DEBUG_MODE) return;
    var t = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    var elLog = document.getElementById("debug-log");
    if (elLog) {
      var row = document.createElement("div");
      row.className = "row " + (type || "info");
      row.textContent = "[" + t + "] " + msg;
      elLog.appendChild(row);
      elLog.scrollTop = elLog.scrollHeight;
    }
  }

  function safeJson(v) {
    try {
      return JSON.stringify(v, null, 2);
    } catch (e) {
      return String(v);
    }
  }

  (function ensureStableIdentificacion() {
    var ctx = window.STELA_CONTEXT || {};
    var current = String(ctx.identificacion || "").trim();

    if (!current) {
      throw new Error("STELA_WIDGET_IDENTIFICACION_REQUIRED");
    }

    window.STELA_CONTEXT = ctx;
  })();

  function validateRequired() {
    var ctx = window.STELA_CONTEXT || {};
    var missing = [];
    if (!ctx.identificacion) missing.push("identificacion");
    if (!ctx.tipoDispositivo) missing.push("tipoDispositivo");
    if (!ctx.nombreUsuario) missing.push("nombreUsuario");
    if (missing.length) {
      return { ok: false, missing: missing };
    }
    return { ok: true, missing: [] };
  }

  var LS_SESION_PHASE = "stela_session_phase_v1";

  function getSesionSteleBootFlag() {
    try {
      var val = localStorage.getItem("SesionStela");
      if (val === null) return false;
      return val === "true";
    } catch (_) {
      return true;
    }
  }
  
  function isGeoActivationKeyword(text) {
    var raw = String(text || "").trim();
    if (!raw) return false;
    var norm = normalizeTextForDedup(raw);
    for (var i = 0; i < GEO_ACTIVATION_KEYWORDS.length; i++) {
      var kwRaw = String(GEO_ACTIVATION_KEYWORDS[i] || "").trim();
      if (!kwRaw) continue;
      if (raw === kwRaw) return true;
      if (norm === normalizeTextForDedup(kwRaw)) return true;
    }
    return false;
  }

  function getSesionPhase() {
    try {
      return String(localStorage.getItem(LS_SESION_PHASE) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function setSesionPhase(val) {
    try {
      var phase = String(val || "").trim();
      if (phase) localStorage.setItem(LS_SESION_PHASE, phase);
      else localStorage.removeItem(LS_SESION_PHASE);
    } catch (_) {}
  }

  function isSesionEndedPersisted() {
    return getSesionPhase() === "ended";
  }

  var hadSesionStelaOnBoot = getSesionSteleBootFlag();
  var hadEndedSessionOnBoot = isSesionEndedPersisted();
  var hadClosedSessionOnBoot = hadSesionStelaOnBoot || hadEndedSessionOnBoot;

  var ENV_HOSTS = {
    prod: "apps.mypurecloud.com",
    "prod-euw1": "apps.mypurecloud.ie",
    "prod-apse2": "apps.mypurecloud.com.au",
    "prod-apne1": "apps.mypurecloud.jp",
    "prod-sae1": "apps.mypurecloud.com",
    "prod-cac1": "apps.cac1.pure.cloud",
    "prod-euc1": "apps.mypurecloud.de",
  };

  var bootstrapHost =
    ENV_HOSTS[GENESYS_CONFIG.environment] || "apps.mypurecloud.com";
  var bootstrapUrl = genesysUrl;

  function clearGenesysDeploymentSessionCache() {
    try {
      var depKey = "_" + GENESYS_CONFIG.deploymentId;
      localStorage.removeItem(depKey);
      sessionStorage.removeItem(depKey);
    } catch (_) {}
  }

  if (hadClosedSessionOnBoot) {
    clearGenesysDeploymentSessionCache();
  }

  var _genesysWs = null;
  var _genesysToken = null;
  (function () {
    var origSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      try {
        if (typeof data === "string" && data.charAt(0) === "{") {
          var parsed = JSON.parse(data);
          if (parsed && parsed.token) {
            _genesysWs = this;
            _genesysToken = parsed.token;
          }
        }
      } catch (_) {}
      return origSend.call(this, data);
    };
  })();

  (function (g, e, n, conf) {
    var BOOT_SCRIPT_ID = "stela-genesys-bootstrap-sdk";
    g._genesysJs = e;
    g[e] =
      g[e] ||
      function () {
        (g[e].q = g[e].q || []).push(arguments);
      };
    g[e].t = 1 * new Date();
    g[e].c = conf;
    var alreadyInjected =
      document.getElementById(BOOT_SCRIPT_ID) ||
      Array.prototype.some.call(
        document.querySelectorAll("script[src]"),
        function (node) {
          var u = node.src || "";
          return u.indexOf("genesys-bootstrap/genesys.min.js") !== -1;
        },
      );
    if (alreadyInjected) {
      if (window.__genesysLoaded) {
        window.dispatchEvent(new Event("genesys:loaded"));
      }
      return;
    }
    var s = document.createElement("script");
    s.id = BOOT_SCRIPT_ID;
    s.async = 1;
    s.src = n;
    s.charset = "utf-8";
    s.onload = function () {
      window.__genesysLoaded = true;
      window.dispatchEvent(new Event("genesys:loaded"));
    };
    s.onerror = function () {
      window.__genesysError = true;
      window.dispatchEvent(new Event("genesys:error"));
    };
    document.head.appendChild(s);
  })(window, "Genesys", bootstrapUrl, {
    environment: GENESYS_CONFIG.environment,
    deploymentId: GENESYS_CONFIG.deploymentId,
  });

  var state = {
    subscribed: false,
    messengerReady: false,
    messagingReady: false,
    usingNativeUI: false,
    connecting: false,
    sessionActive: false,
    sessionEnded: false,
    unread: 0,
    seenIds: new Set(),
    lastSent: { text: "", ts: 0 },
    pendingUploads: [],
    lastCloseInbound: { text: "", ts: 0 },
    lastCloseSystem: { text: "", ts: 0 },
    lastCloseEvent: { text: "", ts: 0 },
    hiddenOutboundMap: Object.create(null),
    geoFlowInProgress: false,
    lastHiddenGeo: { value: "", ts: 0 },
    qrAccumulator: [],
    qrAccumulating: false,
    qrTextBubble: null,
    device: { latitud: null, longitud: null },
    restoredOnce: false,
    isRestoring: false,
    resetting: false,
    suppressRestoredUntil: 0,
    isFreshStart: false,
    greetingSent: false,
    suppressNextIncoming: false,
    launcherDrag: {
      active: false,
      moved: false,
      suppressClick: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      left: null,
      top: null,
    },
    attrsLastSig: "",
    attrsLastTs: 0,
    lastClientActivityTs: Date.now(),
    keepAliveTimer: 0,
    restartSendInFlight: false,
    awaitGenesysMessageForOverlay: false,
    awaitGenesysOverlayTimer: 0,
    humanAgentFarewellShown: false,
    lastVirtualAssistantClosureTs: 0,
    lastHumanAgentSignalTs: 0,
    pendingInitialMenuSelection: null,
    pendingInitialMenuSelectionTimer: 0,
    pageUnloading: false,
    pendingRestartMessage: null,
  };

  var _resolveStelaBootSessionValidated = null;
  var stelaBootSessionValidatedP = new Promise(function (resolve) {
    _resolveStelaBootSessionValidated = resolve;
  });

  var LS_SESION_FLAG = "SesionStela";

  function getSesionStele() {
    try {
      var val = localStorage.getItem(LS_SESION_FLAG);
      if (val === null) return false;
      return val === "true";
    } catch (_) {
      return true;
    }
  }

  function setSesionStele(val) {
    try {
      localStorage.setItem(LS_SESION_FLAG, val ? "true" : "false");
    } catch (_) {}
  }

  function shouldSuppressReconnect() {
    if (state.resetting) return true;
    if (state.suppressRestoredUntil && Date.now() < state.suppressRestoredUntil)
      return true;
    return false;
  }

  var KEEPALIVE_ENABLED = false;
  var KEEPALIVE_TEXT = "__stela_keepalive__";
  var KEEPALIVE_INTERVAL_MS = 60000;
  var KEEPALIVE_IDLE_MS = 45000;

  function touchClientActivity() {
    state.lastClientActivityTs = Date.now();
  }

  function stopKeepAliveSignal() {
    if (!state.keepAliveTimer) return;
    clearInterval(state.keepAliveTimer);
    state.keepAliveTimer = 0;
  }

  async function maybeSendKeepAliveSignal() {
    if (!KEEPALIVE_ENABLED) return false;
    if (!state.messagingReady || !state.sessionActive || state.sessionEnded)
      return false;
    if (state.resetting || state.connecting || state.geoFlowInProgress)
      return false;
    if (
      typeof document !== "undefined" &&
      document.visibilityState &&
      document.visibilityState !== "visible"
    ) {
      return false;
    }
    if (Date.now() - state.lastClientActivityTs < KEEPALIVE_IDLE_MS)
      return false;
    var ok = await sendHiddenText(
      KEEPALIVE_TEXT,
      { hidden: true, source: "keepalive" },
      1,
    );
    if (ok) touchClientActivity();
    return ok;
  }

  function startKeepAliveSignal() {
    if (!KEEPALIVE_ENABLED) return;
    touchClientActivity();
    if (state.keepAliveTimer) return;
    state.keepAliveTimer = setInterval(function () {
      maybeSendKeepAliveSignal().catch(function () {});
    }, KEEPALIVE_INTERVAL_MS);
  }

  function normalizeQR(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function isMoreOption(text) {
    var n = normalizeQR(text);
    for (var i = 0; i < MORE_PATTERNS.length; i++) {
      if (n === MORE_PATTERNS[i]) return true;
    }
    return false;
  }
  function normalizeTextForDedup(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeMenuSelectionText(text) {
    return normalizeTextForDedup(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isClosureNotice(textOrNorm) {
    var t = normalizeTextForDedup(textOrNorm);
    if (!t) return false;
    return (
      t.indexOf("parece que no recibi respuesta") !== -1 ||
      t.indexOf("cerrare esta conversacion por seguridad") !== -1 ||
      t.indexOf("cerrar esta conversacion por seguridad") !== -1 ||
      t.indexOf("finalizo la conversacion") !== -1 ||
      t.indexOf("la conversacion ha finalizado") !== -1 ||
      t.indexOf("cerro la conversacion") !== -1 ||
      t.indexOf("sesion cerrada") !== -1
    );
  }

  /** Texto del saludo inicial con menú principal (no despedidas ni otros mensajes del bot). */
  function isStelaInitialMenuPromptText(text) {
  var t = normalizeTextForDedup(text || "");
  if (!t) return false;
  if (t.indexOf("soy stela") === -1) return false;
 
  if (
    (t.indexOf("elige") !== -1 || t.indexOf("elegir") !== -1) &&
    t.indexOf("opcion") !== -1
  ) {
    return true;
  }
 
  return false;
}

  /** Cierre por inactividad / seguridad enviado por el asistente (Architect), no por agente ACD. */
  function isVirtualAssistantSecurityClosure(textOrNorm) {
    var t = normalizeTextForDedup(textOrNorm);
    if (!t) return false;
    if (t.indexOf("parece que no recibi respuesta") !== -1) return true;
    if (t.indexOf("por seguridad") !== -1) {
      if (
        t.indexOf("cerrare") !== -1 ||
        t.indexOf("cerrar") !== -1 ||
        t.indexOf("conversacion") !== -1
      )
        return true;
    }
    return false;
  }

  function noteVirtualAssistantSecurityClosureFromText(text) {
    if (!isVirtualAssistantSecurityClosure(text)) return;
    state.lastVirtualAssistantClosureTs = Date.now();
  }

  function shouldSkipRepeatedClosureText(text, bucketKey, windowMs) {
    var norm = normalizeTextForDedup(text);
    if (!isClosureNotice(norm)) return false;
    var now = Date.now();
    var last = state[bucketKey] || { text: "", ts: 0 };
    if (last.text === norm && now - last.ts < (windowMs || 60000)) {
      return true;
    }
    state[bucketKey] = { text: norm, ts: now };
    return false;
  }
  function shouldSkipClosureEvent(reason, windowMs) {
    var msg = String(reason || "El agente cerro la conversacion.").trim();
    return shouldSkipRepeatedClosureText(
      msg,
      "lastCloseEvent",
      windowMs || 120000,
    );
  }
  function isConnectionRequiredNotice(text) {
    var t = normalizeTextForDedup(text);
    if (!t) return false;
    return (
      t.indexOf("conexion requerida") !== -1 ||
      t.indexOf("se requiere conexion") !== -1 ||
      t.indexOf("se requiere una conexion") !== -1 ||
      t.indexOf("requiere conexion") !== -1 ||
      t.indexOf("connection required") !== -1 ||
      t.indexOf("required connection") !== -1
    );
  }
  function isCarouselPromptNotice(text) {
    var t = normalizeTextForDedup(text);
    if (!t) return false;
    if (t.length > 55) return false;
    var plain = t.replace(/[\u00BF?]/g, "").trim();
    return (
      plain === "que le gustaria hacer" ||
      (plain.indexOf("le gustar") !== -1 && plain.indexOf("hacer") !== -1)
    );
  }

  /** Texto del menú inicial de Architect / Stela: no quitar el overlay de carga con saludos previos. */
  function isLikelyMainMenuPromptText(text) {
    if (!text) return false;
    if (isCarouselPromptNotice(text)) return true;
    var t = normalizeTextForDedup(text);
    if (!t) return false;
    if (t.indexOf("menu principal") !== -1 || t.indexOf("men principal") !== -1)
      return true;
    if (t.indexOf("elige") !== -1 && t.indexOf("opcion") !== -1) return true;
    if (t.indexOf("elegi") !== -1 && t.indexOf("opcion") !== -1) return true;
    if (t.indexOf("siguientes opciones") !== -1) return true;
    if (t.indexOf("por favor elija") !== -1) return true;
    if (t.indexOf("que desea") !== -1 && t.indexOf("hacer") !== -1) return true;
    return false;
  }
  function isRestartConversationCommand(text) {
    var t = normalizeTextForDedup(text);
    if (!t) return false;
    return (
      t === "iniciar una nueva conversacion" ||
      t === "iniciar nueva conversacion" ||
      t === "nueva conversacion" ||
      t === "iniciar conversacion de nuevo"
    );
  }

  var el = {
    dotDemo: document.getElementById("dot-demo"),
    sdkStatus: document.getElementById("sdk-status"),
    launcher: document.getElementById("launcher"),
    badge: document.getElementById("badge"),
    win: document.getElementById("win"),
    close: document.getElementById("close"),
    sdot: document.getElementById("sdot"),
    stext: document.getElementById("stext"),
    sessionLoadingText: document.getElementById("session-loading-text"),
    msgs: document.getElementById("msgs"),
    typing: document.getElementById("typing"),
    input: document.getElementById("input"),
    text: document.getElementById("text"),
    send: document.getElementById("send"),
    attach: document.getElementById("attach"),
    file: document.getElementById("file"),
    foot: document.getElementById("foot"),
    end: document.getElementById("end"),
    ended: document.getElementById("ended"),
    endedReason: document.getElementById("ended-reason"),
    newchat: document.getElementById("newchat"),
    connBanner: document.getElementById("conn-banner"),
    sessionLoadingOverlay: document.getElementById("session-loading-overlay"),
    modehint: document.getElementById("modehint"),
  };

  /** El launcher nace con pointer-events:none; si Messenger.ready llega antes de subscribeOnce, nunca se desbloqueaba. */
  function unlockStelaLauncher() {
    if (!el.launcher) return;
    el.launcher.style.opacity = "1";
    el.launcher.style.pointerEvents = "auto";
    el.launcher.style.cursor = "pointer";
  }

  function showSessionLoadingOverlay() {
    if (el.sessionLoadingOverlay) {
      el.sessionLoadingOverlay.classList.add("show");
      el.sessionLoadingOverlay.setAttribute("aria-hidden", "false");
    }
  }
  function hideSessionLoadingOverlay() {
    if (el.sessionLoadingOverlay) {
      el.sessionLoadingOverlay.classList.remove("show");
      el.sessionLoadingOverlay.setAttribute("aria-hidden", "true");
    }
  }

  function clearAwaitGenesysOverlayTimer() {
    if (state.awaitGenesysOverlayTimer) {
      clearTimeout(state.awaitGenesysOverlayTimer);
      state.awaitGenesysOverlayTimer = 0;
    }
  }

  function clearAwaitGenesysOverlay() {
    if (!state.awaitGenesysMessageForOverlay) return;
    state.awaitGenesysMessageForOverlay = false;
    clearAwaitGenesysOverlayTimer();
    hideSessionLoadingOverlay();
  }

  /** Quita el GIF de carga aunque no estuviera el flag de espera Genesys (p. ej. UI local ya pintada). */
  function dismissSessionLoadingOverlayFully() {
    state.awaitGenesysMessageForOverlay = false;
    clearAwaitGenesysOverlayTimer();
    hideSessionLoadingOverlay();
  }

  function chatSurfaceHasVisibleContent() {
    if (!el.msgs) return false;
    return !!(
      el.msgs.querySelector(".msg") ||
      el.msgs.querySelector(".quick-replies") ||
      el.msgs.querySelector(".rich") ||
      el.msgs.querySelector(".r-image")
    );
  }

  function beginAwaitGenesysMessageForOverlay() {
    state.awaitGenesysMessageForOverlay = true;
    clearAwaitGenesysOverlayTimer();
    state.awaitGenesysOverlayTimer = setTimeout(function () {
      state.awaitGenesysOverlayTimer = 0;
      if (state.awaitGenesysMessageForOverlay) {
        state.awaitGenesysMessageForOverlay = false;
        hideSessionLoadingOverlay();
      }
    }, 45000);
  }

  function stopAwaitGenesysOverlay() {
    state.awaitGenesysMessageForOverlay = false;
    clearAwaitGenesysOverlayTimer();
    hideSessionLoadingOverlay();
  }

  function setSdkStatus(t, k) {
    if (el.sdkStatus) el.sdkStatus.textContent = t;
    if (el.dotDemo) el.dotDemo.className = "dot " + k;
  }

  function setStatusDot(k, t) {
    if (!el.sdot || !el.stext) return;
    el.sdot.className = "sdot " + k;
    if (k === "connected")
      el.stext.innerHTML = '<span class="online-dot"></span> En Linea';
    else el.stext.textContent = t || "";
  }

  function showConnBanner(type, text) {
    if (!el.connBanner) return;
    var msg = String(text || "");
    if (isConnectionRequiredNotice(msg)) return;
    el.connBanner.className = "conn-banner show " + type;
    el.connBanner.textContent = msg;
    if (type === "restored") {
      setTimeout(function () {
        if (el.connBanner) el.connBanner.classList.remove("show");
      }, 3000);
    }
  }

  function hideConnBanner() {
    if (el.connBanner) el.connBanner.classList.remove("show");
  }

  function showLoading(t) {
    if (el.sessionLoadingText) {
      el.sessionLoadingText.textContent = "";
    }
    showSessionLoadingOverlay();

    if (el.msgs) el.msgs.classList.remove("show");
    if (el.input) el.input.classList.remove("show");
    if (el.foot) el.foot.classList.remove("show");
  }

  function beginExternalCloseLoadingUI() {
    if (el.launcher) el.launcher.style.display = "none";
    if (el.win) el.win.classList.add("open");
    showSessionLoadingOverlay();
    if (el.sessionLoadingText) {
      el.sessionLoadingText.textContent = "Cargando...";
    }
    if (el.msgs) el.msgs.classList.remove("show");
    if (el.input) el.input.classList.remove("show");
    if (el.foot) el.foot.classList.remove("show");
  }

  function endExternalCloseLoadingUI() {
    dismissSessionLoadingOverlayFully();
    if (el.launcher) {
      el.launcher.style.opacity = "1";
      el.launcher.style.pointerEvents = "auto";
      el.launcher.style.display = "flex";
    }
    if (el.win) el.win.classList.remove("open");
  }

  function showChat() {
    if (el.msgs) el.msgs.classList.add("show");
    if (el.input) el.input.classList.add("show");
    if (el.foot) el.foot.classList.add("show");
 
    var restartBusy = !!state.restartSendInFlight;
    var endedSession = state.sessionEnded || isSesionEndedPersisted();
    var allowRestartTyping = endedSession && !restartBusy;
 
    var waitingSession = !state.sessionActive && !allowRestartTyping;
    if (waitingSession) {
      showSessionLoadingOverlay();
      if (el.sessionLoadingText)
        el.sessionLoadingText.textContent = "Cargando...";
    } else {
      hideSessionLoadingOverlay();
    }
 
    if (el.input) el.input.classList.toggle("disabled", restartBusy);
    if (el.text) el.text.disabled = restartBusy;
 
    if (el.attach) {
      el.attach.disabled =
        !state.messagingReady || !state.sessionActive || endedSession;
    }
 
    updateSend();
  }
 

  function scrollMessagesToBottom(retry) {
    if (!el.msgs) return;
    var run = function () {
      if (!el.msgs) return;
      var prevBehavior = el.msgs.style.scrollBehavior;
      el.msgs.style.scrollBehavior = "auto";
      el.msgs.scrollTop = el.msgs.scrollHeight;
      el.msgs.style.scrollBehavior = prevBehavior;
    };
    run();
    if (retry === true) setTimeout(run, 80);
  }

  function buildSesionStelaResetOpts(extra) {
    var opts = {
      alsoUI: true,
      genesys: true,
      restart: true,
    };
    if (extra && typeof extra === "object") {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) {
          opts[k] = extra[k];
        }
      }
    }
    return opts;
  }

  function triggerSesionStelaReset(extra) {
    if (!window.STELA_clearConversationStorage) return false;
    window.STELA_clearConversationStorage(buildSesionStelaResetOpts(extra));
    return true;
  }

  async function performBackgroundCleanup() {
    if (state.resetting) return;
    if (!getSesionStele()) return;
    state.resetting = true;

    if (el.launcher) {
      el.launcher.style.opacity = "0.5";
      el.launcher.style.pointerEvents = "none";
    }

    try {
      var closeRes = await closeGenesysConversation({
        ensureConversation: true,
        endWaitMs: 800,
        clearWaitMs: 800,
        confirmTimeoutMs: 4500,
      });
      if (!closeRes || !closeRes.confirmedRemote) {
        try {
        } catch (_) {}
      }

      var depKey = "_" + GENESYS_CONFIG.deploymentId;
      localStorage.removeItem(depKey);
      sessionStorage.removeItem(depKey);

      setSesionStele(false);
      state.sessionActive = false;
      state.sessionEnded = false;
      state.connecting = false;
      state.seenIds.clear();
      state.attrsLastSig = "";
      state.attrsLastTs = 0;

    } catch (e) {
      
    } finally {
      state.resetting = false;

      if (el.launcher) {
        el.launcher.style.opacity = "1";
        el.launcher.style.pointerEvents = "auto";
        el.launcher.style.cursor = "pointer";
      }
    }
  }

function openWin() {
    touchClientActivity();
 
    if (isSesionEndedPersisted()) {
      state.sessionEnded = true;
      state.sessionActive = false;
      state.connecting = false;
    }
 
    if (getSesionStele() && state.sessionActive) {
      setSesionStele(false);
    }
    if (getSesionStele() && !isSesionEndedPersisted()) {
      if (el.launcher) {
        el.launcher.style.opacity = "0.5";
        el.launcher.style.pointerEvents = "none";
      }
      triggerSesionStelaReset({ onWindowOpen: false });
      return;
    }
 
    if (el.launcher) el.launcher.style.display = "none";
    if (el.win) el.win.classList.add("open");
 
    showSessionLoadingOverlay();
    if (el.sessionLoadingText) {
      el.sessionLoadingText.textContent = "Cargando...";
    }
    state.unread = 0;
    updateBadge();
 
    if (!state.restoredOnce) {
      var empty = !el.msgs || el.msgs.childNodes.length === 0;
      if (empty) {
        var restored = false;
        if (window.STELA_restoreConversationFromStorage) {
          restored = window.STELA_restoreConversationFromStorage();
        }
        state.restoredOnce = !!restored;
      } else {
        state.restoredOnce = true;
      }
    }
 
    var hasHistory = el.msgs && el.msgs.childNodes.length > 0;
    var showGreetingNow =
      !state.greetingSent && !state.isRestoring && !hasHistory;
 
    if (
      !state.sessionActive &&
      !state.sessionEnded &&
      !isSesionEndedPersisted() &&
      !state.connecting &&
      !shouldSuppressReconnect()
    ) {
      if (state.messengerReady) {
        if (showGreetingNow) state.silentConnectForInitialOpen = true;
        startConversation();
      } else {
        showLoading("Iniciando chat...");
      }
    }
 
    if (showGreetingNow) {
      var ctx = window.STELA_CONTEXT || {};
      var nombre = ctx.nombreUsuario || "";
      var saludo =
        "Hola" +
        (nombre ? " " + nombre : "") +
        ", soy Stela, tu asistente virtual. Puedes escribir lo que necesitas o elegir una de estas opciones.";
      showChat();
      addBubble("in", saludo);
      state.greetingSent = true;
 
      var initialOptions = [
        {
          label: "🚨 Tengo una emergencia",
          value: "🚨 Tengo una emergencia",
        },
        {
          label: "💻 Quiero realizar una transacción",
          value: "💻 Quiero realizar una transacción",
        },
        {
          label: "📝 Información de productos",
          value: "📝 Información de productos",
        },
        {
          label: "📍 Necesito ubicarlos",
          value: "📍 Necesito ubicarlos",
        },
        {
          label: "❓ Preguntas frecuentes",
          value: "❓ Preguntas frecuentes",
        },
      ];
 
      var qrContainer = document.createElement("div");
      qrContainer.className = "quick-replies";
      for (var iq = 0; iq < initialOptions.length; iq++) {
        (function (opt) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "quick-reply-btn";
          btn.textContent = opt.label;
          btn.addEventListener("click", function () {
            handleInitialMenuSelection(opt, qrContainer);
          });
          qrContainer.appendChild(btn);
        })(initialOptions[iq]);
      }
      if (el.msgs) {
        el.msgs.appendChild(qrContainer);
        scrollMessagesToBottom(true);
      }
    } else if (hasHistory && el.msgs) {
      var tryAddMainMenuReplies = function () {
        if (!el.msgs || el.msgs.querySelector(".quick-replies")) return;
        var allMsgs = el.msgs.querySelectorAll(".msg");
        var lastMsg = allMsgs.length ? allMsgs[allMsgs.length - 1] : null;
        var lastIsFromBot =
          lastMsg && lastMsg.classList && lastMsg.classList.contains("in");
        if (!lastIsFromBot) return;
        var lastBubble = lastMsg.querySelector(".bubble");
        var lastBubbleText = lastBubble
          ? String(lastBubble.textContent || "").trim()
          : "";
        if (!isStelaInitialMenuPromptText(lastBubbleText)) return;
        if (isClosureNotice(lastBubbleText)) return;
        state.greetingSent = true;
        var initialOptionsRestore = [
          {
            label: "🚨 Tengo una emergencia",
            value: "🚨 Tengo una emergencia",
          },
          {
            label: "💻 Quiero realizar una transacción",
            value: "💻 Quiero realizar una transacción",
          },
          {
            label: "📝 Información de productos",
            value: "📝 Información de productos",
          },
          { label: "📍 Necesito ubicarlos", value: "📍 Necesito ubicarlos" },
          {
            label: "❓ Preguntas frecuentes",
            value: "❓ Preguntas frecuentes",
          },
        ];
        var qrRestore = document.createElement("div");
        qrRestore.className = "quick-replies";
        for (var ir = 0; ir < initialOptionsRestore.length; ir++) {
          (function (opt) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "quick-reply-btn";
            btn.textContent = opt.label;
            btn.addEventListener("click", function () {
              handleInitialMenuSelection(opt, qrRestore);
            });
            qrRestore.appendChild(btn);
          })(initialOptionsRestore[ir]);
        }
        el.msgs.appendChild(qrRestore);
        scrollMessagesToBottom(true);
      };
      setTimeout(tryAddMainMenuReplies, 0);
    }
    scrollMessagesToBottom(true);
    if (state.sessionEnded) {
      stopAwaitGenesysOverlay();
    } else {
      if (!state.sessionActive) {
        showSessionLoadingOverlay();
        if (el.sessionLoadingText) {
          el.sessionLoadingText.textContent = "Cargando...";
        }
      } else {
        dismissSessionLoadingOverlayFully();
      }
    }
  }

  function closeWin() {
    if (el.win) el.win.classList.remove("open");
    if (el.launcher) el.launcher.style.display = "flex";
  }

  function updateBadge() {
    if (!el.badge) return;
    if (state.unread > 0) {
      el.badge.textContent = state.unread > 9 ? "9+" : String(state.unread);
      el.badge.style.display = "flex";
    } else {
      el.badge.style.display = "none";
    }
  }

  function showTyping(on) {
    if (el.typing) el.typing.classList.toggle("show", !!on);
  }

  function resetMessages(opts) {
    var preserveHistory = !!(opts && opts.preserveHistory);
    if (el.msgs) {
      if (preserveHistory) {
        var oldQuickReplies = el.msgs.querySelectorAll(".quick-replies");
        for (var qrIdx = 0; qrIdx < oldQuickReplies.length; qrIdx++) {
          oldQuickReplies[qrIdx].remove();
        }
      } else {
        el.msgs.innerHTML = "";
      }
    }
    state.seenIds.clear();
    state.unread = 0;
    state.hiddenOutboundMap = Object.create(null);
    state.geoFlowInProgress = false;
    state.lastHiddenGeo = { value: "", ts: 0 };
    state.greetingSent = false;
    state.qrAccumulator = [];
    state.qrAccumulating = false;
    state.qrTextBubble = null;
    state.lastCloseInbound = { text: "", ts: 0 };
    state.lastCloseSystem = { text: "", ts: 0 };
    state.lastCloseEvent = { text: "", ts: 0 };
    state.lastHumanAgentSignalTs = 0;
    state.pendingUploads = [];
    updateBadge();
  }

  function showEnded(reason) {
    state.sessionActive = false;
    state.sessionEnded = true;
    setSesionPhase("ended");
    stopKeepAliveSignal();
    setStatusDot("ended", "Finalizada");
    stopAwaitGenesysOverlay();
    if (el.endedReason)
      el.endedReason.textContent = reason || "La sesion termino.";
    if (el.ended) el.ended.classList.add("show");
    showChat();
  }

  function startNextSessionInBackground() {
    if (!state.messengerReady || state.connecting || state.resetting) return;
    state.wasPreconnectingAfterEnd = true;
    state.silentConnectForInitialOpen = true;
    startConversation()
      .then(function () {
        if (state.wasPreconnectingAfterEnd && state.sessionActive) {
          setSesionStele(false);
          state.wasPreconnectingAfterEnd = false;
        }
      })
      .catch(function () {
        state.wasPreconnectingAfterEnd = false;
      });
  }

  /** Fragmentos del evento de cierre (data/detail/root) para SDKs que reparten campos entre niveles. */
  function getConversationEndEventParts(evt) {
    var parts = [];
    if (evt == null || typeof evt !== "object" || Array.isArray(evt))
      return parts;
    if (
      evt.detail != null &&
      typeof evt.detail === "object" &&
      !Array.isArray(evt.detail)
    )
      parts.push(evt.detail);
    if (
      evt.data != null &&
      typeof evt.data === "object" &&
      !Array.isArray(evt.data)
    )
      parts.push(evt.data);
    parts.push(evt);
    return parts;
  }

  function hasDisconnectPayloadHints(d) {
    if (!d || typeof d !== "object") return false;
    var msg = d.message && typeof d.message === "object" ? d.message : null;
    return !!(
      d.disconnectReason != null ||
      d.disconnectType != null ||
      d.disconnectInitiator != null ||
      d.originatingEntity != null ||
      d.bot === true ||
      (msg &&
        (msg.disconnectReason != null ||
          msg.disconnectType != null ||
          msg.disconnectInitiator != null ||
          msg.originatingEntity != null ||
          msg.bot === true))
    );
  }

  function getConversationEndEventData(evt) {
    var parts = getConversationEndEventParts(evt);
    for (var i = 0; i < parts.length; i++) {
      if (hasDisconnectPayloadHints(parts[i])) return parts[i];
    }
    return parts.length ? parts[parts.length - 1] : null;
  }

  function normalizedDisconnectOriginatingEntity(d) {
    if (!d || typeof d !== "object") return "";
    var raw =
      d.originatingEntity != null
        ? d.originatingEntity
        : d.disconnectInitiator != null
          ? d.disconnectInitiator
          : "";
    return String(raw).trim().toLowerCase();
  }

  function collectHumanAgentSignals(value, bucket, depth) {
    if (!value || depth > 3) return;
    if (typeof value === "string" || typeof value === "number") {
      bucket.push(String(value).trim().toLowerCase());
      return;
    }
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        collectHumanAgentSignals(value[i], bucket, depth + 1);
      }
      return;
    }
    if (typeof value !== "object") return;

    var keys = [
      "originatingEntity",
      "disconnectInitiator",
      "disconnectReason",
      "disconnectType",
      "participantType",
      "participantPurpose",
      "purpose",
      "role",
      "memberType",
      "source",
      "type",
      "disposition",
      "provider",
      "message",
      "body",
    ];

    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (value[key] != null) {
        collectHumanAgentSignals(value[key], bucket, depth + 1);
      }
    }

    if (Array.isArray(value.participants)) {
      collectHumanAgentSignals(value.participants, bucket, depth + 1);
    }
    if (Array.isArray(value.members)) {
      collectHumanAgentSignals(value.members, bucket, depth + 1);
    }
    if (value.participant && typeof value.participant === "object") {
      collectHumanAgentSignals(value.participant, bucket, depth + 1);
    }
  }

  /**
   * Genesys envía a veces el cierre humano en data.message.originatingEntity === "Human"
   * (mismo criterio que MessagingService.conversationDisconnected en integraciones que ya funcionan).
   */
  function isGenesysHumanMessageOriginatingEntity(evt) {
    var parts = getConversationEndEventParts(evt);
    for (var pi = 0; pi < parts.length; pi++) {
      var d = parts[pi];
      if (!d || typeof d !== "object") continue;
      var msg = d.message;
      if (!msg || typeof msg !== "object") continue;
      if (msg.originatingEntity == null || msg.originatingEntity === "")
        continue;
      if (String(msg.originatingEntity).trim().toLowerCase() === "human")
        return true;
    }
    return false;
  }

  function hasPositiveHumanAgentSignal(evt) {
    if (isGenesysHumanMessageOriginatingEntity(evt)) return true;
    var parts = getConversationEndEventParts(evt);
    for (var pi = 0; pi < parts.length; pi++) {
      var d = parts[pi];
      if (!d || typeof d !== "object") continue;
      var signals = [];
      collectHumanAgentSignals(d, signals, 0);
      for (var i = 0; i < signals.length; i++) {
        var signal = signals[i];
        if (!signal) continue;
        if (
          signal === "agent" ||
          signal === "human" ||
          signal === "advisor" ||
          signal === "asesor" ||
          signal === "representative" ||
          signal === "representante" ||
          signal === "acd"
        ) {
          return true;
        }
        if (
          signal.indexOf("humanagent") !== -1 ||
          signal.indexOf("liveagent") !== -1 ||
          signal.indexOf("human") !== -1 ||
          signal.indexOf("asesor") !== -1 ||
          signal.indexOf("representante") !== -1 ||
          signal.indexOf("advisor") !== -1
        ) {
          return true;
        }
        if (signal.indexOf("agent") !== -1 && signal.indexOf("bot") === -1) {
          return true;
        }
        if (signal.indexOf("acd") !== -1 && signal.indexOf("flow") === -1) {
          return true;
        }
      }
    }
    return false;
  }

  function getNormalizedDisconnectMeta(evt) {
    var parts = getConversationEndEventParts(evt);
    var bot = false;
    var oe = "";
    var reason = "";
    for (var pi = 0; pi < parts.length; pi++) {
      var p = parts[pi];
      if (!p || typeof p !== "object") continue;
      var pm = p.message && typeof p.message === "object" ? p.message : null;
      if (p.bot === true || !!(pm && pm.bot === true)) bot = true;
      var pieceOe =
        normalizedDisconnectOriginatingEntity(p) ||
        normalizedDisconnectOriginatingEntity(pm);
      if (pieceOe && !oe) oe = pieceOe;
      var pieceR = String(
        p.disconnectReason ||
          p.disconnectType ||
          p.reason ||
          p.disposition ||
          p.type ||
          (pm &&
            (pm.disconnectReason ||
              pm.disconnectType ||
              pm.reason ||
              pm.disposition ||
              pm.type)) ||
          "",
      )
        .toLowerCase()
        .replace(/\s+/g, "");
      if (pieceR && !reason) reason = pieceR;
    }
    return { bot: bot, originatingEntity: oe, reason: reason };
  }

  function isExplicitAutomatedDisconnect(evt) {
    var meta = getNormalizedDisconnectMeta(evt);
    if (meta.bot === true) return true;
    var oe = meta.originatingEntity;
    var dr = meta.reason;
    if (oe === "bot" || oe === "body") return true;
    if (
      oe.indexOf("bot") !== -1 ||
      oe.indexOf("flow") !== -1 ||
      oe.indexOf("architect") !== -1 ||
      oe.indexOf("acdflow") !== -1 ||
      oe.indexOf("virtualassistant") !== -1
    )
      return true;
    if (!dr) return false;
    if (
      dr.indexOf("flow") !== -1 ||
      dr.indexOf("bot") !== -1 ||
      dr.indexOf("acdflow") !== -1 ||
      dr.indexOf("architect") !== -1 ||
      dr.indexOf("virtualassistant") !== -1
    )
      return true;
    return false;
  }

  function isExplicitCustomerDisconnect(evt) {
    var meta = getNormalizedDisconnectMeta(evt);
    var oe = meta.originatingEntity;
    var dr = meta.reason;
    if (
      oe.indexOf("customer") !== -1 ||
      oe.indexOf("client") !== -1 ||
      oe.indexOf("visitor") !== -1 ||
      oe.indexOf("enduser") !== -1 ||
      oe.indexOf("self") !== -1
    )
      return true;
    if (!dr) return false;
    if (
      dr.indexOf("system") !== -1 ||
      dr.indexOf("timeout") !== -1 ||
      dr.indexOf("inactivity") !== -1 ||
      dr.indexOf("idle") !== -1
    )
      return false;
    if (
      dr.indexOf("customer") !== -1 ||
      dr.indexOf("client") !== -1 ||
      dr.indexOf("visitor") !== -1 ||
      dr.indexOf("enduser") !== -1 ||
      dr.indexOf("self") !== -1
    )
      return true;
    return false;
  }

  function isPassiveSystemDisconnect(evt) {
    var meta = getNormalizedDisconnectMeta(evt);
    var dr = meta.reason;
    if (!dr) return false;
    if (
      dr.indexOf("system") !== -1 ||
      dr.indexOf("timeout") !== -1 ||
      dr.indexOf("inactivity") !== -1 ||
      dr.indexOf("idle") !== -1
    )
      return true;
    return false;
  }

  var PRODUBANCO_FAREWELL_TEXT =
    "Gracias por comunicarte con Produbanco, recuerda que puedes seguir interactuando o iniciar una nueva conversación en cualquier momento.";

  function isProdubancoFarewellText(text) {
    return (
      normalizeTextForDedup(text || "") ===
      normalizeTextForDedup(PRODUBANCO_FAREWELL_TEXT)
    );
  }

  function isInboundProdubancoFarewellEvent(ev) {
    return !!(
      ev &&
      ev.type === "bubble" &&
      (ev.dir || "in") !== "out" &&
      isProdubancoFarewellText(ev.text || "")
    );
  }

  function dedupeStoredProdubancoFarewellEvents(events) {
    if (!Array.isArray(events) || !events.length) {
      return {
        events: Array.isArray(events) ? events.slice() : [],
        changed: false,
      };
    }
    var keptRev = [];
    var farewellSeen = false;
    var changed = false;
    for (var i = events.length - 1; i >= 0; i--) {
      var ev = events[i];
      if (isInboundProdubancoFarewellEvent(ev)) {
        if (farewellSeen) {
          changed = true;
          continue;
        }
        farewellSeen = true;
      }
      keptRev.push(ev);
    }
    keptRev.reverse();
    return { events: keptRev, changed: changed };
  }

  /** Evita doble despedida por doble evento SDK; no bloquea una despedida nueva tras más mensajes (a diferencia de buscar en todo el historial). */
  function isLastInboundBubbleProdubancoFarewell() {
    if (!el || !el.msgs) return false;
    var nodes = el.msgs.querySelectorAll(".msg.in .bubble");
    if (!nodes.length) return false;
    var t = (nodes[nodes.length - 1].textContent || "").trim();
    return isProdubancoFarewellText(t);
  }

  /** Despedida Produbanco: solo cuando existe señal positiva de agente humano. */
  function shouldShowHumanAgentFarewellForEndEvent(evt) {
    var vaGraceMs = 120000;
    if (
      state.lastVirtualAssistantClosureTs &&
      Date.now() - state.lastVirtualAssistantClosureTs < vaGraceMs
    )
      return false;
    if (hasPositiveHumanAgentSignal(evt)) return true;
    var hasHumanContext = !!state.lastHumanAgentSignalTs;
    if (isExplicitCustomerDisconnect(evt)) return false;
    if (hasHumanContext && !isExplicitAutomatedDisconnect(evt)) return true;
    if (isExplicitAutomatedDisconnect(evt)) return false;
    if (isPassiveSystemDisconnect(evt)) return hasHumanContext;
    return hasHumanContext;
  }

  function maybeShowHumanAgentFarewellBubble() {
    if (state.humanAgentFarewellShown) return;
    if (isLastInboundBubbleProdubancoFarewell()) {
      state.humanAgentFarewellShown = true;
      return;
    }
    state.humanAgentFarewellShown = true;
    var text = PRODUBANCO_FAREWELL_TEXT;
    addBubble("in", text);
    scrollMessagesToBottom();
  }

  function showEndedInline(reason, opts) {
    opts = opts || {};
    if (state.pageUnloading) {
      stopKeepAliveSignal();
      return;
    }
    if (opts.humanAgentEnd === true) {
      showChat();
      maybeShowHumanAgentFarewellBubble();
    }
    if (state.sessionEnded) {
      return;
    }
    var reasonText = String(
      reason ||
        "El agente cerro la conversacion. Escribe para iniciar una nueva.",
    ).trim();
    var skipClosureNotice = shouldSkipClosureEvent(reasonText, 120000);
    var inboundClosureRecentlyShown =
      !!state.lastCloseInbound.ts &&
      Date.now() - state.lastCloseInbound.ts < 15000 &&
      isClosureNotice(state.lastCloseInbound.text || "");
    var isAgentClosedMessage =
      (reasonText || "")
        .toLowerCase()
        .indexOf("agente cerro la conversacion") !== -1 &&
      (reasonText || "").toLowerCase().indexOf("iniciar una nueva") !== -1;

    state.sessionActive = false;
    state.sessionEnded = true;
    setSesionPhase("ended");
    state.connecting = false;
    stopKeepAliveSignal();
    setStatusDot("ended", "Finalizada");
    hideConnBanner();
    stopAwaitGenesysOverlay();
    if (el.ended) el.ended.classList.remove("show");
    if (
      !skipClosureNotice &&
      !inboundClosureRecentlyShown &&
      !isAgentClosedMessage
    ) {
      showConnBanner("failed", reasonText);
    }
    showChat();
  }

  function hideEnded() {
    if (el.ended) el.ended.classList.remove("show");
  }

  function autoResize() {
    if (!el.text) return;
    el.text.style.height = "auto";
    el.text.style.height = Math.min(el.text.scrollHeight, 120) + "px";
  }

  function clearComposer() {
    if (!el.text) return;
    el.text.value = "";
    autoResize();
  }
  function isUploadStatusBubbleText(text) {
    var t = String(text || "")
      .trim()
      .toLowerCase();
    return (
      /\((subiendo|procesando)\.\.\.\)\s*$/.test(t) ||
      /\(error al subir\)\s*$/.test(t)
    );
  }

  function releaseRestartSendLock() {
    if (!state.restartSendInFlight) return;
    state.restartSendInFlight = false;
    showTyping(false);
    showChat();
  }

  function updateSend() {
    if (!el.send || !el.text || !el.attach) return;
    var raw = (el.text.value || "").trim();
    var hasText = raw.length > 0;
    var restartBusy = !!state.restartSendInFlight;
    var endedSession = state.sessionEnded || isSesionEndedPersisted();
    var canSendNormal =
      state.messagingReady &&
      state.sessionActive &&
      !endedSession &&
      !restartBusy &&
      hasText;
    var canSendRestart = endedSession && !restartBusy && hasText;
    var ok = canSendNormal || canSendRestart;
    el.send.disabled = !ok;
    el.send.classList.toggle("enabled", ok);
    el.attach.disabled = !(
      state.messagingReady &&
      state.sessionActive &&
      !endedSession
    );
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function saveLauncherPosition(left, top) {
    try {
      localStorage.setItem(
        "stela_launcher_pos",
        JSON.stringify({ left: left, top: top }),
      );
    } catch (e) {}
  }

   function restoreLauncherPosition() {
    if (!el.launcher) return;
    try {
      var raw = localStorage.getItem("stela_launcher_pos");
      if (!raw) return;
      var pos = JSON.parse(raw);
      if (!pos || typeof pos.left !== "number" || typeof pos.top !== "number")
        return;
      var rect = el.launcher.getBoundingClientRect();
      var maxLeft = Math.max(0, window.innerWidth - rect.width);
      var maxTop = Math.max(0, window.innerHeight - rect.height);
      var left = clamp(pos.left, 0, maxLeft);
      var top = clamp(pos.top, 0, maxTop);
      el.launcher.style.left = left + "px";
      el.launcher.style.top = top + "px";
      el.launcher.style.right = "auto";
      el.launcher.style.bottom = "auto";
      state.launcherDrag.left = left;
      state.launcherDrag.top = top;
    } catch (e) {}
  }

  function beginLauncherDrag(ev) {
    if (!el.launcher) return;
    if (el.win && el.win.classList.contains("open")) return;
    if (ev.button != null && ev.button !== 0) return;
    var rect = el.launcher.getBoundingClientRect();
    state.launcherDrag.active = true;
    state.launcherDrag.moved = false;
    state.launcherDrag.pointerId = ev.pointerId;
    state.launcherDrag.startX = ev.clientX;
    state.launcherDrag.startY = ev.clientY;
    state.launcherDrag.offsetX = ev.clientX - rect.left;
    state.launcherDrag.offsetY = ev.clientY - rect.top;
    state.launcherDrag.left = rect.left;
    state.launcherDrag.top = rect.top;
    el.launcher.style.left = rect.left + "px";
    el.launcher.style.top = rect.top + "px";
    el.launcher.style.right = "auto";
    el.launcher.style.bottom = "auto";
    el.launcher.classList.add("dragging");
    try {
      el.launcher.setPointerCapture(ev.pointerId);
    } catch (_) {}
    if (ev.preventDefault) ev.preventDefault();
  }

  function moveLauncherDrag(ev) {
    if (!state.launcherDrag.active || !el.launcher) return;
    if (
      state.launcherDrag.pointerId != null &&
      ev.pointerId != null &&
      ev.pointerId !== state.launcherDrag.pointerId
    )
      return;
    var dx = ev.clientX - state.launcherDrag.startX;
    var dy = ev.clientY - state.launcherDrag.startY;
    if (!state.launcherDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4))
      state.launcherDrag.moved = true;
    var rect = el.launcher.getBoundingClientRect();
    var newLeft = ev.clientX - state.launcherDrag.offsetX;
    var newTop = ev.clientY - state.launcherDrag.offsetY;
    var maxLeft = Math.max(0, window.innerWidth - rect.width);
    var maxTop = Math.max(0, window.innerHeight - rect.height);
    newLeft = clamp(newLeft, 0, maxLeft);
    newTop = clamp(newTop, 0, maxTop);
    state.launcherDrag.left = newLeft;
    state.launcherDrag.top = newTop;
    el.launcher.style.left = newLeft + "px";
    el.launcher.style.top = newTop + "px";
    if (ev.preventDefault) ev.preventDefault();
  }

  function endLauncherDrag(ev) {
    if (!state.launcherDrag.active || !el.launcher) return;
    if (
      state.launcherDrag.pointerId != null &&
      ev.pointerId != null &&
      ev.pointerId !== state.launcherDrag.pointerId
    )
      return;
    var wasMoved = state.launcherDrag.moved;
    state.launcherDrag.active = false;
    state.launcherDrag.pointerId = null;
    el.launcher.classList.remove("dragging");
    try {
      if (ev.pointerId != null) el.launcher.releasePointerCapture(ev.pointerId);
    } catch (_) {}
    if (wasMoved) {
      state.launcherDrag.suppressClick = true;
      saveLauncherPosition(
        state.launcherDrag.left || 0,
        state.launcherDrag.top || 0,
      );
      setTimeout(function () {
        state.launcherDrag.suppressClick = false;
      }, 140);
    }
  }

  function setupLauncherDrag() {
    if (!el.launcher) return;
    restoreLauncherPosition();

    // Nace bloqueado visualmente para que el usuario no interrumpa la conexión
    el.launcher.style.opacity = "0.5";
    el.launcher.style.pointerEvents = "none";
    el.launcher.style.cursor = "not-allowed";

    el.launcher.addEventListener("pointerdown", beginLauncherDrag);
    window.addEventListener("pointermove", moveLauncherDrag, {
      passive: false,
    });
    window.addEventListener("pointerup", endLauncherDrag);
    window.addEventListener("pointercancel", endLauncherDrag);
    window.addEventListener("resize", function () {
      if (!el.launcher) return;
      var usesLeftTop = el.launcher.style.left && el.launcher.style.top;
      if (!usesLeftTop) return;
      var rect = el.launcher.getBoundingClientRect();
      var maxLeft = Math.max(0, window.innerWidth - rect.width);
      var maxTop = Math.max(0, window.innerHeight - rect.height);
      var left = clamp(rect.left, 0, maxLeft);
      var top = clamp(rect.top, 0, maxTop);
      el.launcher.style.left = left + "px";
      el.launcher.style.top = top + "px";
      state.launcherDrag.left = left;
      state.launcherDrag.top = top;
      saveLauncherPosition(left, top);
    });
  }

  var WIDGET_BASE_URL = (function () {
    try {
      if (document.currentScript && document.currentScript.src) {
        return new URL(".", document.currentScript.src).href;
      }
      var scripts = document.querySelectorAll("script[src]");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src || "";
        if (src && src.indexOf("main.js") !== -1) {
          return new URL(".", src).href;
        }
      }
    } catch (_) {}
    try {
      return new URL(".", window.location.href).href;
    } catch (_) {
      return "./";
    }
  })();

  function resolveWidgetAssetUrl(fileName) {
    try {
      return new URL(fileName, WIDGET_BASE_URL).href;
    } catch (_) {
      return fileName;
    }
  }

  var BOT_AVATAR_URL = imagen;
  var SESSION_LOADING_GIF_URL = loader;

  function hydrateWidgetStaticAssets() {
    var launcherImg = document.getElementById("launcher-img");
    var launcherSvg = document.getElementById("launcher-svg");
    if (launcherImg) {
      launcherImg.src = BOT_AVATAR_URL;
      launcherImg.style.display = "block";
    }
    if (launcherSvg) launcherSvg.style.display = "none";

    var avatarImgs = document.querySelectorAll(".avatar img");
    for (var i = 0; i < avatarImgs.length; i++) {
      avatarImgs[i].src = BOT_AVATAR_URL;
      avatarImgs[i].style.display = "block";
    }
    var avatarEmoji = document.getElementById("avatarEmoji");
    if (avatarEmoji) avatarEmoji.style.display = "none";

    var loadingGif = document.querySelector(".session-loading-gif");
    if (loadingGif) loadingGif.src = SESSION_LOADING_GIF_URL;
  }

  hydrateWidgetStaticAssets();

  function botAvatarImg() {
    var img = document.createElement("img");
    img.src = BOT_AVATAR_URL;
    img.alt = "Stela";
    img.referrerPolicy = "no-referrer";
    img.style.cssText =
      "width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;flex:0 0 28px;background:#fff;border:1px solid rgba(0,0,0,.06)";
    img.onerror = function () {
      img.style.display = "none";
    };
    return img;
  }

  function botRow(contentEl, timestamp) {
    return appendContentRow("in", contentEl, timestamp);
  }

  function appendContentRow(dir, contentEl, timestamp) {
    if (!el.msgs) return;
    var row = document.createElement("div");
    var isOut = dir === "out";
    row.className = "msg " + (isOut ? "out" : "in");
    row.style.alignItems = "flex-end";
    if (!isOut) row.appendChild(botAvatarImg());
    var meta = document.createElement("div");
    meta.className = "meta";
    try {
      contentEl.style.alignSelf = "auto";
    } catch (e) {}
    meta.appendChild(contentEl);
    var tm = document.createElement("div");
    tm.className = "time";
    var timeDate = timestamp ? new Date(timestamp) : new Date();
    tm.textContent = timeDate.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    meta.appendChild(tm);
    row.appendChild(meta);
    el.msgs.appendChild(row);
    scrollMessagesToBottom();
    if (
      el.win &&
      !el.win.classList.contains("open") &&
      !isOut &&
      !state.isRestoring
    ) {
      state.unread++;
      updateBadge();
    }
    if (!isOut) {
      clearAwaitGenesysOverlay();
      releaseRestartSendLock();
    }
  }

  var URL_REGEX = /https?:\/\/[^\s<>"']+/gi;
  var IMG_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?[^\s]*)?$/i;
  var VIDEO_EXT = /\.(mp4|webm|ogg|mov|avi)(\?[^\s]*)?$/i;
  var MIME_EXTENSION_MAP = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/json": "json",
    "application/xml": "xml",
    "text/xml": "xml",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/vnd.rar": "rar",
    "application/x-rar-compressed": "rar",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "video/mp4": "mp4",
  };

  var CAROUSEL_PROMPT_TEXT = "\u00BFQu\u00E9 le gustar\u00EDa hacer?";

  function isImageUrl(u) {
    return IMG_EXT.test(u);
  }
  function isVideoUrl(u) {
    return VIDEO_EXT.test(u);
  }
  function getFileExtension(name) {
    var match = /\.([a-z0-9]{1,10})$/i.exec(String(name || "").trim());
    return match ? match[1].toLowerCase() : "";
  }
  function sanitizeFileName(name) {
    var safe = String(name || "").trim();
    safe = safe.replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_");
    safe = safe.replace(/\s+/g, " ").trim();
    return safe || "Archivo";
  }
  function getExtensionFromUrl(url) {
    if (!url) return "";
    try {
      var parsed = new URL(url, window.location.href);
      var lastSegment = decodeURIComponent(
        String(parsed.pathname || "")
          .split("/")
          .pop() || "",
      );
      return getFileExtension(lastSegment);
    } catch (e) {
      try {
        var clean = decodeURIComponent(
          String(url || "")
            .split("#")[0]
            .split("?")[0]
            .split("/")
            .pop() || "",
        );
        return getFileExtension(clean);
      } catch (_) {
        return "";
      }
    }
  }
  function getExtensionFromMime(mime) {
    var normalized = String(mime || "")
      .toLowerCase()
      .split(";")[0]
      .trim();
    return MIME_EXTENSION_MAP[normalized] || "";
  }
  function resolveAttachmentFileName(name, mime, url) {
    var safeName = sanitizeFileName(name);
    if (getFileExtension(safeName)) return safeName;
    var ext = getExtensionFromUrl(url) || getExtensionFromMime(mime) || "";
    return ext ? safeName + "." + ext : safeName;
  }
  function pad2(n) {
    var v = Number(n) || 0;
    return v < 10 ? "0" + v : String(v);
  }
  function buildClipboardFileName(mime) {
    var ext = getExtensionFromMime(mime) || "png";
    var now = new Date();
    return (
      "captura-" +
      now.getFullYear() +
      pad2(now.getMonth() + 1) +
      pad2(now.getDate()) +
      "-" +
      pad2(now.getHours()) +
      pad2(now.getMinutes()) +
      pad2(now.getSeconds()) +
      "." +
      ext
    );
  }
  function normalizeUploadFile(file, fallbackName) {
    if (!file) return null;
    var mime = String(file.type || "").trim();
    var desiredName = sanitizeFileName(file.name || fallbackName || "Archivo");
    var finalName = resolveAttachmentFileName(desiredName, mime, "");
    if (file.name === finalName) return file;
    try {
      return new File([file], finalName, {
        type: mime || "application/octet-stream",
        lastModified: Date.now(),
      });
    } catch (_) {
      try {
        file.name = finalName;
      } catch (_) {}
      return file;
    }
  }
  function getClipboardUploadFile(evt) {
    var cd = evt && evt.clipboardData;
    if (!cd) return null;
    var files = cd.files;
    if (files && files.length) {
      return normalizeUploadFile(
        files[0],
        buildClipboardFileName(files[0].type),
      );
    }
    var items = cd.items || [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item) continue;
      if (item.kind !== "file") continue;
      var blob = item.getAsFile && item.getAsFile();
      if (!blob) continue;
      return normalizeUploadFile(blob, buildClipboardFileName(blob.type));
    }
    return null;
  }
  function normalizePendingUploadName(name) {
    return String(sanitizeFileName(name || ""))
      .trim()
      .toLowerCase();
  }
  function rememberPendingUploadBubble(fileName, bubbleRef) {
    if (!bubbleRef || !bubbleRef.wrap) return;
    state.pendingUploads.push({
      name: normalizePendingUploadName(fileName),
      wrap: bubbleRef.wrap,
      bubble: bubbleRef.bubble || null,
      ts: Date.now(),
    });
    if (state.pendingUploads.length > 12) {
      state.pendingUploads = state.pendingUploads.slice(
        state.pendingUploads.length - 12,
      );
    }
  }
  function forgetPendingUploadBubbleByWrap(wrap) {
    if (!wrap || !state.pendingUploads.length) return;
    for (var i = state.pendingUploads.length - 1; i >= 0; i--) {
      if (state.pendingUploads[i] && state.pendingUploads[i].wrap === wrap) {
        state.pendingUploads.splice(i, 1);
        return;
      }
    }
  }
  function removePendingUploadBubble(fileName) {
    if (!state.pendingUploads.length) return false;
    var wanted = normalizePendingUploadName(fileName);
    var idx = -1;
    if (wanted) {
      for (var i = 0; i < state.pendingUploads.length; i++) {
        if (
          state.pendingUploads[i] &&
          state.pendingUploads[i].name === wanted
        ) {
          idx = i;
          break;
        }
      }
    }
    if (idx === -1) idx = 0;
    var pending = state.pendingUploads.splice(idx, 1)[0];
    if (!pending || !pending.wrap) return false;
    try {
      pending.wrap.remove();
    } catch (_) {
      if (pending.wrap.parentNode) {
        pending.wrap.parentNode.removeChild(pending.wrap);
      }
    }
    return true;
  }
  function getDownloadableImageName(url, fallbackName, mime) {
    return resolveAttachmentFileName(
      fallbackName || "Imagen",
      mime || "",
      url || "",
    );
  }
  function attachImageDownloadBehavior(target, url, fileName, mime) {
    if (!target || !url) return;
    target.style.cursor = "pointer";
    target.title = "Descargar imagen";
    target.addEventListener("click", function (e) {
      if (e && e.preventDefault) e.preventDefault();
      downloadAttachment(
        url,
        getDownloadableImageName(url, fileName, mime),
        mime,
      ).catch(function () {});
    });
  }
  function triggerObjectUrlDownload(blob, fileName) {
    var objectUrl = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName || "Archivo";
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
      if (link.parentNode) link.parentNode.removeChild(link);
    }, 1000);
  }
  function triggerDirectDownload(url, fileName) {
    var link = document.createElement("a");
    link.href = url;
    link.download = fileName || "Archivo";
    link.target = "_blank";
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      if (link.parentNode) link.parentNode.removeChild(link);
    }, 0);
  }
  async function downloadAttachment(url, fileName, mime, buttonEl) {
    if (!url) return false;
    var previousLabel = buttonEl ? buttonEl.textContent : "";
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = "Descargando...";
    }
    try {
      var response = await fetch(url);
      if (!response.ok) throw new Error("attachment_download_failed");
      var blob = await response.blob();
      if (!blob || blob.size === 0) throw new Error("attachment_empty_blob");
      if (
        mime &&
        (!blob.type ||
          String(blob.type).toLowerCase() === "application/octet-stream")
      ) {
        try {
          blob = blob.slice(0, blob.size, mime);
        } catch (_) {}
      }
      triggerObjectUrlDownload(blob, fileName);
      return true;
    } catch (err) {
      triggerDirectDownload(url, fileName);
      return false;
    } finally {
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.textContent = previousLabel || "Descargar";
      }
    }
  }

  function buildRichBubbleContent(text) {
    var urls = text.match(URL_REGEX);
    if (!urls || !urls.length) {
      var span = document.createElement("span");
      span.textContent = text;
      return { el: span, hasMedia: false };
    }
    var frag = document.createDocumentFragment();
    var remaining = text;
    var hasMedia = false;
    urls.forEach(function (rawUrl) {
      var idx = remaining.indexOf(rawUrl);
      if (idx > 0) {
        var before = document.createElement("span");
        before.textContent = remaining.substring(0, idx);
        frag.appendChild(before);
      }
      remaining = remaining.substring(idx + rawUrl.length);
      var url = rawUrl.replace(/[.,;:!?)]+$/, "");
      if (isImageUrl(url)) {
        hasMedia = true;
        var imgWrap = document.createElement("div");
        imgWrap.style.cssText =
          "margin:8px 0;border-radius:12px;overflow:hidden;max-width:100%;cursor:pointer;position:relative";
        var img = document.createElement("img");
        img.src = url;
        img.alt = "Imagen";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.style.cssText =
          "display:block;width:100%;max-height:240px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,.08)";
        img.onerror = function () {
          imgWrap.innerHTML = "";
          var link = document.createElement("a");
          link.href = "#";
          link.textContent = "Descargar imagen";
          link.style.cssText = "color:inherit;text-decoration:underline";
          link.addEventListener("click", function (e) {
            e.preventDefault();
            downloadAttachment(
              url,
              getDownloadableImageName(url, "Imagen", ""),
            ).catch(function () {});
          });
          imgWrap.appendChild(link);
        };
        attachImageDownloadBehavior(imgWrap, url, "Imagen", "");
        imgWrap.appendChild(img);
        frag.appendChild(imgWrap);
      } else if (isVideoUrl(url)) {
        var vidWrap = document.createElement("div");
        vidWrap.style.cssText =
          "margin:8px 0;border-radius:12px;overflow:hidden;max-width:100%";
        var vid = document.createElement("video");
        vid.src = url;
        vid.controls = true;
        vid.preload = "metadata";
        vid.style.cssText =
          "display:block;width:100%;max-height:240px;border-radius:12px";
        vid.onerror = function () {
          vidWrap.innerHTML = "";
          var link2 = document.createElement("a");
          link2.href = url;
          link2.target = "_blank";
          link2.rel = "noopener";
          link2.textContent = "Ver video";
          link2.style.cssText = "color:inherit;text-decoration:underline";
          vidWrap.appendChild(link2);
        };
        vidWrap.appendChild(vid);
        frag.appendChild(vidWrap);
      } else {
        var a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.style.cssText =
          "color:inherit;text-decoration:underline;word-break:break-all";
        try {
          var uo = new URL(url);
          a.textContent =
            uo.hostname +
            (uo.pathname.length > 1
              ? uo.pathname.substring(0, 30) + "..."
              : "");
        } catch (e) {
          a.textContent = "Enlace";
        }
        frag.appendChild(a);
      }
    });
    if (remaining) {
      var after = document.createElement("span");
      after.textContent = remaining;
      frag.appendChild(after);
    }
    return { el: frag, hasMedia: hasMedia };
  }

  function addBubble(dir, text, timestamp) {
    if (!el.msgs) return { wrap: null, bubble: null };
    var wrap = document.createElement("div");
    wrap.className = "msg " + (dir === "out" ? "out" : "in");
    wrap.style.alignItems = "flex-end";
    if (dir !== "out") wrap.appendChild(botAvatarImg());
    var meta = document.createElement("div");
    meta.className = "meta";
    var bub = document.createElement("div");
    bub.className = "bubble";
    var rich = buildRichBubbleContent(text);
    bub.appendChild(rich.el);
    if (rich.hasMedia) bub.style.padding = "8px 12px";
    var tm = document.createElement("div");
    tm.className = "time";
    var timeDate = timestamp ? new Date(timestamp) : new Date();
    tm.textContent = timeDate.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    meta.appendChild(bub);
    meta.appendChild(tm);
    wrap.appendChild(meta);
    el.msgs.appendChild(wrap);
    scrollMessagesToBottom();
    if (
      el.win &&
      !el.win.classList.contains("open") &&
      dir === "in" &&
      !state.isRestoring
    ) {
      state.unread++;
      updateBadge();
    }
    return { wrap: wrap, bubble: bub };
  }

  function renderActions(actions, cardCtx) {
    var box = document.createElement("div");
    box.className = "r-actions";
    function getUrl(a) {
      return (a && (a.url || a.href || a.uri || a.link)) || "";
    }
    function pickActionText(a, fallbackBtnText) {
      var at = String((a && (a.text || a.label || a.title)) || "").trim();
      if (at) return at;
      var fb = String(fallbackBtnText || "").trim();
      if (fb) return fb;
      var title = String((cardCtx && cardCtx.title) || "").trim();
      return title || "Accion";
    }
    (actions || []).forEach(function (a) {
      var t = (a && (a.text || a.label || a.title)) || "Accion";
      var type = String(
        (a && (a.type || a.action || a.kind)) || "",
      ).toLowerCase();
      var url = getUrl(a);
      var isLink = type === "link" || type === "url" || !!url;
      var b = document.createElement("button");
      b.className = "r-btn " + (isLink ? "link" : "");
      b.textContent = t;
      b.addEventListener("click", function () {
        var payloadText = pickActionText(a, t);

        if (url) {
          window.open(url, "_blank", "noopener");
          return;
        }
        showTyping(true);
        Promise.resolve(
          sendHiddenText(
            payloadText,
            { hidden: true, source: "carousel_action_text", label: t },
            2,
          ),
        )
          .catch(function () {})
          .finally(function () {
            showTyping(false);
          });
      });
      box.appendChild(b);
    });
    return box;
  }

  function normalizeImageUrl(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (v.url) return v.url;
    if (v.image && typeof v.image === "string") return v.image;
    if (v.image && v.image.url) return v.image.url;
    return "";
  }

function addCarousel(cards, timestamp) {
    var wrap = document.createElement("div");
    wrap.className = "rich";
    wrap.style.alignSelf = "auto";
    var car = document.createElement("div");
    car.className = "carousel";
 
    (cards || []).forEach(function (c) {
      var card = document.createElement("div");
      card.className = "r-card";
 
      var imgUrl = normalizeImageUrl(c.image || c.imageUrl || c.img || "");
      if (imgUrl) {
        var imgEl = document.createElement("img");
        imgEl.className = "r-thumb";
        imgEl.loading = "lazy";
        imgEl.referrerPolicy = "no-referrer";
        imgEl.src = imgUrl;
        imgEl.draggable = false;
        imgEl.addEventListener("contextmenu", function (e) {
          e.preventDefault();
        });
        imgEl.addEventListener("dragstart", function (e) {
          e.preventDefault();
        });
 
        var fb = document.createElement("div");
        fb.className = "r-thumb-fallback";
        fb.innerHTML = "No se pudo cargar la imagen.";
 
        imgEl.onerror = function () {
          imgEl.classList.add("hide");
          fb.classList.add("show");
        };
 
        card.appendChild(imgEl);
        card.appendChild(fb);
      }
 
      var h = document.createElement("h4");
      h.textContent = c.title || "";
 
      var p = document.createElement("p");
      p.textContent = c.description || c.text || "";
 
      card.appendChild(h);
      if (p.textContent) card.appendChild(p);
 
      var acts = renderActions(c.actions || c.buttons || [], c);
      if (acts.childNodes.length) card.appendChild(acts);
 
      car.appendChild(card);
    });
 
    wrap.appendChild(car);
    STELA_attachCarouselNav(wrap, car);
    botRow(wrap, timestamp);
 
    if (!state.isRestoring) {
      sendHiddenText(
        CAROUSEL_PROMPT_TEXT,
        { hidden: true, source: "carousel_prompt" },
        2,
      ).catch(function () {});
    }
  }

  function addImage(url, caption, timestamp, dir) {
    if (!url) return;
    var wrap = document.createElement("div");
    wrap.className = "r-image";
    wrap.style.alignSelf = "auto";
    attachImageDownloadBehavior(wrap, url, caption || "Imagen", "image/*");
    var img = document.createElement("img");
    img.src = url;
    img.alt = caption || "Imagen";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.style.cssText =
      "display:block;width:100%;height:auto;max-height:400px;object-fit:contain;border-radius:14px;background:#f9faf9";
    img.onerror = (function (theUrl, theCaption, theWrap) {
      return function () {
        theWrap.innerHTML = "";
        var fallLink = document.createElement("a");
        fallLink.href = "#";
        fallLink.textContent = "Descargar imagen: " + (theCaption || "Imagen");
        fallLink.style.cssText =
          "color:var(--primary);text-decoration:underline;padding:12px;display:block;font-size:13px";
        fallLink.addEventListener("click", function (e) {
          e.preventDefault();
          downloadAttachment(
            theUrl,
            getDownloadableImageName(theUrl, theCaption || "Imagen", "image/*"),
            "image/*",
          ).catch(function () {});
        });
        theWrap.appendChild(fallLink);
      };
    })(url, caption, wrap);
    wrap.appendChild(img);
    if (caption) {
      var cap = document.createElement("div");
      cap.className = "cap";
      cap.textContent = caption;
      wrap.appendChild(cap);
    }
    appendContentRow(dir === "out" ? "out" : "in", wrap, timestamp);
  }

  function addFileAttachment(url, fileName, mime, fileSize, timestamp, dir) {
    var safeName = resolveAttachmentFileName(
      fileName || "Archivo",
      mime || "",
      url || "",
    );
    var safeMime = String(mime || "").toLowerCase();
    var safeSize = Math.max(0, Number(fileSize) || 0);

    var fileWrap = document.createElement("div");
    fileWrap.style.cssText =
      "padding:12px 16px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;display:flex;align-items:center;gap:10px;max-width:100%";

    var fileIcon = document.createElement("span");
    fileIcon.textContent = "\uD83D\uDCCE";
    fileIcon.style.fontSize = "20px";

    var fileInfo = document.createElement("div");
    fileInfo.style.cssText = "flex:1;min-width:0";

    var fileNameEl = document.createElement("div");
    fileNameEl.textContent = safeName;
    fileNameEl.style.cssText =
      "font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";

    var fileSizeEl = document.createElement("div");
    var sizeStr = "";
    if (safeSize) {
      var kb = safeSize / 1024;
      sizeStr =
        kb >= 1024 ? (kb / 1024).toFixed(1) + " MB" : kb.toFixed(1) + " KB";
    }
    fileSizeEl.textContent = sizeStr;
    fileSizeEl.style.cssText = "font-size:11px;color:var(--muted2)";

    fileInfo.appendChild(fileNameEl);
    if (sizeStr) fileInfo.appendChild(fileSizeEl);

    var dlBtn = document.createElement("button");
    dlBtn.textContent = "Descargar";
    dlBtn.style.cssText =
      "border:none;background:var(--primary);color:#fff;border-radius:999px;padding:8px 12px;cursor:pointer;font-size:12px;white-space:nowrap";

    if (url) {
      dlBtn.addEventListener(
        "click",
        (function (theUrl, theName, theMime, theBtn) {
          return function () {
            downloadAttachment(theUrl, theName, theMime, theBtn).catch(
              function () {},
            );
          };
        })(url, safeName, safeMime, dlBtn),
      );
    } else {
      dlBtn.disabled = true;
      dlBtn.style.opacity = "0.6";
      dlBtn.style.cursor = "default";
    }

    fileWrap.appendChild(fileIcon);
    fileWrap.appendChild(fileInfo);
    fileWrap.appendChild(dlBtn);
    appendContentRow(dir === "out" ? "out" : "in", fileWrap, timestamp);
  }

  function renderFinalQuickReplies(options) {
    if (!options.length || !el.msgs) return;

    var c = document.createElement("div");
    c.className = "quick-replies";

    if (options.length > 5) {
      c.classList.add("grid-layout");
    }

    for (var i = 0; i < options.length; i++) {
      c.appendChild(makeQrBtn(options[i]));
    }

    el.msgs.appendChild(c);

    clearAwaitGenesysOverlay();
    releaseRestartSendLock();

    scrollMessagesToBottom();
  }

  async function captureGeoAndSend(messageToSend) {
    if (state.geoFlowInProgress) {
      return;
    }
    state.geoFlowInProgress = true;

    showTyping(true);

    var geoUserMsg = String(messageToSend || "").trim();
    if (geoUserMsg) addBubble("out", geoUserMsg);

    if (!("geolocation" in navigator)) {
      state.suppressNextIncoming = false;
      addBubble(
        "in",
        "Por favor, recuerda que debes otorgar los permisos de ubicación en el navegador.",
      );
      renderFinalQuickReplies([
        { label: "Menú principal", value: "Menú principal", action: "Message" },
      ]);
      showTyping(false);
      state.geoFlowInProgress = false;
      return;
    }

    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(
        async function (pos) {
          try {
            state.device.latitud = pos.coords.latitude;
            state.device.longitud = pos.coords.longitude;

            await ensureCustomAttributes(true);

            await sendText(geoUserMsg, null, { skipRender: true });

            var lat = Number(pos.coords.latitude).toFixed(6);
            var lon = Number(pos.coords.longitude).toFixed(6);
            var geoMessage = lat + "|" + lon;
            var now = Date.now();

            state.lastHiddenGeo = { value: geoMessage, ts: now };

            await waitMs(900);
            await sendHiddenGeoWithRetry(geoMessage, 3);
          } finally {
            state.suppressNextIncoming = false;
            showTyping(false);
            state.geoFlowInProgress = false;
          }
          resolve();
        },
        async function (e) {
          try {
            state.suppressNextIncoming = false;
            addBubble(
              "in",
              "Por favor, recuerda que debes otorgar los permisos de ubicación en el navegador.",
            );
            renderFinalQuickReplies([
              {
                label: "Menú principal",
                value: "Menú principal",
                action: "Message",
              },
            ]);
          } finally {
            showTyping(false);
            state.geoFlowInProgress = false;
          }
          resolve();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  function clearPendingInitialMenuSelectionTimer() {
    if (!state.pendingInitialMenuSelectionTimer) return;
    clearTimeout(state.pendingInitialMenuSelectionTimer);
    state.pendingInitialMenuSelectionTimer = 0;
  }

  function clearPendingInitialMenuSelection() {
    clearPendingInitialMenuSelectionTimer();
    state.pendingInitialMenuSelection = null;
  }

  function clearPendingRestartMessage() {
    state.pendingRestartMessage = null;
    state.restartSendInFlight = false;
  }

  function rememberPendingInitialMenuSelection(opt) {
    clearPendingInitialMenuSelection();
    state.pendingInitialMenuSelection = {
      label: String((opt && opt.label) || "").trim(),
      value: String((opt && (opt.value || opt.label)) || "").trim(),
      action: String((opt && opt.action) || "Message"),
      ts: Date.now(),
    };
  }

  function scoreMenuChoiceMatch(left, right) {
    if (!left || !right) return 0;
    if (left === right) return 100;
    if (left.indexOf(right) !== -1 || right.indexOf(left) !== -1) return 80;
    var leftTokens = left.split(" ");
    var rightTokens = right.split(" ");
    var shared = 0;
    for (var i = 0; i < leftTokens.length; i++) {
      var token = leftTokens[i];
      if (!token || token.length < 4) continue;
      if (rightTokens.indexOf(token) !== -1) shared++;
    }
    return shared * 10;
  }

  function findMatchingQuickReplyOption(selection, options) {
    if (!selection || !Array.isArray(options) || !options.length) return null;
    var wanted = normalizeMenuSelectionText(
      selection.value || selection.label || "",
    );
    if (!wanted) return null;
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      if (!opt) continue;
      var score = Math.max(
        scoreMenuChoiceMatch(
          wanted,
          normalizeMenuSelectionText(opt.value || ""),
        ),
        scoreMenuChoiceMatch(
          wanted,
          normalizeMenuSelectionText(opt.label || ""),
        ),
      );
      if (score > bestScore) {
        best = opt;
        bestScore = score;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function isGeoMenuSelection(opt) {
    var value = normalizeMenuSelectionText((opt && opt.value) || "");
    var label = normalizeMenuSelectionText((opt && opt.label) || "");
    return (
      value.indexOf("necesito ubicarlos") !== -1 ||
      label.indexOf("necesito ubicarlos") !== -1 ||
      value.indexOf("ubicarlos") !== -1 ||
      label.indexOf("ubicarlos") !== -1
    );
  }

  function triggerQuickReplySelection(opt) {
    touchClientActivity();
    var act = String((opt && opt.action) || "Message").toLowerCase();
    var textToSend = String((opt && (opt.value || opt.label)) || "").trim();
    var label = String((opt && opt.label) || "").trim();
    var value = String((opt && opt.value) || "").trim();
    if (act === "url" || act === "link") {
      var url = value;
      if (!url) return Promise.resolve(false);
      sendHiddenText(
        label || textToSend || url,
        { hidden: true, source: "qr_link", label: label, url: url },
        2,
      ).catch(function () {});
      window.open(url, "_blank", "noopener");
      return Promise.resolve(true);
    }
    return sendText(textToSend);
  }

  function armPendingInitialMenuSelectionFallback() {
    clearPendingInitialMenuSelectionTimer();
    if (!state.pendingInitialMenuSelection) return;
    state.pendingInitialMenuSelectionTimer = setTimeout(function () {
      var pending = state.pendingInitialMenuSelection;
      if (!pending) return;
      clearPendingInitialMenuSelection();
      Promise.resolve(triggerQuickReplySelection(pending)).catch(function () {
        showTyping(false);
      });
    }, 1200);
  }

  function maybeAutoForwardPendingInitialMenuSelection(options, promptText) {
    if (!isCarouselPromptNotice(promptText)) return false;

    var now = Date.now();
    var pending = state.pendingInitialMenuSelection;
    var lastSent = state.lastSent || { text: "", ts: 0 };

    if (pending && now - (pending.ts || 0) <= 15000) {
      var matched = findMatchingQuickReplyOption(pending, options) || pending;
      clearPendingInitialMenuSelection();
      clearAwaitGenesysOverlay();
      releaseRestartSendLock();
      Promise.resolve(triggerQuickReplySelection(matched)).catch(function () {
        showTyping(false);
      });
      return true;
    }

    if (pending && now - (pending.ts || 0) > 15000) {
      clearPendingInitialMenuSelection();
    }

    var lastText = String(lastSent.text || "").trim();
    if (!lastText) return false;
    if (now - (lastSent.ts || 0) > 15000) return false;

    clearAwaitGenesysOverlay();
    releaseRestartSendLock();

    Promise.resolve(sendText(lastText, null, { skipRender: true })).catch(
      function () {
        showTyping(false);
      },
    );

    return true;
  }

  function handleInitialMenuSelection(opt, container) {
    touchClientActivity();
    try {
      if (container) container.remove();
    } catch (e) {}

    showTyping(true);
    rememberPendingInitialMenuSelection(opt);

    primeConversationStart({
      readyTimeoutMs: 5000,
      settleMs: 0,
    })
      .then(function (started) {
        if (!started) throw new Error("bootstrap_failed");
        return Promise.resolve(triggerQuickReplySelection(opt));
      })
      .then(function (sent) {
        if (sent) {
          clearPendingInitialMenuSelection();
          return;
        }
        armPendingInitialMenuSelectionFallback();
      })
      .catch(function () {
        clearPendingInitialMenuSelection();
        showTyping(false);
      });
  }

  function makeQrBtn(opt) {
    var btn = document.createElement("button");
    btn.className = "quick-reply-btn";
    btn.textContent = opt.label || "Opcion";
    btn.addEventListener("click", function () {
      touchClientActivity();
      clearPendingInitialMenuSelection();
      try {
        var container = btn.closest(".quick-replies");
        if (container) container.remove();
      } catch (e) {}
      try {
        if (window.STELA_persistConversationEvent) {
          window.STELA_persistConversationEvent({
            type: "quickRepliesCleared",
            ts: Date.now(),
          });
        }
      } catch (_) {}
      triggerQuickReplySelection(opt);
    });
    return btn;
  }

  var MORE_PATTERNS = [
    "mas opciones",
    "ver mas",
    "more options",
    "mas",
    "ver mas",
    "siguiente",
    "otras opciones",
  ];

  function processQuickReplies(options, messageText, opts) {
    opts = opts || {};
    state.lastFullQR = state.lastFullQR || { text: "", options: [] };
 
    var qrStorageKey =
      "stela_qr_menus_v1:" +
      String(
        (window.STELA_CONTEXT && window.STELA_CONTEXT.identificacion) || "anon",
      ).trim();
 
    var storedMenus = [];
    try {
      var storedRaw = localStorage.getItem(qrStorageKey);
      if (storedRaw) {
        var storedData = JSON.parse(storedRaw);
        if (Array.isArray(storedData)) {
          storedMenus = storedData
            .map(function (menu) {
              if (
                !menu ||
                !Array.isArray(menu.options) ||
                !menu.options.length
              ) {
                return null;
              }
 
              return {
                text: String(menu.text || "").trim(),
                ts: Number(menu.ts || 0),
                options: menu.options
                  .map(function (opt) {
                    if (!opt) return null;
                    return {
                      label: String(opt.label || "").trim(),
                      value: String(opt.value || "").trim(),
                      action: String(opt.action || "Message").trim(),
                    };
                  })
                  .filter(Boolean),
              };
            })
            .filter(Boolean);
        }
      }
    } catch (_) {}
 
    if (
      state.lastFullQR &&
      Array.isArray(state.lastFullQR.options) &&
      state.lastFullQR.options.length
    ) {
      storedMenus.unshift({
        text: String(state.lastFullQR.text || "").trim(),
        ts: Date.now(),
        options: state.lastFullQR.options.map(function (opt) {
          return {
            label: String((opt && opt.label) || "").trim(),
            value: String((opt && opt.value) || "").trim(),
            action: String((opt && opt.action) || "Message").trim(),
          };
        }),
      });
    }
 
    var dedupMenus = [];
    var seenMenuKeys = Object.create(null);
 
    for (var sm = 0; sm < storedMenus.length; sm++) {
      var menu = storedMenus[sm];
      if (!menu || !Array.isArray(menu.options) || !menu.options.length)
        continue;
 
      var menuKeyParts = [];
      for (var so = 0; so < menu.options.length; so++) {
        var soLabel = normalizeMenuSelectionText(menu.options[so].label || "");
        var soValue = normalizeMenuSelectionText(
          menu.options[so].value || menu.options[so].label || "",
        );
        menuKeyParts.push(soLabel + "||" + soValue);
      }
      menuKeyParts.sort();
 
      var menuKey = menuKeyParts.join("__");
      if (seenMenuKeys[menuKey]) continue;
      seenMenuKeys[menuKey] = true;
      dedupMenus.push(menu);
    }
 
    storedMenus = dedupMenus;
 
    var moreOption = null;
    var normalOptions = [];
 
    options.forEach(function (opt) {
      if (isMoreOption(opt.label || opt.value || "")) {
        moreOption = opt;
      } else {
        normalOptions.push(opt);
      }
    });
 
    var currentText = String(messageText || "").trim();
    var normalizedCurrentText = normalizeMenuSelectionText(currentText);
 
    var isEmergencyPrompt =
      !!opts.menuEmergencia ||
      normalizedCurrentText.indexOf("no entendi tu consulta") !== -1 ||
      normalizedCurrentText.indexOf("elige una de las siguiente opciones") !==
        -1;
 
    if (!state.qrAccumulating && !moreOption && normalOptions.length > 0) {
      var bestMenu = null;
      var bestMatchCount = 0;
      var bestMenuSize = 0;
 
      for (var m = 0; m < storedMenus.length; m++) {
        var candidate = storedMenus[m];
        if (
          !candidate ||
          !Array.isArray(candidate.options) ||
          candidate.options.length <= normalOptions.length
        ) {
          continue;
        }
 
        var usedCandidate = Object.create(null);
        var matchCount = 0;
 
        for (var i = 0; i < normalOptions.length; i++) {
          var curLabel = normalizeMenuSelectionText(
            normalOptions[i].label || "",
          );
          var curValue = normalizeMenuSelectionText(
            normalOptions[i].value || normalOptions[i].label || "",
          );
 
          for (var j = 0; j < candidate.options.length; j++) {
            if (usedCandidate[j]) continue;
 
            var savedLabel = normalizeMenuSelectionText(
              candidate.options[j].label || "",
            );
            var savedValue = normalizeMenuSelectionText(
              candidate.options[j].value || candidate.options[j].label || "",
            );
 
            if (
              (curLabel && curLabel === savedLabel) ||
              (curValue && curValue === savedValue) ||
              (curLabel && curLabel === savedValue) ||
              (curValue && curValue === savedLabel)
            ) {
              usedCandidate[j] = true;
              matchCount++;
              break;
            }
          }
        }
 
        var requiredMatches = normalOptions.length >= 4 ? 4 : 2;
 
        if (
          matchCount >= requiredMatches &&
          (matchCount > bestMatchCount ||
            (matchCount === bestMatchCount &&
              candidate.options.length > bestMenuSize))
        ) {
          bestMenu = candidate;
          bestMatchCount = matchCount;
          bestMenuSize = candidate.options.length;
        }
      }
 
      if (isEmergencyPrompt && bestMenu) {
        state.lastFullQR = {
          text: bestMenu.text,
          options: bestMenu.options.slice(),
        };
        renderFinalQuickReplies(bestMenu.options);
        return;
      }
 
      var cleanCurrent = currentText.toLowerCase().replace(/\s+/g, "");
      var cleanSaved = (state.lastFullQR.text || "")
        .toLowerCase()
        .replace(/\s+/g, "");
 
      var textMatches =
        cleanSaved &&
        (cleanCurrent.indexOf(cleanSaved) !== -1 ||
          cleanSaved.indexOf(cleanCurrent) !== -1);
 
      var allMatch =
        state.lastFullQR.options.length > 0 &&
        normalOptions.every(function (no) {
          var noLabel = normalizeMenuSelectionText(no.label || "");
          var noValue = normalizeMenuSelectionText(no.value || no.label || "");
 
          return state.lastFullQR.options.some(function (fo) {
            var foLabel = normalizeMenuSelectionText(fo.label || "");
            var foValue = normalizeMenuSelectionText(
              fo.value || fo.label || "",
            );
 
            return (
              (noLabel && noLabel === foLabel) ||
              (noValue && noValue === foValue) ||
              (noLabel && noLabel === foValue) ||
              (noValue && noValue === foLabel)
            );
          });
        });
 
      if (
        allMatch &&
        state.lastFullQR.options.length > normalOptions.length &&
        textMatches
      ) {
        renderFinalQuickReplies(state.lastFullQR.options);
        return;
      }
    }
 
    state.qrAccumulator = state.qrAccumulator.concat(normalOptions);
 
    if (!state.qrAccumulating && messageText) {
      state.qrTextBubble = messageText;
    }
 
    if (moreOption) {
      state.qrAccumulating = true;
      showTyping(true);
      silentSendText(moreOption.value || moreOption.label || "Mas opciones");
    } else {
      state.qrAccumulating = false;
      showTyping(false);
 
      if (state.qrAccumulator.length > 0) {
        var finalText = (state.qrTextBubble || messageText || "").trim();
 
        if (!isEmergencyPrompt && finalText) {
          state.lastFullQR = {
            text: finalText,
            options: state.qrAccumulator.slice(),
          };
 
          var menusToSave = [
            {
              text: state.lastFullQR.text,
              ts: Date.now(),
              options: state.lastFullQR.options.map(function (opt) {
                return {
                  label: String((opt && opt.label) || "").trim(),
                  value: String((opt && opt.value) || "").trim(),
                  action: String((opt && opt.action) || "Message").trim(),
                };
              }),
            },
          ];
 
          for (var ex = 0; ex < storedMenus.length; ex++) {
            if (menusToSave.length >= 10) break;
            menusToSave.push(storedMenus[ex]);
          }
 
          var finalMenus = [];
          var finalSeen = Object.create(null);
 
          for (var fm = 0; fm < menusToSave.length; fm++) {
            var fmMenu = menusToSave[fm];
            if (
              !fmMenu ||
              !Array.isArray(fmMenu.options) ||
              !fmMenu.options.length
            )
              continue;
 
            var fmParts = [];
            for (var fo = 0; fo < fmMenu.options.length; fo++) {
              var foLabel = normalizeMenuSelectionText(
                fmMenu.options[fo].label || "",
              );
              var foValue = normalizeMenuSelectionText(
                fmMenu.options[fo].value || fmMenu.options[fo].label || "",
              );
              fmParts.push(foLabel + "||" + foValue);
            }
            fmParts.sort();
 
            var fmKey = fmParts.join("__");
            if (finalSeen[fmKey]) continue;
            finalSeen[fmKey] = true;
            finalMenus.push(fmMenu);
          }
 
          try {
            localStorage.setItem(qrStorageKey, JSON.stringify(finalMenus));
          } catch (_) {}
        }
 
        renderFinalQuickReplies(state.qrAccumulator);
      }
 
      state.qrAccumulator = [];
      state.qrTextBubble = null;
    }
  }

  async function silentSendText(text) {
    var t = (text || "").trim();
    if (!t) return;
    try {
      var ok = await sendText(t, null, { skipRender: true });
      if (!ok) {
        if (state.qrAccumulator.length) {
          state.qrAccumulating = false;
          renderFinalQuickReplies(state.qrAccumulator);
          state.qrAccumulator = [];
          state.qrTextBubble = null;
        }
        showTyping(false);
      }
    } catch (_) {
      if (state.qrAccumulator.length) {
        state.qrAccumulating = false;
        renderFinalQuickReplies(state.qrAccumulator);
        state.qrAccumulator = [];
        state.qrTextBubble = null;
      }
      showTyping(false);
    }
  }

  function renderStructuredBody(body) {
    try {
      if (!body) return false;
      var dir = String(body.direction || "Outbound").toLowerCase();
      var showAsIn = dir === "outbound";
      var content = Array.isArray(body.content) ? body.content : [];
      var quickOpts = [];
      var hasCarouselLikeContent = false;
      for (var i = 0; i < content.length; i++) {
        var item = content[i];
        if (!item) continue;
        var ct = String(item.contentType || item.type || "").toLowerCase();
        if (ct === "quickreply" && item.quickReply) {
          var qr = item.quickReply || {};
          quickOpts.push({
            label: qr.text || "Opcion",
            value: qr.payload || qr.text || "",
            action: qr.action || "Message",
          });
          continue;
        }
        if (
          ct === "carousel" &&
          item.carousel &&
          Array.isArray(item.carousel.cards)
        ) {
          hasCarouselLikeContent = true;
          var cards = item.carousel.cards.map(function (c) {
            return {
              title: c.title || "",
              description: c.description || c.text || "",
              image: c.image || (c.image && c.image.url) || "",
              actions: c.actions || c.buttons || [],
            };
          });
          if (cards.length) addCarousel(cards);
          continue;
        }
        if (ct === "card" && item.card) {
          hasCarouselLikeContent = true;
          var cc = item.card || {};
          addCarousel([
            {
              title: cc.title || "",
              description: cc.description || cc.text || "",
              image: cc.image || (cc.image && cc.image.url) || "",
              actions: cc.actions || cc.buttons || [],
            },
          ]);
          continue;
        }
        if (ct === "image" || ct === "picture") {
          var u =
            (item.image && item.image.url) ||
            item.url ||
            item.src ||
            (typeof item.image === "string" ? item.image : "");
          var cap = (item.image && item.image.caption) || item.caption || "";
          if (!showAsIn) removePendingUploadBubble("");
          if (u) addImage(u, cap, null, showAsIn ? "in" : "out");
          continue;
        }
 
        if (ct === "attachment" && item.attachment) {
          var att = item.attachment;
          var attUrl = att.url || "";
          var attMime = String(att.mime || "").toLowerCase();
          var attMedia = String(att.mediaType || "").toLowerCase();
          var attName = resolveAttachmentFileName(
            att.filename || "Archivo",
            attMime,
            attUrl,
          );
          if (!showAsIn) removePendingUploadBubble(attName);
 
          if (attMedia === "image" || attMime.indexOf("image/") === 0) {
            addImage(attUrl, attName, null, showAsIn ? "in" : "out");
          } else {
            addFileAttachment(
              attUrl,
              attName,
              attMime,
              att.fileSize || 0,
              null,
              showAsIn ? "in" : "out",
            );
          }
          continue;
        }
      }
      var structuredMenuEmergencia = false;
      if (body.text) {
        body.text = extractConversationId(body.text);
        var structHint = extractStructuredMenuHints(body.text);
        body.text = structHint.text;
        structuredMenuEmergencia = structHint.menuEmergencia;
        if (!state.qrAccumulating) {
          var skipText =
            isCarouselPromptNotice(body.text) &&
            hasCarouselLikeContent &&
            !quickOpts.length;
          if (!skipText) {
            addBubble(showAsIn ? "in" : "out", body.text);
            if (showAsIn && String(body.text || "").trim()) {
              clearAwaitGenesysOverlay();
              releaseRestartSendLock();
            }
            if (showAsIn)
              noteVirtualAssistantSecurityClosureFromText(body.text);
          }
        }
      }
      if (quickOpts.length) {
        if (
          showAsIn &&
          maybeAutoForwardPendingInitialMenuSelection(
            quickOpts,
            body.text || "",
          )
        ) {
          return true;
        }
        processQuickReplies(quickOpts, body.text || "", {
          menuEmergencia: structuredMenuEmergencia,
        });
      } else if (
        body.text &&
        showAsIn &&
        isLikelyMainMenuPromptText(body.text)
      ) {
        clearAwaitGenesysOverlay();
        releaseRestartSendLock();
      }
      return true;
    } catch (e) {
      debugLog("renderStructuredBody err: " + e.message, "err");
      return false;
    }
  }

  var _outboundResolver = null;
  var _remoteCloseResolver = null;
  function notifyGenesysRemoteClose(info) {
    if (!_remoteCloseResolver) return;
    try {
      _remoteCloseResolver(info || {});
    } catch (_) {}
    _remoteCloseResolver = null;
  }
  function waitForGenesysRemoteClose(timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(
        function () {
          if (done) return;
          done = true;
          if (_remoteCloseResolver) _remoteCloseResolver = null;
          resolve({ ok: false, source: "timeout" });
        },
        Math.max(0, Number(timeoutMs) || 4000),
      );
      _remoteCloseResolver = function (info) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ ok: true, info: info || {} });
      };
    });
  }
  function waitForOutboundMessage(timeoutMs) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () {
        _outboundResolver = null;
        resolve();
      }, timeoutMs || 15000);
      _outboundResolver = function () {
        clearTimeout(timer);
        _outboundResolver = null;
        resolve();
      };
    });
  }

  function handleIncomingMessage(m) {
    captureConversationIdFromInbound(m);
    var dir = String(
      m.direction || (m.body && m.body.direction) || "",
    ).toLowerCase();
 
    if (dir !== "inbound") {
      var msgOriginatingEntity = String(
        m.originatingEntity || (m.body && m.body.originatingEntity) || "",
      ).toLowerCase();
 
      var msgNickname = String(
        (m.channel && m.channel.from && m.channel.from.nickname) ||
          (m.body &&
            m.body.channel &&
            m.body.channel.from &&
            m.body.channel.from.nickname) ||
          "",
      )
        .trim()
        .toLowerCase();
 
      if (
        hasPositiveHumanAgentSignal({ data: m }) ||
        (msgOriginatingEntity &&
          msgOriginatingEntity.indexOf("bot") === -1 &&
          msgOriginatingEntity.indexOf("flow") === -1 &&
          msgOriginatingEntity.indexOf("architect") === -1) ||
        (msgNickname && msgNickname !== "stela")
      ) {
        state.lastHumanAgentSignalTs = Date.now();
      }
    }
 
    if (_outboundResolver && dir !== "inbound") {
      var cb = _outboundResolver;
      cb();
      if (state.suppressNextIncoming) {
        state.suppressNextIncoming = false;
        return;
      }
    }
 
    if (shouldSuppressReconnect()) return;
 
    var direction = dir;
    var id = m.id || m.messageId || "";
    if (id && state.seenIds.has(id)) return;
    if (id) state.seenIds.add(id);
 
    if (m.body && m.body.type === "Structured") {
      if (renderStructuredBody(m.body) && direction !== "inbound") {
        releaseRestartSendLock();
      }
      return;
    }
 
    if (
      String(m.type || "").toLowerCase() === "structured" ||
      Array.isArray(m.content)
    ) {
      if (renderStructuredBody(m) && direction !== "inbound") {
        releaseRestartSendLock();
      }
      return;
    }
 
    var bodyObj = m.body && typeof m.body === "object" ? m.body : null;
    var text =
      m.text ||
      (bodyObj && bodyObj.text) ||
      (typeof m.body === "string" ? m.body : null) ||
      m.message ||
      "";
 
    if (!text) return;
 
    text = extractConversationId(text);
 
    if (direction !== "inbound" && isGeoActivationKeyword(text)) {
      state.suppressNextIncoming = false;
      // Ejecuta el mismo flujo anterior (incluye manejo de "sin permisos") pero sin mostrar el texto recibido
      captureGeoAndSend("").catch(function () {});
      return;
    }
 
    if (consumeHiddenEcho(text)) return;
    if (isLatLonText(text)) return;
    if (isConnectionRequiredNotice(text)) return;
 
    if (direction === "inbound") {
      if (text === state.lastSent.text && Date.now() - state.lastSent.ts < 2500)
        return;
      addBubble("out", text);
    } else {
      if (isClosureNotice(text)) {
        if (shouldSkipRepeatedClosureText(text, "lastCloseInbound", 60000))
          return;
        noteVirtualAssistantSecurityClosureFromText(text);
        clearAwaitGenesysOverlay();
        addBubble("in", text);
        showConnBanner("failed", text);
        return;
      }
 
      if (isCarouselPromptNotice(text)) {
        if (maybeAutoForwardPendingInitialMenuSelection([], text)) {
          return;
        }
        releaseRestartSendLock();
        clearAwaitGenesysOverlay();
        return;
      }
 
      releaseRestartSendLock();
      clearAwaitGenesysOverlay();
      addBubble("in", text);
    }
  }

  function parseErr(err) {
    try {
      if (!err) return { msg: "", code: null, key: "" };
      var data = err.data || err;
      var e = data.error || data;
      var code = e.code || e.status || null;
      var body = e.body || e.message || "";
      var key = e.errorKey || "";
      var msg = typeof body === "string" ? body : JSON.stringify(body);
      return { msg: msg, code: code, key: key };
    } catch (_) {
      return { msg: String(err), code: null, key: "" };
    }
  }

  function genesysCmd(name, payload) {
    return new Promise(function (resolve) {
      var isDone = false;
      var timer = setTimeout(function () {
        if (!isDone) {
          isDone = true;
          resolve({ ok: false, err: { message: "timeout_silencioso" } });
        }
      }, 10000);

      try {
        window.Genesys(
          "command",
          name,
          payload || {},
          function (data) {
            if (!isDone) {
              isDone = true;
              clearTimeout(timer);
              resolve({ ok: true, data: data });
            }
          },
          function (err) {
            if (!isDone) {
              isDone = true;
              clearTimeout(timer);
              resolve({ ok: false, err: err });
            }
          },
        );
      } catch (e) {
        if (!isDone) {
          isDone = true;
          clearTimeout(timer);
          resolve({ ok: false, err: e });
        }
      }
    });
  }

  function queueHiddenEcho(text, times) {
    var t = String(text || "").trim();
    if (!t) return;
    var n = typeof times === "number" ? times : 2;
    state.hiddenOutboundMap[t] = (state.hiddenOutboundMap[t] || 0) + n;
  }

  function consumeHiddenEcho(text) {
    var t = String(text || "").trim();
    if (!t) return false;
    if (state.hiddenOutboundMap[t] > 0) {
      state.hiddenOutboundMap[t]--;
      if (state.hiddenOutboundMap[t] <= 0) delete state.hiddenOutboundMap[t];
      return true;
    }
    return false;
  }

  function isLatLonText(text) {
    var t = String(text || "").trim();
    return /^-?\d+(?:\.\d+)?\|-?\d+(?:\.\d+)?$/.test(t);
  }

  async function sendHiddenText(text, metadata, ignoreEchoCount) {
    var t = String(text || "").trim();
    if (!t) return false;
    if (!state.messagingReady || !state.sessionActive || state.sessionEnded)
      return false;
    queueHiddenEcho(
      t,
      typeof ignoreEchoCount === "number" ? ignoreEchoCount : 2,
    );
    var payload = { message: t };
    if (metadata) payload.metadata = metadata;
    var res = await genesysCmd("MessagingService.sendMessage", payload);
    if (!res.ok) {
      consumeHiddenEcho(t);
      return false;
    }
    return true;
  }
  function waitMs(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  var CONVERSATION_BOOTSTRAP_TEXT = "iniciar";
  var REOPEN_CONVERSATION_BOOTSTRAP_TEXT = "inicio";
  var CONVERSATION_BOOTSTRAP_SETTLE_MS = 350;
  var CONVERSATION_RESET_SETTLE_MS = 120;

  /** Espera a messagingReady + sessionActive. tryReconnect: como maximo UNA llamada a startConversation (no en bucle). */
  async function waitForConversationReady(timeoutMs, opts) {
    var startedAt = Date.now();
    var max = Math.max(500, Number(timeoutMs) || 7000);
    var tryReconnect = !!(opts && opts.tryReconnect);
    var reconnectStartOpts =
      opts && typeof opts.reconnectStartOpts === "object"
        ? opts.reconnectStartOpts
        : null;
    var reconnectAttempted = false;
    while (Date.now() - startedAt < max) {
      if (state.messagingReady && state.sessionActive && !state.sessionEnded) {
        return true;
      }

      if (
        tryReconnect &&
        !reconnectAttempted &&
        state.messengerReady &&
        !state.connecting &&
        !state.geoFlowInProgress &&
        !shouldSuppressReconnect()
      ) {
        reconnectAttempted = true;
        try {
          await startConversation(reconnectStartOpts || {});
        } catch (_) {}
      }

      await waitMs(100);
    }
    return state.messagingReady && state.sessionActive && !state.sessionEnded;
  }

  async function primeConversationStart(opts) {
    opts = opts || {};
    var readyTimeoutMs = Math.max(500, Number(opts.readyTimeoutMs) || 8000);
    var settleMs = Math.max(
      0,
      Number(opts.settleMs) || CONVERSATION_BOOTSTRAP_SETTLE_MS,
    );
    var bootstrapText = String(
      opts.bootstrapText || CONVERSATION_BOOTSTRAP_TEXT,
    ).trim();
    if (!bootstrapText) bootstrapText = CONVERSATION_BOOTSTRAP_TEXT;

    if (!state.messagingReady || !state.sessionActive || state.sessionEnded) {
      if (
        !state.connecting &&
        !shouldSuppressReconnect() &&
        !state.geoFlowInProgress
      ) {
        await startConversation();
      }
      var ready = await waitForConversationReady(readyTimeoutMs, {
        tryReconnect: false,
      });
      if (!ready) return false;
    }

    var ok = await sendHiddenText(
      bootstrapText,
      { hidden: true, source: "bootstrap" },
      3,
    );
    if (!ok) {
      queueHiddenEcho(bootstrapText, 3);
      ok = await sendText(bootstrapText, null, {
        skipRender: true,
      });
      if (!ok) {
        delete state.hiddenOutboundMap[bootstrapText];
        return false;
      }
    }

    if (settleMs > 0) {
      await waitMs(settleMs);
    }
    return true;
  }

  function sendGeoOnlyInBackground() {
    if (state.geoFlowInProgress) return;
    if (!("geolocation" in navigator)) {
      state.suppressNextIncoming = false;
      addBubble(
        "in",
        "Por favor, recuerda que debes otorgar los permisos de ubicación en el navegador.",
      );
      renderFinalQuickReplies([
        { label: "Menú principal", value: "Menú principal", action: "Message" },
      ]);
      return;
    }
    state.geoFlowInProgress = true;
    navigator.geolocation.getCurrentPosition(
      async function (pos) {
        try {
          state.device.latitud = pos.coords.latitude;
          state.device.longitud = pos.coords.longitude;
          await ensureCustomAttributes(true);
          var lat = Number(pos.coords.latitude).toFixed(6);
          var lon = Number(pos.coords.longitude).toFixed(6);
          var geoMessage = lat + "|" + lon;
          state.lastHiddenGeo = { value: geoMessage, ts: Date.now() };
          await waitMs(600);
          await sendHiddenGeoWithRetry(geoMessage, 3, { skipReconnect: true });
        } finally {
          state.geoFlowInProgress = false;
        }
      },
      function () {
        state.geoFlowInProgress = false;
        state.suppressNextIncoming = false;
        addBubble(
          "in",
          "Por favor, recuerda que debes otorgar los permisos de ubicación en el navegador.",
        );
        renderFinalQuickReplies([
          {
            label: "Menú principal",
            value: "Menú principal",
            action: "Message",
          },
        ]);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  async function sendHiddenGeoWithRetry(geoMessage, attempts, opts) {
    var maxAttempts = Math.max(1, Number(attempts) || 3);
    var skipReconnect = !!(opts && opts.skipReconnect);
    for (var i = 0; i < maxAttempts; i++) {
      if (i > 0) await waitMs(500 * (i + 1));

      var ok = await sendHiddenText(
        geoMessage,
        { hidden: true, source: "geo" },
        3,
      );
      if (ok) return true;

      if (
        !skipReconnect &&
        state.messengerReady &&
        (!state.sessionActive || state.sessionEnded) &&
        !state.connecting &&
        !state.geoFlowInProgress &&
        !shouldSuppressReconnect()
      ) {
        try {
          await startConversation();
          await waitMs(700);
        } catch (_) {}
      }
    }
    return false;
  }

  function buildCustomAttrs(includeGeo) {
    var ctx = window.STELA_CONTEXT || {};
    var nombre = String(
      ctx.nombreUsuario != null ? ctx.nombreUsuario : "",
    ).trim();
    return {
      latitud:
        includeGeo && state.device.latitud != null
          ? String(state.device.latitud)
          : "",
      longitud:
        includeGeo && state.device.longitud != null
          ? String(state.device.longitud)
          : "",
      identificacion: ctx.identificacion ? String(ctx.identificacion) : "",
      tipoDispositivo: ctx.tipoDispositivo ? String(ctx.tipoDispositivo) : "",
      nombreUsuario: nombre,
      participantName: nombre,
      // Genesys usa esta clave en customAttributes para el nombre en vista de interacción / remoto
      name: nombre,
      displayName: nombre,
    };
  }

  async function ensureCustomAttributes(includeGeo) {
    if (!window.Genesys) return false;

    var v = validateRequired();
    if (!v.ok) return false;

    var attrs = buildCustomAttrs(!!includeGeo);

    var sig = "";
    try {
      sig = JSON.stringify(attrs);
    } catch (_) {
      sig = String(Date.now());
    }

    var now = Date.now();
    if (sig === state.attrsLastSig && now - state.attrsLastTs < 4000) {
      return true;
    }

    var res = await genesysCmd("Database.set", {
      messaging: { customAttributes: attrs },
    });

    if (!res.ok) {
      return false;
    }

    state.attrsLastSig = sig;
    state.attrsLastTs = now;
    return true;
  }

  function onStarted() {
    setSesionStele(false);
    setSesionPhase("active");
    if (state.wasPreconnectingAfterEnd) state.wasPreconnectingAfterEnd = false;
    state.sessionActive = true;
    state.sessionEnded = false;
    state.humanAgentFarewellShown = false;
    state.lastVirtualAssistantClosureTs = 0;
    state.lastHumanAgentSignalTs = 0;
    state.connecting = false;
    touchClientActivity();
    startKeepAliveSignal();
    hideEnded();
    hideConnBanner();
    setStatusDot("connected", "Conectado");
    showChat();
  }

  async function closeGenesysConversation(opts) {
    opts = opts || {};
    var ensureConversation = opts.ensureConversation === true;
    var endWaitMs = Math.max(0, Number(opts.endWaitMs));
    var clearWaitMs = Math.max(0, Number(opts.clearWaitMs));
    var confirmTimeoutMs = Number(opts.confirmTimeoutMs);
    if (!isFinite(confirmTimeoutMs)) confirmTimeoutMs = 2800;
    confirmTimeoutMs = Math.max(0, confirmTimeoutMs);
    var commandTimeoutMs = Number(opts.commandTimeoutMs);
    if (!isFinite(commandTimeoutMs)) commandTimeoutMs = 4500;
    commandTimeoutMs = Math.max(800, commandTimeoutMs);
    if (!isFinite(endWaitMs)) endWaitMs = 180;
    if (!isFinite(clearWaitMs)) clearWaitMs = 180;
    function closeCmd(name, payload) {
      return Promise.race([
        genesysCmd(name, payload),
        waitMs(commandTimeoutMs).then(function () {
          return {
            ok: false,
            source: "command_timeout",
            err: { message: "close_command_timeout", command: name },
          };
        }),
      ]);
    }
    function isActiveConversationError(res) {
      var p = parseErr(res && res.err);
      var msg = String(p.msg || "").toLowerCase();
      return msg.indexOf("already an active conversation") !== -1;
    }
    async function joinIfPossible(waitAfterMs) {
      var joinRes = await closeCmd("MessagingService.joinConversation", {});
      if (joinRes.ok) await waitMs(waitAfterMs || 300);
      return joinRes;
    }
    async function startIfPossible(waitAfterMs) {
      var startRes = await closeCmd("MessagingService.startConversation", {});
      if (startRes.ok) {
        await waitMs(waitAfterMs || 500);
        return startRes;
      }
      if (isActiveConversationError(startRes)) {
        return joinIfPossible(waitAfterMs || 300);
      }
      return startRes;
    }
    async function getConversationState() {
      if (!state.messagingReady) {
        return {
          ok: false,
          source: "messaging_not_ready",
          data: null,
          res: null,
        };
      }
      var cfgRes = await closeCmd("MessagingService.configureConversation", {});
      if (!cfgRes.ok) {
        return {
          ok: false,
          source: "configure_failed",
          data: null,
          res: cfgRes,
        };
      }
      var cfgData = cfgRes.data || {};
      return {
        ok: true,
        source: "configureConversation",
        isSessionActive: !!cfgData.isSessionActive,
        isReadOnly: !!cfgData.isReadOnly,
        data: cfgData,
        res: cfgRes,
      };
    }
    async function waitForConversationInactive(timeoutMs) {
      var t = Number(timeoutMs);
      var timeout = isFinite(t) && t >= 0 ? Math.max(100, t) : 2500;
      var deadline = Date.now() + timeout;
      var lastState = null;
      while (Date.now() < deadline) {
        lastState = await getConversationState();
        if (lastState.ok && !lastState.isSessionActive) {
          return {
            ok: true,
            source: "configureConversation",
            data: lastState.data || null,
          };
        }
        await waitMs(150);
      }
      return {
        ok: false,
        source: "inactive_timeout",
        data: lastState && lastState.data ? lastState.data : null,
        res: lastState && lastState.res ? lastState.res : null,
      };
    }
    async function confirmClosure(waitRemotePromise, fallbackTimeoutMs) {
      var remoteInfo = await waitRemotePromise;
      if (remoteInfo && remoteInfo.ok) return remoteInfo;
      var inactiveInfo = await waitForConversationInactive(
        Math.min(
          confirmTimeoutMs,
          Math.max(1000, Number(fallbackTimeoutMs) || 2500),
        ),
      );
      if (inactiveInfo.ok) return inactiveInfo;
      return remoteInfo && remoteInfo.source ? remoteInfo : inactiveInfo;
    }
    var skipConfirmation = opts.skipConfirmation === true;
    async function attemptCloseSequence(label) {
      var endSignal = skipConfirmation
        ? null
        : waitForGenesysRemoteClose(confirmTimeoutMs);
      endRes = await closeCmd("MessagingService.endConversation", {});
      if (endRes.ok) {
        if (!skipConfirmation) {
          if (endWaitMs > 0) await waitMs(endWaitMs);
          endConfirm = await confirmClosure(endSignal, endWaitMs + 1200);
        } else {
          endConfirm = { ok: true, source: label + "_end_skip_confirm" };
          clearRes = { ok: false };
          clearConfirm = {
            ok: false,
            source: label + "_clear_skipped_after_end",
          };
          return true;
        }
      } else {
        _remoteCloseResolver = null;
        endConfirm = { ok: false, source: label + "_end_failed" };
      }

      var clearSignal = skipConfirmation
        ? null
        : waitForGenesysRemoteClose(confirmTimeoutMs);
      clearRes = await closeCmd("MessagingService.clearConversation", {});
      if (clearRes.ok) {
        if (!skipConfirmation) {
          if (clearWaitMs > 0) await waitMs(clearWaitMs);
          clearConfirm = await confirmClosure(clearSignal, clearWaitMs + 1200);
        } else {
          clearConfirm = { ok: true, source: label + "_clear_skip_confirm" };
        }
      } else {
        _remoteCloseResolver = null;
        clearConfirm = { ok: false, source: label + "_clear_failed" };
      }

      return !!(endConfirm.ok || clearConfirm.ok);
    }

    if (!window.Genesys) {
      return { ok: false, ended: false, cleared: false };
    }

    var prepareRes = { ok: false };
    if (ensureConversation && state.messagingReady) {
      var cfg = await closeCmd("MessagingService.configureConversation", {});
      if (cfg.ok) {
        var d = cfg.data || {};
        if (d.isSessionActive) {
          prepareRes = await joinIfPossible(300);
        } else if (!d.isReadOnly) {
          prepareRes = await startIfPossible(500);
        }
      } else if (isActiveConversationError(cfg)) {
        prepareRes = await joinIfPossible(300);
      } else {
        prepareRes = await startIfPossible(500);
      }
    }

    var endRes = { ok: false, err: null };
    var endConfirm = { ok: false, source: "end_not_attempted" };
    var clearRes = { ok: false, err: null };
    var clearConfirm = { ok: false, source: "clear_not_attempted" };

    var confirmedRemote = await attemptCloseSequence("initial");

    if (!confirmedRemote && ensureConversation && state.messagingReady) {
      var retryAttachRes = await joinIfPossible(300);
      if (!retryAttachRes.ok) {
        retryAttachRes = await startIfPossible(500);
      }
      if (retryAttachRes.ok) {
        confirmedRemote = await attemptCloseSequence("retry");
      }
    }

    var confirmInfo = clearConfirm.ok
      ? clearConfirm
      : endConfirm.ok
        ? endConfirm
        : clearConfirm.source
          ? clearConfirm
          : endConfirm;

    return {
      ok: !!(confirmedRemote || endRes.ok || clearRes.ok),
      ended: !!endRes.ok,
      cleared: !!clearRes.ok,
      prepared: !!prepareRes.ok,
      confirmedRemote: confirmedRemote,
      confirmInfo: confirmInfo,
      prepareRes: prepareRes,
      endRes: endRes,
      clearRes: clearRes,
    };
  }

  async function startConversation(opts) {
    opts = opts || {};
    var forceNew = opts.forceNew === true;
    if (state.connecting) return;
    if (state.geoFlowInProgress) return;
    if (shouldSuppressReconnect()) return;
    if (!state.messengerReady) return;

    state.connecting = true;

    if (state.messagingReady) {
      hideEnded();
      if (!state.wasPreconnectingAfterEnd) hideConnBanner();
      showChat();
    }

    await ensureCustomAttributes(true);

    var silentReconnect = !!state.restartSendInFlight;
    if (state.silentConnectForInitialOpen) {
      state.silentConnectForInitialOpen = false;
      silentReconnect = true;
    }
    if (!state.messagingReady) {
      stopAwaitGenesysOverlay();
      if (state.usingNativeUI) {
        if (!silentReconnect)
          setStatusDot("connecting", "Abriendo Messenger nativo...");
        var nativeOpen = await genesysCmd("Messenger.open", {});
        if (!nativeOpen.ok) {
          var np = parseErr(nativeOpen.err);
          var nmsg = (np.msg || "").toLowerCase();
          if (nmsg.indexOf("messenger user interface must be enabled") !== -1) {
            state.usingNativeUI = false;
            if (!silentReconnect)
              setStatusDot("disconnected", "Esperando servicio...");
          }
        }
      } else {
        if (!silentReconnect)
          setStatusDot("connecting", "Esperando servicio de mensajeria...");
      }
      state.connecting = false;
      return;
    }
    if (!state.awaitGenesysMessageForOverlay) {
      hideEnded();
      if (!state.wasPreconnectingAfterEnd) hideConnBanner();
      showChat();
    }
    if (!silentReconnect) setStatusDot("connecting", "Conectando...");

    if (forceNew) {
      var forcedStart = await genesysCmd(
        "MessagingService.startConversation",
        {},
      );
      if (!forcedStart.ok) {
        var fp = parseErr(forcedStart.err);
        var fmsg = (fp.msg || "").toLowerCase();
        if (
          fmsg.indexOf("already an active conversation") !== -1 ||
          fmsg.indexOf("session has ended") !== -1 ||
          fmsg.indexOf("start a new session") !== -1
        ) {
          try {
            await genesysCmd("MessagingService.clearConversation", {});
          } catch (_) {}
          await waitMs(CONVERSATION_RESET_SETTLE_MS);
          forcedStart = await genesysCmd(
            "MessagingService.startConversation",
            {},
          );
        }
      }
      if (!forcedStart.ok) {
        var forcedErr = parseErr(forcedStart.err);
        var forcedMsg = (forcedErr.msg || "").toLowerCase();
        if (
          forcedErr.code === 409 ||
          forcedErr.key === "readOnlySession" ||
          forcedMsg.indexOf("read-only") !== -1
        ) {
          showEnded("Sesion readOnly. Inicia una nueva conversacion.");
        }
        stopAwaitGenesysOverlay();
        state.connecting = false;
        return;
      }
      if (!shouldSuppressReconnect()) {
        onStarted();
        state.isFreshStart = false;
      } else {
        state.connecting = false;
      }
      return;
    }

    var cfg = await genesysCmd("MessagingService.configureConversation", {});
    if (cfg.ok) {
      var d = cfg.data || {};
      if (d.isReadOnly) {
        showEnded("Sesion readOnly. Inicia una nueva conversacion.");
        state.connecting = false;
        return;
      }
      if (d.isSessionActive) {
        await ensureCustomAttributes(true);
        var join = await genesysCmd("MessagingService.joinConversation", {});
        state.connecting = false;
        if (join.ok) {
          onStarted();
          return;
        }
        stopAwaitGenesysOverlay();
        return;
      }
    } else {
      var cfgErr = parseErr(cfg.err);
      var cfgMsg = (cfgErr.msg || "").toLowerCase();
      if (cfgMsg.indexOf("already an active conversation") !== -1) {
        var joinCfg = await genesysCmd("MessagingService.joinConversation", {});
        state.connecting = false;
        if (joinCfg.ok) {
          onStarted();
          return;
        }
        stopAwaitGenesysOverlay();
        return;
      }
    }

    var res = await genesysCmd("MessagingService.startConversation", {});
    if (!res.ok) {
      var p = parseErr(res.err);
      var errMsg = (p.msg || "").toLowerCase();

      if (errMsg.indexOf("already an active conversation") !== -1) {
        var join2 = await genesysCmd("MessagingService.joinConversation", {});
        state.connecting = false;
        if (join2.ok) {
          onStarted();
          return;
        }
        stopAwaitGenesysOverlay();
        return;
      }
      if (
        p.code === 409 ||
        p.key === "readOnlySession" ||
        errMsg.indexOf("read-only") !== -1
      ) {
        showEnded("Sesion readOnly. Inicia una nueva conversacion.");
      }
      stopAwaitGenesysOverlay();
      state.connecting = false;
      return;
    }

    // Mismo criterio que joinConversation: el SDK suele emitir MessagingService.started
    // justo después; onStarted es idempotente (p. ej. keepAlive ya evita doble interval).
    if (!shouldSuppressReconnect()) {
      onStarted();
      state.isFreshStart = false;
    } else {
      state.connecting = false;
    }
  }

  async function endConversation() {
    setSesionPhase("ended");
    clearPendingInitialMenuSelection();
    state.resetting = true;
    state.suppressRestoredUntil = Date.now() + 10000;
    state.sessionActive = false;
    state.sessionEnded = true;
    state.connecting = false;
    stopKeepAliveSignal();

    await closeGenesysConversation({ ensureConversation: false });

    showEnded("Has terminado la conversacion.");
    state.resetting = false;
    state.suppressRestoredUntil = 0;
  }

  async function newConversation(opts) {
    if (state.resetting) return;
    debugger;
    clearPendingInitialMenuSelection();
    clearPendingRestartMessage();

    var preserveHistory = !!(opts && opts.preserveHistory);

    stopKeepAliveSignal();
    state.resetting = true;
    state.suppressRestoredUntil = Date.now() + 10000;

    state.isFreshStart = true;
    state.geoFlowInProgress = false;
    state.lastHiddenGeo = { value: "", ts: 0 };

    hideEnded();
    hideConnBanner();

    if (preserveHistory) {
      showChat();
      setStatusDot("disconnected", "");
    } else {
      showLoading("Conectando.");
    }

    try {
      await genesysCmd("MessagingService.clearConversation", {});
    } catch (_) {}

    if (CONVERSATION_RESET_SETTLE_MS > 0) {
      await waitMs(CONVERSATION_RESET_SETTLE_MS);
    }

    resetMessages({ preserveHistory: preserveHistory });

    if (!preserveHistory) {
      try {
        if (window.STELA_chatKeys) {
          var keys = window.STELA_chatKeys();
          for (var kIdx = 0; kIdx < keys.length; kIdx++) {
            localStorage.removeItem(keys[kIdx]);
          }
        } else if (window.STELA_chatKey) {
          localStorage.removeItem(window.STELA_chatKey());
        }

        if (window.STELA_chatMetaKey) {
          localStorage.removeItem(window.STELA_chatMetaKey);
        }
      } catch (_) {}
    }

    state.sessionActive = false;
    state.sessionEnded = false;
    state.connecting = false;
    state.restoredOnce = false;
    state.seenIds.clear();

    state.resetting = false;
    state.suppressRestoredUntil = 0;
    hideLoading();

    if (!preserveHistory) {
      setStatusDot("connecting", "Conectando.");
      showLoading("Conectando.");
    } else {
      setStatusDot("disconnected", "");
      showChat();
    }

    touchClientActivity();
    await startConversation({ forceNew: true });

    var ready = await waitForConversationReady(8000, {
      tryReconnect: false,
    });

    if (ready && !preserveHistory && !chatSurfaceHasVisibleContent()) {
      try {
        await primeConversationStart({
          readyTimeoutMs: 1200,
          settleMs: 0,
          bootstrapText: REOPEN_CONVERSATION_BOOTSTRAP_TEXT,
        });
      } catch (_) {}
    }
  }

  function hideLoading() {
    if (!state.connecting && !state.awaitGenesysMessageForOverlay)
      hideSessionLoadingOverlay();
  }

  async function sendMessagePayload(payload) {
    var res = await genesysCmd("MessagingService.sendMessage", payload);
    if (res.ok) return true;

    var pSend = parseErr(res.err);
    var sendMsg = (pSend.msg || "").toLowerCase();
    var sessionEndedError =
      sendMsg.indexOf("session has ended") !== -1 ||
      sendMsg.indexOf("start a new session") !== -1;

    setSesionStele(!!sessionEndedError);
    if (sessionEndedError) setSesionPhase("ended");
    state.sessionActive = false;
    state.sessionEnded = !!sessionEndedError;
    state.connecting = false;
    dismissSessionLoadingOverlayFully();
    showChat();
    return false;
  }

  async function sendText(text, metadata, opts) {
    var t = (text || "").trim();
    if (!t) return false;
    opts = opts || {};
    var skipRender = !!opts.skipRender;
    var endedSession = state.sessionEnded || isSesionEndedPersisted();
    var restartingFromEnded = false;
    touchClientActivity();

    if (state.restartSendInFlight && !skipRender) {
      return false;
    }

    if (endedSession && !skipRender) {
      restartingFromEnded = true;
      state.sessionEnded = true;
      if (el.sessionLoadingText) {
        el.sessionLoadingText.textContent = "";
      }
      showSessionLoadingOverlay();
      beginAwaitGenesysMessageForOverlay();
      hideEnded();
      hideConnBanner();
      setSesionStele(false);
      setSesionPhase("");
      state.sessionActive = false;
      state.sessionEnded = false;
      state.connecting = false;
      try {
        await genesysCmd("MessagingService.clearConversation", {});
      } catch (_) {}
      await waitMs(CONVERSATION_RESET_SETTLE_MS);
    }

    if (!state.messagingReady || !state.sessionActive || state.sessionEnded) {
      if (
        !state.connecting &&
        !shouldSuppressReconnect() &&
        !state.geoFlowInProgress
      ) {
        await startConversation({ forceNew: restartingFromEnded });
        await waitForConversationReady(8000, { tryReconnect: false });
      }
      if (!state.messagingReady || !state.sessionActive || state.sessionEnded) {
        if (restartingFromEnded) {
          dismissSessionLoadingOverlayFully();
          showTyping(false);
        }
        return false;
      }
    }

    await ensureCustomAttributes(true);

    state.lastSent = { text: t, ts: Date.now() };
    if (!skipRender) {
      addBubble("out", t);
      clearComposer();
      updateSend();
    }
    showTyping(true);
    var payload = { message: t };
    if (metadata) payload.metadata = metadata;

    var ok = await sendMessagePayload(payload);
    if (!ok) showTyping(false);
    return ok;
  }

  async function requestUpload(file) {
    if (!file) return;
    if (!state.messagingReady || !state.sessionActive || state.sessionEnded)
      return;
    file = normalizeUploadFile(
      file,
      file && file.type ? buildClipboardFileName(file.type) : "Archivo",
    );
    var b = addBubble("out", file.name + " (subiendo...)");
    rememberPendingUploadBubble(file.name, b);
    var dt = new DataTransfer();
    dt.items.add(file);
    var res = await genesysCmd("MessagingService.requestUpload", {
      file: dt.files,
    });
    if (!res.ok) {
      forgetPendingUploadBubbleByWrap(b.wrap);
      if (b.bubble) b.bubble.textContent = file.name + " (error al subir)";
    } else {
      if (b.bubble) b.bubble.textContent = file.name + " (procesando...)";
    }
  }

function subscribeOnce() {    
if (window.__STELA_GENESYS_SUBSCRIBE_DONE__) return;
    window.__STELA_GENESYS_SUBSCRIBE_DONE__ = true;
    state.subscribed = true;
 
    function maybeStartConversationIfPanelOpen() {
      if (
        state.messagingReady &&
        el.win &&
        el.win.classList.contains("open") &&
        !state.sessionActive &&
        !state.connecting &&
        !shouldSuppressReconnect()
      ) {
        startConversation();
      }
    }
 
    window.Genesys("subscribe", "Messenger.ready", function () {
      if (state.messengerReady) return;
      state.messengerReady = true;
      setSdkStatus("Messenger listo", "ready");
      setStatusDot("disconnected", "Listo");
      unlockStelaLauncher();
      maybeStartConversationIfPanelOpen();
    });
 
    window.Genesys(
      "subscribe",
      "MessagingService.conversationDisconnected",
      function (evt) {
        if (!state.sessionEnded) {
          var humanEnd = shouldShowHumanAgentFarewellForEndEvent(evt);
          showEndedInline(
            "El agente cerro la conversacion. Escribe para iniciar una nueva.",
            { humanAgentEnd: humanEnd },
          );
        }
        notifyGenesysRemoteClose({
          source: "conversationDisconnected",
          evt: evt || null,
        });
        if (DEBUG_MODE) {
          try {
            
          } catch (_) {}
        }
      },
    );
 
    window.Genesys(
      "subscribe",
      "MessagingService.conversationCleared",
      function (evt) {
        notifyGenesysRemoteClose({
          source: "conversationCleared",
          evt: evt || null,
        });
        if (DEBUG_MODE) {
          try {
            
          } catch (_) {}
        }
      },
    );
 
    window.Genesys("subscribe", "MessagingService.ready", function () {
      if (state.messagingReady) return;
      state.messagingReady = true;
      state.usingNativeUI = false;
      if (el.modehint) el.modehint.style.display = "none";
 
      if (hadEndedSessionOnBoot) {
        setSesionStele(false);
        state.sessionActive = false;
        state.sessionEnded = true;
        setSesionPhase("ended");
        state.connecting = false;
        state.seenIds.clear();
        state.attrsLastSig = "";
        state.attrsLastTs = 0;
        hadEndedSessionOnBoot = false;
        hadClosedSessionOnBoot = false;
      }
 
      unlockStelaLauncher();
 
      maybeStartConversationIfPanelOpen();
    });
 
    window.Genesys("subscribe", "MessagingService.started", function () {
      if (shouldSuppressReconnect()) return;
      if (isSesionEndedPersisted() && !state.connecting) return;
      onStarted();
      state.isFreshStart = false;
      ensureCustomAttributes(true);
    });
 
    window.Genesys("subscribe", "MessagingService.restored", function () {
      if (shouldSuppressReconnect()) return;
      if (isSesionEndedPersisted() && !state.connecting) return;
      onStarted();
 
      if (state.isFreshStart) {
        state.isFreshStart = false;
      }
    });
 
    window.Genesys("subscribe", "MessagingService.ended", function (evt) {
      notifyGenesysRemoteClose({
        source: "ended",
        evt: evt || null,
      });
      if (state.resetting) {
        state.sessionActive = false;
        state.sessionEnded = true;
        return;
      }
      if (DEBUG_MODE) {
        try {
          
        } catch (_) {}
      }
      var humanEnd = shouldShowHumanAgentFarewellForEndEvent(evt);
      showEndedInline(
        "El agente cerro la conversacion. Escribe para iniciar una nueva.",
        { humanAgentEnd: humanEnd },
      );
    });
 
    window.Genesys("subscribe", "MessagingService.error", function (evt) {
      var p = parseErr(evt);
      if (shouldSuppressReconnect()) return;
 
      if (
        p.code === 409 ||
        p.key === "readOnlySession" ||
        (p.msg || "").toLowerCase().indexOf("read-only") !== -1
      ) {
        showEnded("Sesion readOnly. Inicia una nueva conversacion.");
      }
    });
 
    window.Genesys(
      "subscribe",
      "MessagingService.messagesReceived",
      function (evt) {
        try {
          if (!evt || !evt.data) return;
          showTyping(false);
          var arr = Array.isArray(evt.data.messages)
            ? evt.data.messages
            : [evt.data];
          arr.forEach(handleIncomingMessage);
        } catch (e) {}
      },
    );
 
    window.Genesys("subscribe", "MessagingService.fileUploaded", function () {
      if (!state.sessionActive || state.sessionEnded) return;
      genesysCmd("MessagingService.sendMessage", {}).then(function (r) {});
    });
  }

  function addSystemBubble(text) {
    var t = String(text || "").trim();
    if (!t) return;
    if (shouldSkipRepeatedClosureText(t, "lastCloseSystem", 180000)) return;
    var r = addBubble("in", t);
    if (r && r.wrap) r.wrap.classList.add("sys");
  }
  
  function ensureInitialLauncherPosition() {
	  if (!el.launcher) return;

	  try {
		const raw = localStorage.getItem("stela_launcher_pos");
		if (raw) return; 

		const rect = el.launcher.getBoundingClientRect();

		const right = window.innerWidth - (rect.left + rect.width);
		const bottom = window.innerHeight - (rect.top + rect.height);

		localStorage.setItem(
		  "stela_launcher_pos",
		  JSON.stringify({ right, bottom })
		);

		state.launcherDrag.moved = false;
	  } catch (e) {
	  }
  }

  setupLauncherDrag();
  ensureInitialLauncherPosition();

  if (el.launcher) {
    el.launcher.addEventListener("click", function (e) {
      if (state.launcherDrag && state.launcherDrag.suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      openWin();
    });
  }

  if (el.close) el.close.addEventListener("click", closeWin);

  if (el.newchat) el.newchat.addEventListener("click", newConversation);

  if (el.end) el.end.addEventListener("click", endConversation);
  if (el.send) {
    el.send.addEventListener("click", function () {
      sendText(el.text ? el.text.value : "");
    });
  }
  if (el.text) {
    el.text.addEventListener("input", function () {
      autoResize();
      updateSend();
    });
    el.text.addEventListener("paste", function (e) {
      touchClientActivity();
      var uploadFile = getClipboardUploadFile(e);
      if (!uploadFile) return;
      e.preventDefault();
      requestUpload(uploadFile);
    });
    el.text.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendText(el.text.value);
      }
    });
  }
  if (el.attach) {
    el.attach.addEventListener("click", function () {
      if (el.attach.disabled || !el.file) return;
      el.file.value = "";
      el.file.click();
    });
  }
  if (el.file) {
    el.file.addEventListener("change", function () {
      var f = el.file.files && el.file.files[0];
      if (f) requestUpload(f);
    });
  }

  document.addEventListener("pointerdown", touchClientActivity, {
    passive: true,
  });
  document.addEventListener("keydown", touchClientActivity);
  window.addEventListener("focus", function () {
    touchClientActivity();
    maybeSendKeepAliveSignal().catch(function () {});
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      touchClientActivity();
      maybeSendKeepAliveSignal().catch(function () {});
    }
  });
  function markPageUnloading() {
    state.pageUnloading = true;
    stopKeepAliveSignal();
    try {
      // Solo intentar limpiar/cerrar remoto si la app marca SesionStela=true.
      // Si SesionStela=false asumimos que la sesión está "bien" y no tocar Genesys.
      if (getSesionStele()) {
        window.STELA_CerrarSesionExterna({
          wsReadyWaitMs: 0,
          forceRemoteClose: true,
        });
      }
    } catch (_) {}
  }
  window.addEventListener("pageshow", function () {
    state.pageUnloading = false;
  });
  window.addEventListener("pagehide", markPageUnloading);
  window.addEventListener("beforeunload", markPageUnloading);
  
  function onGenesysLoaded() {
    if (window.__STELA_GENESYS_ON_LOADED_RAN__) return;
    window.__STELA_GENESYS_ON_LOADED_RAN__ = true;
    setSdkStatus("Cargando servicios...", "loading");
    setStatusDot("disconnected", "Inicializando...");

    try {
      genesysCmd("Messenger.open", {}).then(function (res) {
        if (DEBUG_MODE) {
          try {
            
          } catch (_) {}
        }
      });
    } catch (e) {
      if (DEBUG_MODE) {
        try {
          
        } catch (_) {}
      }
    }

    setTimeout(function () {
      var afterBootSessionValidated = function () {
        var restored = false;
        if (
          window.STELA_restoreConversationFromStorage &&
          !chatSurfaceHasVisibleContent()
        ) {
          restored = window.STELA_restoreConversationFromStorage();
        }
        if (restored && !hadClosedSessionOnBoot) {
          setStatusDot("connecting", "Reconectando...");
        }
        subscribeOnce();
      };
      stelaBootSessionValidatedP.then(afterBootSessionValidated);
    }, 0);

    setTimeout(function () {
      if (!state.messengerReady) {
        setSdkStatus("Listo (sin confirmacion)", "ready");
        setStatusDot("disconnected", "Listo");
      }
      unlockStelaLauncher();
    }, 8000);
  }

  if (window.__genesysError) {
    setSdkStatus("Error de red", "error");
    setStatusDot("ended", "Error");
    unlockStelaLauncher();
  } else if (window.__genesysLoaded) {
    onGenesysLoaded();
  } else {
    window.addEventListener("genesys:loaded", onGenesysLoaded, { once: true });
    window.addEventListener(
      "genesys:error",
      function () {
        setSdkStatus("Error cargando SDK", "error");
        setStatusDot("ended", "Error");
        unlockStelaLauncher();
      },
      { once: true },
    );
  }

  (function setupConversationLocalStorage() {
    if (window.__STELA_LS_INSTALLED__) return;
    window.__STELA_LS_INSTALLED__ = true;
    var LS_MAX_EVENTS = 300;
    var LS_BASE_KEY = "stela_conv_v1";
    var LS_LAST_KEY_PTR = "stela_conv_last_key_v1";
    var LS_FALLBACK_KEY = LS_BASE_KEY + ":anon";
    var lastStorageKey = "";
    function buildConvKey(id) {
      var safe = String(id || "").trim();
      return LS_BASE_KEY + ":" + (safe || "anon");
    }
    function getScopedId() {
      try {
        var ctx = window.STELA_CONTEXT || {};
        return String(ctx.identificacion || "").trim() || "anon";
      } catch (_) {
        return "anon";
      }
    }
    function getConvKey() {
      return buildConvKey(getScopedId());
    }
    function markStorageKey(key) {
      if (!key) return;
      lastStorageKey = key;
      try {
        localStorage.setItem(LS_LAST_KEY_PTR, key);
      } catch (_) {}
    }
    function getRememberedStorageKey() {
      if (lastStorageKey) return lastStorageKey;
      try {
        var k = localStorage.getItem(LS_LAST_KEY_PTR);
        if (k) {
          lastStorageKey = k;
          return k;
        }
      } catch (_) {}
      return "";
    }
    function listCandidateKeys() {
      var keys = [];
      function pushKey(k) {
        if (!k) return;
        if (keys.indexOf(k) === -1) keys.push(k);
      }
      pushKey(getConvKey());
      pushKey(getRememberedStorageKey());
      pushKey(LS_FALLBACK_KEY);
      return keys;
    }
    function lastEventTs(data) {
      if (!data || !Array.isArray(data.events) || !data.events.length) return 0;
      var ev = data.events[data.events.length - 1];
      return ev && typeof ev.ts === "number" ? ev.ts : data.events.length;
    }
    function lsReadWithMeta() {
      try {
        var keys = listCandidateKeys();
        var best = null;
        var bestTs = -1;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var raw = localStorage.getItem(key);
          if (!raw) continue;
          var data = JSON.parse(raw);
          if (!data || !Array.isArray(data.events) || !data.events.length)
            continue;
          var ts = lastEventTs(data);
          if (!best || ts > bestTs) {
            best = { key: key, data: data };
            bestTs = ts;
          }
        }
        if (best && best.key) markStorageKey(best.key);
        return best;
      } catch (e) {
        return null;
      }
    }
    function lsWrite(obj, sourceKey) {
      try {
        var payload = JSON.stringify(obj);
        var primary = getConvKey();
        var keys = [primary];
        var remembered = getRememberedStorageKey();
        if (sourceKey && keys.indexOf(sourceKey) === -1) keys.push(sourceKey);
        if (remembered && keys.indexOf(remembered) === -1)
          keys.push(remembered);
        var ok = false;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          try {
            localStorage.setItem(key, payload);
            markStorageKey(key);
            ok = true;
          } catch (_) {}
        }
        if (ok) markStorageKey(primary);
        return ok;
      } catch (e) {
        return false;
      }
    }
    function trimText(s, max) {
      var t = String(s || "");
      var m = typeof max === "number" ? max : 4000;
      return t.length > m ? t.slice(0, m) + "..." : t;
    }
    function normalizeAction(a) {
      if (!a) return null;
      return {
        text: trimText(a.text || a.label || a.title || "", 140),
        type: trimText(a.type || a.action || a.kind || "", 40),
        url: trimText(a.url || a.href || "", 1200),
        payload: trimText(
          a.payload || a.textBack || a.value || a.data || "",
          1200,
        ),
      };
    }
    function normalizeCard(c) {
      if (!c) return null;
      var img =
        (c.image && (c.image.url || c.image)) ||
        c.imageUrl ||
        c.img ||
        c.url ||
        "";
      var acts = (c.actions || c.buttons || [])
        .slice(0, 8)
        .map(normalizeAction)
        .filter(Boolean);
      return {
        title: trimText(c.title || "", 200),
        description: trimText(c.description || c.text || "", 2000),
        image: trimText(img || "", 1200),
        actions: acts,
      };
    }
    function normalizeQuickReplyOption(opt) {
      if (!opt) return null;
      return {
        label: trimText(opt.label || opt.text || "", 180),
        value: trimText(opt.value || opt.payload || opt.label || "", 2000),
        action: trimText(opt.action || "Message", 40),
      };
    }
    function persistEvent(evt) {
      try {
        if (!evt || state.isRestoring) return;
        var snapshot = lsReadWithMeta();
        var data = snapshot ? snapshot.data : null;
        if (!data || !Array.isArray(data.events)) data = { v: 1, events: [] };
        var deduped = dedupeStoredProdubancoFarewellEvents(data.events);
        if (deduped.changed) data.events = deduped.events;
        var e = Object.assign({}, evt);
        e.ts = e.ts || Date.now();
        if (e.type === "bubble") {
          e.text = trimText(e.text, 6000);
          e.dir = e.dir === "out" ? "out" : "in";
          if (isUploadStatusBubbleText(e.text || "")) return;
          if (e.dir !== "out" && isCarouselPromptNotice(e.text || "")) return;
          if (e.dir !== "out" && isConnectionRequiredNotice(e.text || ""))
            return;
          if (e.dir !== "out" && isClosureNotice(e.text || "")) return;

          var lastEv = data.events.length
            ? data.events[data.events.length - 1]
            : null;
          var eNorm = normalizeTextForDedup(e.text || "");
          var lastNorm =
            lastEv && lastEv.type === "bubble"
              ? normalizeTextForDedup(lastEv.text || "")
              : "";
          if (
            e.dir !== "out" &&
            isProdubancoFarewellText(e.text || "") &&
            lastEv &&
            isInboundProdubancoFarewellEvent(lastEv) &&
            eNorm === lastNorm
          ) {
            return;
          }
          if (
            e.dir !== "out" &&
            isClosureNotice(eNorm) &&
            lastEv &&
            lastEv.type === "bubble" &&
            (lastEv.dir || "in") !== "out" &&
            isClosureNotice(lastNorm) &&
            eNorm === lastNorm
          ) {
            return;
          }
        } else if (e.type === "image") {
          e.url = trimText(e.url, 1200);
          e.caption = trimText(e.caption || "", 1200);
          e.dir = e.dir === "out" ? "out" : "in";
        } else if (e.type === "attachment") {
          e.url = trimText(e.url, 1200);
          e.fileName = trimText(e.fileName || e.name || "Archivo", 260);
          e.mime = trimText(e.mime || "", 160);
          e.dir = e.dir === "out" ? "out" : "in";
          e.fileSize = Math.max(0, Number(e.fileSize) || 0);
        } else if (e.type === "carousel") {
          e.cards = (e.cards || [])
            .slice(0, 12)
            .map(normalizeCard)
            .filter(Boolean);
        } else if (e.type === "quickReplies") {
          e.options = (e.options || [])
            .slice(0, 40)
            .map(normalizeQuickReplyOption)
            .filter(Boolean);
        } else if (e.type === "quickRepliesCleared") {
          e.options = [];
        }
        data.events.push(e);
        if (data.events.length > LS_MAX_EVENTS)
          data.events = data.events.slice(data.events.length - LS_MAX_EVENTS);
        lsWrite(data, snapshot ? snapshot.key : "");
      } catch (_) {}
    }
    function restoreConversationFromStorage() {
      try {
        var snapshot = lsReadWithMeta();
        var data = snapshot ? snapshot.data : null;
        if (!data || !Array.isArray(data.events) || !data.events.length)
          return false;
        var deduped = dedupeStoredProdubancoFarewellEvents(data.events);
        if (deduped.changed) data.events = deduped.events;
        if (!el || !el.msgs) return false;
        state.isRestoring = true;
        try {
          var lastRestoredClosureNorm = "";
          for (var i = 0; i < data.events.length; i++) {
            var ev = data.events[i];
            if (!ev || !ev.type) continue;
            if (ev.type === "bubble") {
              var restoredDir = ev.dir === "out" ? "out" : "in";
              var restoredText = ev.text || "";
              if (isUploadStatusBubbleText(restoredText)) continue;
              if (restoredDir !== "out" && isCarouselPromptNotice(restoredText))
                continue;
              if (
                restoredDir !== "out" &&
                isConnectionRequiredNotice(restoredText)
              )
                continue;
              if (restoredDir !== "out" && isClosureNotice(restoredText))
                continue;
              if (restoredDir !== "out") {
                var restoredNorm = normalizeTextForDedup(restoredText);
                if (isClosureNotice(restoredNorm)) {
                  if (restoredNorm === lastRestoredClosureNorm) continue;
                  lastRestoredClosureNorm = restoredNorm;
                } else {
                  lastRestoredClosureNorm = "";
                }
              } else {
                lastRestoredClosureNorm = "";
              }
              addBubble(restoredDir, restoredText, ev.ts);
              if (
                restoredDir !== "out" &&
                isProdubancoFarewellText(restoredText)
              ) {
                state.humanAgentFarewellShown = true;
              }
            } else if (ev.type === "image") {
              addImage(
                ev.url || "",
                ev.caption || "",
                ev.ts,
                ev.dir === "out" ? "out" : "in",
              );
            } else if (ev.type === "attachment") {
              addFileAttachment(
                ev.url || "",
                ev.fileName || ev.name || "Archivo",
                ev.mime || "",
                ev.fileSize || 0,
                ev.ts,
                ev.dir === "out" ? "out" : "in",
              );
            } else if (ev.type === "carousel") {
              var cards = (ev.cards || []).map(function (c) {
                return {
                  title: c.title || "",
                  description: c.description || "",
                  image: c.image || "",
                  actions: (c.actions || []).map(function (a) {
                    var x = {};
                    if (a.text) x.text = a.text;
                    if (a.type) x.type = a.type;
                    if (a.url) x.url = a.url;
                    if (a.payload) x.payload = a.payload;
                    return x;
                  }),
                };
              });
              if (cards.length) addCarousel(cards, ev.ts);
            } else if (ev.type === "quickReplies") {
              var options = (ev.options || [])
                .map(function (o) {
                  return {
                    label: o.label || "",
                    value: o.value || "",
                    action: o.action || "Message",
                  };
                })
                .filter(function (o) {
                  return !!(o.label || o.value);
                });
              if (options.length) renderFinalQuickReplies(options);
            } else if (ev.type === "quickRepliesCleared") {
              var qrList = el.msgs
                ? el.msgs.querySelectorAll(".quick-replies")
                : null;
              var lastQr =
                qrList && qrList.length ? qrList[qrList.length - 1] : null;
              if (lastQr && lastQr.parentNode)
                lastQr.parentNode.removeChild(lastQr);
            }
          }
          state.unread = 0;
          updateBadge();
          hideLoading();
          showChat();
          scrollMessagesToBottom(true);
          lsWrite(data, snapshot ? snapshot.key : "");
          return true;
        } finally {
          state.isRestoring = false;
        }
      } catch (_) {
        state.isRestoring = false;
        return false;
      }
    }

    function clearConversationStorage(opts) {
      opts = opts || {};
      var alsoUI = !!opts.alsoUI;
      var genesys = opts.genesys !== false;
      var restart = opts.restart === true;
      var onWindowOpen = !!opts.onWindowOpen;
      var clearSessionFlagOnSuccess =
        opts.clearSessionFlagOnSuccess === true ||
        (restart && opts.clearSessionFlagOnSuccess !== false);
      var onDone = typeof opts.onDone === "function" ? opts.onDone : null;
      var ensureConversation = opts.ensureConversation !== false;
      var logoutFast = opts.logoutFast === true;
      var skipConfirmation = opts.skipConfirmation === true;
      var endWaitMs = Math.max(0, Number(opts.endWaitMs));
      var clearWaitMs = Math.max(0, Number(opts.clearWaitMs));
      var confirmTimeoutMs = Number(opts.confirmTimeoutMs);
      if (!isFinite(confirmTimeoutMs)) confirmTimeoutMs = 1800;
      if (logoutFast) confirmTimeoutMs = Math.max(200, confirmTimeoutMs);
      else confirmTimeoutMs = Math.max(1000, confirmTimeoutMs);
      if (!isFinite(endWaitMs)) endWaitMs = 120;
      if (!isFinite(clearWaitMs)) clearWaitMs = 120;

      function notifyDone(result) {
        if (!onDone) return;
        try {
          onDone(result);
        } catch (_) {}
      }

      function clearGenesysConversationState() {
        try {
          var depKey = "_" + GENESYS_CONFIG.deploymentId;
          localStorage.removeItem(depKey);
          sessionStorage.removeItem(depKey);
        } catch (e) {}
      }

      function clearWidgetConversationState() {
        try {
          if (alsoUI) {
            var keys = listCandidateKeys();
            for (var i = 0; i < keys.length; i++) {
              localStorage.removeItem(keys[i]);
            }
            localStorage.removeItem(LS_LAST_KEY_PTR);
          }
          lastStorageKey = "";
        } catch (e) {}
      }

      function applyImmediateLocalCleanup() {
        clearPendingInitialMenuSelection();
        stopKeepAliveSignal();
        state.sessionActive = false;
        state.sessionEnded = false;
        state.connecting = false;
        state.restoredOnce = false;
        state.isRestoring = false;
        state.restartSendInFlight = false;
        state.wasPreconnectingAfterEnd = false;
        state.silentConnectForInitialOpen = false;
        state.suppressNextIncoming = false;
        state.humanAgentFarewellShown = false;
        state.lastVirtualAssistantClosureTs = 0;
        state.lastHumanAgentSignalTs = 0;
        clearWidgetConversationState();

        if (alsoUI) {
          resetMessages();
          hideEnded();
          hideConnBanner();
          dismissSessionLoadingOverlayFully();
          if (onWindowOpen) {
            showLoading("Conectando...");
          } else {
            if (el.launcher) {
              el.launcher.style.opacity = "1";
              el.launcher.style.pointerEvents = "auto";
              el.launcher.style.display = "flex";
            }
            if (el.win) el.win.classList.remove("open");
          }
        }
      }

      function finalizeClear(closeRes) {
        if (restart) {
          state.sessionActive = false;
          state.sessionEnded = false;
          state.connecting = false;
          state.restoredOnce = false;
          state.seenIds.clear();
          state.resetting = false;
          state.suppressRestoredUntil = 0;

          if (onWindowOpen) {
            if (el.launcher) {
              el.launcher.style.opacity = "1";
              el.launcher.style.pointerEvents = "auto";
            }
            state.silentConnectForInitialOpen = true;
            startConversation();
            openWin();
          } else {
            resetMessages();
            dismissSessionLoadingOverlayFully();
            if (el.launcher) {
              el.launcher.style.opacity = "1";
              el.launcher.style.pointerEvents = "auto";
              el.launcher.style.display = "flex";
            }
            if (el.win) el.win.classList.remove("open");
          }
        } else {
          state.sessionActive = false;
          state.sessionEnded = false;
          state.connecting = false;
          state.restoredOnce = false;
          state.seenIds.clear();
          state.resetting = false;
          state.suppressRestoredUntil = 0;
          resetMessages();
          dismissSessionLoadingOverlayFully();
          if (el.launcher) {
            el.launcher.style.opacity = "1";
            el.launcher.style.pointerEvents = "auto";
            el.launcher.style.display = "flex";
          }
          if (el.win) el.win.classList.remove("open");
        }

        if (clearSessionFlagOnSuccess && closeRes && closeRes.confirmedRemote) {
          setSesionStele(false);
        }

        notifyDone(closeRes);
        return closeRes;
      }

      if (onWindowOpen) {
        setSesionStele(false);
      } else {
      }

      if (!genesys) {
        var disabledRes = {
          ok: false,
          confirmedRemote: false,
          source: "genesys_disabled",
        };
        notifyDone(disabledRes);
        return Promise.resolve(disabledRes);
      }
      state.resetting = true;
      state.suppressRestoredUntil = Date.now() + 15000;
      state.isFreshStart = true;
      state.geoFlowInProgress = false;
      state.attrsLastSig = "";
      state.attrsLastTs = 0;
      applyImmediateLocalCleanup();

      var genesysCommandTimeoutMs =
        opts.commandTimeoutMs != null && isFinite(Number(opts.commandTimeoutMs))
          ? Math.max(800, Number(opts.commandTimeoutMs))
          : Math.max(confirmTimeoutMs + 1200, 4500);

      return Promise.resolve()
        .then(function () {
          return closeGenesysConversation({
            ensureConversation: ensureConversation,
            skipConfirmation: skipConfirmation,
            endWaitMs: endWaitMs,
            clearWaitMs: clearWaitMs,
            confirmTimeoutMs: confirmTimeoutMs,
            commandTimeoutMs: genesysCommandTimeoutMs,
          });
        })
        .then(function (closeRes) {
          var normalizedCloseRes = closeRes || {
            ok: false,
            confirmedRemote: false,
            source: "unknown",
          };
          if (!normalizedCloseRes.confirmedRemote) {
            try {
              
            } catch (_) {}
            if (alsoUI) {
              showConnBanner(
                "failed",
                "Genesys no confirmo el cierre remoto. Revisa si 'Clear conversation' esta habilitado en Messenger.",
              );
            }
          }
          clearGenesysConversationState();
          clearWidgetConversationState();
          return finalizeClear(normalizedCloseRes);
        })
        .catch(function (e) {
          var errorRes = {
            ok: false,
            confirmedRemote: false,
            source: "clear_conversation_error",
            err: e || null,
          };
          clearGenesysConversationState();
          clearWidgetConversationState();
          return finalizeClear(errorRes);
        });
    }

    window.STELA_clearConversationStorage = clearConversationStorage;
    window.STELA_restoreConversationFromStorage =
      restoreConversationFromStorage;
    window.STELA_chatKey = getConvKey;
    window.STELA_chatKeys = listCandidateKeys;
    window.STELA_chatMetaKey = LS_LAST_KEY_PTR;
    window.STELA_persistConversationEvent = persistEvent;

    if (
      !window.__STELA_PATCHED_addBubble__ &&
      typeof addBubble === "function"
    ) {
      window.__STELA_PATCHED_addBubble__ = true;
      var _addBubble = addBubble;
      addBubble = function (dir, text, timestamp) {
        var r = _addBubble(dir, text, timestamp);
        if (!state.isRestoring) {
          persistEvent({
            type: "bubble",
            dir: dir,
            text: text,
            ts: timestamp || Date.now(),
          });
        }
        return r;
      };
    }
    if (
      !window.__STELA_PATCHED_addCarousel__ &&
      typeof addCarousel === "function"
    ) {
      window.__STELA_PATCHED_addCarousel__ = true;
      var _addCarousel = addCarousel;
      addCarousel = function (cards, timestamp) {
        _addCarousel(cards, timestamp);
        if (!state.isRestoring) {
          persistEvent({
            type: "carousel",
            cards: cards,
            ts: timestamp || Date.now(),
          });
        }
      };
    }
    if (!window.__STELA_PATCHED_addImage__ && typeof addImage === "function") {
      window.__STELA_PATCHED_addImage__ = true;
      var _addImage = addImage;
      addImage = function (url, caption, timestamp, dir) {
        _addImage(url, caption, timestamp, dir);
        if (!state.isRestoring) {
          persistEvent({
            type: "image",
            url: url,
            caption: caption || "",
            dir: dir === "out" ? "out" : "in",
            ts: timestamp || Date.now(),
          });
        }
      };
    }
    if (
      !window.__STELA_PATCHED_addFileAttachment__ &&
      typeof addFileAttachment === "function"
    ) {
      window.__STELA_PATCHED_addFileAttachment__ = true;
      var _addFileAttachment = addFileAttachment;
      addFileAttachment = function (
        url,
        fileName,
        mime,
        fileSize,
        timestamp,
        dir,
      ) {
        _addFileAttachment(url, fileName, mime, fileSize, timestamp, dir);
        if (!state.isRestoring) {
          persistEvent({
            type: "attachment",
            url: url,
            fileName: fileName || "Archivo",
            mime: mime || "",
            fileSize: fileSize || 0,
            dir: dir === "out" ? "out" : "in",
            ts: timestamp || Date.now(),
          });
        }
      };
    }
    if (
      !window.__STELA_PATCHED_renderQuickReplies__ &&
      typeof renderFinalQuickReplies === "function"
    ) {
      window.__STELA_PATCHED_renderQuickReplies__ = true;
      var _renderFinalQuickReplies = renderFinalQuickReplies;
      renderFinalQuickReplies = function (options) {
        _renderFinalQuickReplies(options || []);
        persistEvent({
          type: "quickReplies",
          options: options || [],
          ts: Date.now(),
        });
      };
    }
  })();

  function STELA_attachCarouselNav(wrap, car) {
    if (!wrap || !car) return;
    if (wrap.querySelector(".carousel-nav")) return;
    wrap.classList.add("carousel-wrap");
    function mkBtn(side) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "carousel-nav " + side;
      b.setAttribute("aria-label", side === "left" ? "Anterior" : "Siguiente");
      b.innerHTML =
        side === "left"
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      return b;
    }
    var btnL = mkBtn("left");
    var btnR = mkBtn("right");
    wrap.appendChild(btnL);
    wrap.appendChild(btnR);
    function getStep() {
      var card = car.querySelector(".r-card");
      if (!card) return Math.round(car.clientWidth * 0.85);
      var cs = window.getComputedStyle(car);
      var gap = parseFloat(cs.gap || cs.columnGap || "0") || 0;
      var w = card.getBoundingClientRect().width || 280;
      return Math.round(w + gap);
    }
    btnL.addEventListener("click", function () {
      car.scrollBy({ left: -getStep(), behavior: "smooth" });
    });
    btnR.addEventListener("click", function () {
      car.scrollBy({ left: getStep(), behavior: "smooth" });
    });
    function update() {
      var max = Math.max(0, car.scrollWidth - car.clientWidth - 1);
      btnL.disabled = car.scrollLeft <= 1;
      btnR.disabled = car.scrollLeft >= max;
    }
    var raf = 0;
    car.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        update();
      });
    });
    window.addEventListener("resize", update);
    setTimeout(update, 0);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btnClear = document.getElementById("btn-clear-storage");
    if (btnClear) {
      btnClear.addEventListener("click", function () {
        touchClientActivity();
        try {
          if (window.STELA_clearConversationStorage) {
            window.STELA_clearConversationStorage({
              alsoUI: true,
              genesys: true,
              restart: true,
            });
          }
        } catch (e) {}
      });
    }
    var btnSimLogout = document.getElementById("btn-simulate-logout");
    if (btnSimLogout) {
      btnSimLogout.addEventListener("click", function () {
        touchClientActivity();
        try {
          if (window.STELA_CerrarSesionExterna) {
            window.STELA_CerrarSesionExterna({ forceRemoteClose: true });
          }
        } catch (e) {}
      });
    }
  });

  function stelaHasConversationRelatedStorage() {
    try {
      var depKey = "_" + GENESYS_CONFIG.deploymentId;
      if (localStorage.getItem(depKey) || sessionStorage.getItem(depKey))
        return true;
      if (String(getSesionPhase() || "").trim()) return true;
      var keys = window.STELA_chatKeys ? window.STELA_chatKeys() : [];
      for (var i = 0; i < keys.length; i++) {
        if (localStorage.getItem(keys[i])) return true;
      }
      if (
        window.STELA_chatMetaKey &&
        localStorage.getItem(window.STELA_chatMetaKey)
      )
        return true;
      return false;
    } catch (_) {
      return true;
    }
  }

  var _cerrarSesionExternaInFlight = null;
  
  window.STELA_CerrarSesionExterna = async function (opts) {
    if (_cerrarSesionExternaInFlight) {
      return _cerrarSesionExternaInFlight;
    }
    _cerrarSesionExternaInFlight = (async function () {
      var res = null;
      var t0 = 0;
      try {
        opts = opts || {};
        t0 = performance.now();
 
        var hasConversationRelatedStorage =
          stelaHasConversationRelatedStorage();
        var forceRemoteClose = opts.forceRemoteClose === true;
        if (!hasConversationRelatedStorage && !forceRemoteClose) {
          if (getSesionStele()) {
            try {
              setSesionStele(false);
            } catch (_) {}
          }
          var resEmpty = {
            ok: true,
            skipped: true,
            source: "noop_empty_local_storage",
          };
          if (typeof opts.onDone === "function") {
            try {
              opts.onDone(resEmpty);
            } catch (_) {}
          }
          return resEmpty;
        } else if (!hasConversationRelatedStorage && forceRemoteClose) {
        }
 
        if (!opts.suppressChatPanelDuringExternalClose) {
          beginExternalCloseLoadingUI();
        }
 
        var wsReadyWaitMs = Number(opts.wsReadyWaitMs);
        if (!isFinite(wsReadyWaitMs)) wsReadyWaitMs = 2500;
        wsReadyWaitMs = Math.max(0, wsReadyWaitMs);
        if (
          wsReadyWaitMs > 0 &&
          !(
            _genesysWs &&
            _genesysToken &&
            _genesysWs.readyState === WebSocket.OPEN
          )
        ) {
          var wsDeadline = Date.now() + wsReadyWaitMs;
          while (Date.now() < wsDeadline) {
            if (
              _genesysWs &&
              _genesysToken &&
              _genesysWs.readyState === WebSocket.OPEN
            )
              break;
            await waitMs(50);
          }
        }
 
        var wsCloseSent = false;
        if (
          _genesysWs &&
          _genesysToken &&
          _genesysWs.readyState === WebSocket.OPEN
        ) {
          try {
            var msgId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
              /[xy]/g,
              function (c) {
                var r = (Math.random() * 16) | 0;
                return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
              },
            );
            _genesysWs.send(
              JSON.stringify({
                action: "onMessage",
                token: _genesysToken,
                message: {
                  metadata: { id: msgId },
                  type: "Event",
                  events: [
                    {
                      eventType: "Presence",
                      presence: { type: "Clear" },
                    },
                  ],
                },
              }),
            );
            wsCloseSent = true;
          } catch (e) {
          }
        } else {
          
        }
 
        clearPendingInitialMenuSelection();
        clearPendingRestartMessage();
        stopKeepAliveSignal();
 
        state.sessionActive = false;
        state.sessionEnded = false;
        state.connecting = false;
        state.restoredOnce = false;
        state.isRestoring = false;
        state.restartSendInFlight = false;
        state.wasPreconnectingAfterEnd = false;
        state.silentConnectForInitialOpen = false;
        state.suppressNextIncoming = false;
        state.humanAgentFarewellShown = false;
        state.lastVirtualAssistantClosureTs = 0;
        state.lastHumanAgentSignalTs = 0;
        state.seenIds.clear();
        state.isFreshStart = true;
        state.geoFlowInProgress = false;
        state.attrsLastSig = "";
        state.attrsLastTs = 0;
        state.resetting = true;
        state.suppressRestoredUntil = Date.now() + 30000;
 
        try {
          var chatKeys = window.STELA_chatKeys ? window.STELA_chatKeys() : [];
          for (var i = 0; i < chatKeys.length; i++)
            localStorage.removeItem(chatKeys[i]);
          if (window.STELA_chatMetaKey)
            localStorage.removeItem(window.STELA_chatMetaKey);
        } catch (_) {}
        try {
          var depKey2 = "_" + GENESYS_CONFIG.deploymentId;
          localStorage.removeItem(depKey2);
          sessionStorage.removeItem(depKey2);
        } catch (_) {}
 
        resetMessages();
        hideEnded();
        hideConnBanner();
        setSesionStele(false);
        setSesionPhase("");
 
        state.resetting = false;
        state.suppressRestoredUntil = 0;
 
        res = {
          ok: true,
          confirmedRemote: wsCloseSent,
          source: wsCloseSent
            ? "websocket_presence_clear"
            : "immediate_local_cleanup",
        };
 
        if (!wsCloseSent) {
          try {
            var closeRes = await closeGenesysConversation({
              ensureConversation: false,
              skipConfirmation: false,
              endWaitMs: 400,
              clearWaitMs: 400,
              commandTimeoutMs: 8000,
              confirmTimeoutMs: 4000,
            });
            res.fallbackClose = closeRes;
            res.source = "sdk_fallback";
          } catch (e) {
            res.fallbackCloseError = e;
          }
        }
      } finally {
        if (!opts.suppressChatPanelDuringExternalClose) {
          endExternalCloseLoadingUI();
        }
      }
      if (typeof opts.onDone === "function" && res != null) {
        try {
          opts.onDone(res);
        } catch (_) {}
      }
 
      if (t0) {
      }
      return res;
    })();
    try {
      return await _cerrarSesionExternaInFlight;
    } finally {
      _cerrarSesionExternaInFlight = null;
    }
  };

    window.STELA_reactSesionStelaExternaIfNeeded = function () {
    try {
      if (!getSesionStele()) return Promise.resolve(false);
      var p = window.STELA_CerrarSesionExterna({
        forceRemoteClose: true,
        suppressChatPanelDuringExternalClose: true,
      });
      hadSesionStelaOnBoot = false;
      hadEndedSessionOnBoot = false;
      hadClosedSessionOnBoot = false;
      return Promise.resolve(p).then(function () {
        return true;
      });
    } catch (e) {
      return Promise.resolve(false);
    }
  };
 

  var hadSesionStelaAtBoot = getSesionStele();
  var _stelaBootSesionP = hadSesionStelaAtBoot
    ? window.STELA_reactSesionStelaExternaIfNeeded()
    : Promise.resolve(false);

  function stelaBootstrapWidget() {
    subscribeOnce();
    setTimeout(unlockStelaLauncher, 0);
    setTimeout(unlockStelaLauncher, 2500);
    setTimeout(unlockStelaLauncher, 6000);
  }

  window.addEventListener("storage", function (e) {
    if (!e || e.storageArea !== localStorage) return;
    if (e.key !== LS_SESION_FLAG) return;
    if (e.newValue !== "true") return;
    window.STELA_reactSesionStelaExternaIfNeeded();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    window.STELA_reactSesionStelaExternaIfNeeded();
  });

  window.addEventListener("pageshow", function () {
    window.STELA_reactSesionStelaExternaIfNeeded();
  });

  if (!hadSesionStelaAtBoot) {
    if (typeof _resolveStelaBootSessionValidated === "function") {
      _resolveStelaBootSessionValidated();
    }
    stelaBootstrapWidget();
  } else {
    Promise.resolve(_stelaBootSesionP)
      .catch(function () {})
      .then(function () {
        if (typeof _resolveStelaBootSessionValidated === "function") {
          _resolveStelaBootSessionValidated();
        }
        stelaBootstrapWidget();
      });
  }
})();
