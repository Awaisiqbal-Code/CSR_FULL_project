/* WCE voice-audio compatibility patch for current WhatsApp Web.
   It intercepts lov-wa-audio-request before the legacy webpack Msg-store handler,
   resolves the message from IndexedDB model-storage/message, and decrypts audio
   using the message mediaKey when a direct media URL is available. */
(function () {
  const REQUEST = "lov-wa-audio-request";
  const RESPONSE = "lov-wa-audio-response";
  function post(reqId, data, error) {
    const msg = {
      source: RESPONSE,
      reqId
    };
    if (error) {
      msg.error = String(error && error.message || error);
    } else {
      msg.data = data;
    }
    window.postMessage(msg, "*");
  }
  function openDb(name) {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(name);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error || new Error("Failed to open " + name));
    });
  }
  function reqP(r) {
    return new Promise((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function idText(v) {
    if (v == null) {
      return "";
    }
    if (typeof v === "string" || typeof v === "number") {
      return String(v);
    }
    if (typeof v === "object") {
      if (v._serialized) {
        return String(v._serialized);
      }
      if (v.id != null && typeof v.id !== "object") {
        return String(v.id);
      }
      try {
        return String(v);
      } catch (_) {
        return "";
      }
    }
    return "";
  }
  function recordHasId(obj, wanted, depth = 0, seen = new Set()) {
    if (obj == null || depth > 4) {
      return false;
    }
    if (typeof obj === "string" || typeof obj === "number") {
      return String(obj) === wanted;
    }
    if (typeof obj !== "object" || seen.has(obj)) {
      return false;
    }
    seen.add(obj);
    const priority = ["id", "msgId", "messageId", "stanzaId", "key", "wid"];
    for (const k of priority) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const t = idText(obj[k]);
        if (t === wanted || t.endsWith("_" + wanted) || t.includes(wanted)) {
          return true;
        }
      }
    }
    for (const k of Object.keys(obj)) {
      if (recordHasId(obj[k], wanted, depth + 1, seen)) {
        return true;
      }
    }
    return false;
  }
  async function findMessage(id) {
    const db = await openDb("model-storage");
    try {
      if (!db.objectStoreNames.contains("message")) {
        throw new Error("model-storage/message store not found");
      }
      const tx = db.transaction("message", "readonly");
      const store = tx.objectStore("message");
      const guesses = [id, "true_" + id, "false_" + id];
      for (const key of guesses) {
        try {
          const v = await reqP(store.get(key));
          if (v && recordHasId(v, id)) {
            return v;
          }
        } catch (_) {}
      }
      return await new Promise((resolve, reject) => {
        let scanned = 0;
        const r = store.openCursor();
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const c = r.result;
          if (!c || scanned++ > 50000) {
            return resolve(null);
          }
          try {
            if (recordHasId(c.value, id)) {
              return resolve(c.value);
            }
          } catch (_) {}
          c.continue();
        };
      });
    } finally {
      db.close();
    }
  }
  function walk(obj, cb, depth = 0, seen = new Set()) {
    if (obj == null || depth > 5 || seen.has(obj)) {
      return;
    }
    if (typeof obj === "object") {
      seen.add(obj);
    }
    cb(obj);
    if (typeof obj !== "object") {
      return;
    }
    for (const k of Object.keys(obj)) {
      try {
        walk(obj[k], cb, depth + 1, seen);
      } catch (_) {}
    }
  }
  function firstDataUrl(rec) {
    let out = "";
    walk(rec, v => {
      if (!out && typeof v === "string" && /^data:audio\//i.test(v)) {
        out = v;
      }
    });
    return out;
  }
  function pick(rec, names) {
    let found;
    const wanted = new Set(names.map(x => x.toLowerCase()));
    (function scan(o, depth = 0, seen = new Set()) {
      if (found !== undefined || !o || typeof o !== "object" || depth > 5 || seen.has(o)) {
        return;
      }
      seen.add(o);
      for (const k of Object.keys(o)) {
        if (wanted.has(k.toLowerCase()) && o[k] != null && o[k] !== "") {
          found = o[k];
          return;
        }
      }
      for (const k of Object.keys(o)) {
        scan(o[k], depth + 1, seen);
      }
    })(rec);
    return found;
  }
  function b64ToBytes(s) {
    s = String(s || "").replace(/^data:[^,]+,/, "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) {
      s += "=";
    }
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      u[i] = bin.charCodeAt(i);
    }
    return u;
  }
  async function blobToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error || new Error("FileReader failed"));
      fr.readAsDataURL(blob);
    });
  }
  async function decryptWhatsAppAudio(encBuf, mediaKey, mime) {
    const keyBytes = mediaKey instanceof Uint8Array ? mediaKey : b64ToBytes(mediaKey);
    if (keyBytes.byteLength < 32) {
      throw new Error("Invalid mediaKey");
    }
    const baseKey = await crypto.subtle.importKey("raw", keyBytes.slice(0, 32), "HKDF", false, ["deriveBits"]);
    const info = new TextEncoder().encode("WhatsApp Audio Keys");
    const bits = await crypto.subtle.deriveBits({
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info
    }, baseKey, 896);
    const expanded = new Uint8Array(bits);
    const iv = expanded.slice(0, 16);
    const cipherKey = expanded.slice(16, 48);
    const all = new Uint8Array(encBuf);
    if (all.length <= 10) {
      throw new Error("Encrypted media is too small");
    }
    const ciphertext = all.slice(0, all.length - 10);
    const aesKey = await crypto.subtle.importKey("raw", cipherKey, {
      name: "AES-CBC"
    }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({
      name: "AES-CBC",
      iv
    }, aesKey, ciphertext);
    return new Blob([plain], {
      type: mime || "audio/ogg"
    });
  }
  function mediaUrlsFromRecord(rec) {
    const urls = [];
    const seen = new Set();
    function add(value) {
      if (typeof value !== "string" || !value) {
        return;
      }
      let url = value.trim();
      if (!url) {
        return;
      }

      // Some current WhatsApp records keep only a directPath.
      if (url.startsWith("/")) {
        url = "https://mmg.whatsapp.net" + url;
      }
      if (!/^https?:\/\//i.test(url)) {
        return;
      }
      if (seen.has(url)) {
        return;
      }
      seen.add(url);
      urls.push(url);
    }

    // Prefer current fields first; deprecatedMms3Url is intentionally last
    // because it is often present but expired and returns HTTP 404.
    for (const name of ["mediaUrl", "mmsUrl", "url", "directPath", "deprecatedMms3Url"]) {
      add(pick(rec, [name]));
    }

    // Fallback: collect any additional media/CDN URLs stored deeper in the
    // same message record without changing the rest of the audio pipeline.
    walk(rec, value => {
      if (typeof value === "string" && (/^https?:\/\//i.test(value) || value.startsWith("/"))) {
        add(value);
      }
    });
    return urls;
  }

  // v4.5: A voice the user has opened in the active WhatsApp chat may
  // already have a real browser audio source, even when the IndexedDB media
  // record has expired CDN links. Use it only if it belongs to the EXACT
  // WhatsApp message ID; never scrape some other chat's player.
  async function loadedAudioForMessage(id) {
    const messageId = String(id || "");
    if (!messageId || messageId.length > 200) {
      return null;
    }
    const nodes = document.querySelectorAll("[data-id], [data-testid^=\"conv-msg-\"]");
    // Avoid a long synchronous scan in a large conversation.
    for (let i = nodes.length - 1, visited = 0; i >= 0 && visited < 2000; i--, visited++) {
      const node = nodes[i];
      const candidate = node.getAttribute("data-id") || String(node.getAttribute("data-testid") || "").replace(/^conv-msg-/, "");
      if (candidate !== messageId) {
        continue;
      }
      const player = node.querySelector("audio[src], audio source[src]") || node.closest(".message-in,.message-out")?.querySelector("audio[src], audio source[src]");
      const src = player?.src || player?.getAttribute("src") || "";
      if (!/^(blob:|data:audio\/)/i.test(src)) {
        continue;
      }
      try {
        const response = await fetch(src);
        if (!response.ok) {
          continue;
        }
        const audio = await response.blob();
        if (audio.size < 32 || audio.size > 4194304) {
          continue;
        }
        return await blobToDataUrl(audio);
      } catch (_) {/* unavailable blob in another browser context */}
    }
    return null;
  }
  async function resolveAudio(id) {
    const loaded = await loadedAudioForMessage(id);
    if (loaded) {
      return loaded;
    }
    const rec = await findMessage(id);
    if (!rec) {
      throw new Error("IndexedDB message not found for " + id);
    }
    const embedded = firstDataUrl(rec);
    if (embedded) {
      return embedded;
    }
    const mediaKey = pick(rec, ["mediaKey", "media_key"]);
    const urls = mediaUrlsFromRecord(rec);
    const mime = String(pick(rec, ["mimetype", "mimeType", "mime"]) || "audio/ogg");
    if (!mediaKey) {
      throw new Error("Message found, but mediaKey is missing");
    }
    if (!urls.length) {
      throw new Error("Message found, but direct media URL is missing");
    }
    let lastError = null;
    for (const url of urls) {
      try {
        const resp = await fetch(url, {
          credentials: "omit"
        });
        if (!resp.ok) {
          lastError = new Error("Media fetch failed: HTTP " + resp.status);
          continue;
        }
        const enc = await resp.arrayBuffer();
        const blob = await decryptWhatsAppAudio(enc, mediaKey, mime);
        return await blobToDataUrl(blob);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Media fetch failed for all available URLs");
  }
  window.addEventListener("message", function wceAudioCompat(ev) {
    if (ev.source !== window || !ev.data || ev.data.source !== REQUEST) {
      return;
    }

    // A fallback event is intentionally allowed to reach the extension's
    // original live WhatsApp resolver below. Do not intercept it again.
    if (ev.data.__wceLegacyFallback) {
      return;
    }
    ev.stopImmediatePropagation();
    const reqId = ev.data.reqId;
    const id = ev.data.id;
    resolveAudio(id).then(data => {
      post(reqId, data, null);
    }).catch(err => {
      console.warn("WCE AUDIO COMPAT FALLBACK:", err);

      // IndexedDB can contain expired CDN URLs (HTTP 404). In that case,
      // hand the same request to the original page-inject resolver, which
      // works from WhatsApp's live in-memory message model and can request
      // fresh media. No other extension function is changed.
      const fallback = Object.assign({}, ev.data, {
        __wceLegacyFallback: true
      });
      window.dispatchEvent(new MessageEvent("message", {
        data: fallback,
        source: window
      }));
    });
  });
})();
(function () {
  var v1 = null;
  function v2() {
    return Object.keys(window).find(function (v3) {
      return v3.indexOf("webpackChunk") === 0;
    });
  }
  function v5() {
    if (v1) {
      return v1;
    }
    var v6 = v2();
    if (!v6) {
      return null;
    }
    var v7 = window[v6];
    if (!v7 || !v7.push) {
      return null;
    }
    var v8 = null;
    var v9 = "lov_probe_" + Math.random().toString(36).slice(2);
    try {
      v7.push([[v9], {}, function (v10) {
        var v11 = {
          req: v10,
          m: v10.m || {}
        };
        v8 = v11;
      }]);
    } catch (v12) {
      return null;
    }
    if (v8) {
      v1 = v8;
    }
    return v8;
  }
  function v13() {
    var v14 = v5();
    if (!v14) {
      return null;
    }
    var v15 = v14.req;
    var v16 = Object.keys(v14.m);
    for (var v17 = 0; v17 < v16.length; v17++) {
      try {
        var v18 = v15(v16[v17]);
        if (!v18) {
          continue;
        }
        var v19 = [v18.Chat, v18.default && v18.default.Chat, v18.ChatCollection, v18.default];
        for (var v20 = 0; v20 < v19.length; v20++) {
          var v21 = v19[v20];
          if (v21 && typeof v21.getModelsArray === "function") {
            try {
              var v22 = v21.getModelsArray();
              if (v22 && v22.length >= 0) {
                return v21;
              }
            } catch (v23) {}
          }
        }
      } catch (v24) {}
    }
    return null;
  }
  function v25(v26) {
    if (!v26) {
      return false;
    }
    var v27 = String(v26);
    return v27.indexOf("@g.us") !== -1 || v27.indexOf("@broadcast") !== -1 || v27.indexOf("-") !== -1 && v27.indexOf("@") === -1;
  }
  function v28(v29) {
    return String(v29 || "").replace(/\s+/g, " ").trim();
  }
  function v30() {
    try {
      var v31 = v13();
      if (!v31) {
        return null;
      }
      var v32 = v31.getModelsArray();
      var v33 = [];
      for (var v34 = 0; v34 < v32.length; v34++) {
        var v35 = v32[v34];
        var v36 = v35.id && (v35.id._serialized || v35.id.toString && v35.id.toString()) || "";
        var v37 = !!v35.isGroup || v25(v36);
        var v38 = v35.name || v35.formattedTitle || v35.contact && (v35.contact.name || v35.contact.pushname) || "";
        v33.push({
          id: String(v36 || ""),
          name: v28(v38),
          isGroup: v37,
          src: "store"
        });
      }
      return v33;
    } catch (v39) {
      return null;
    }
  }
  function v40(v41) {
    return new Promise(function (v42) {
      try {
        var v43 = indexedDB.open(v41);
        v43.onsuccess = function () {
          v42(v43.result);
        };
        v43.onerror = function () {
          v42(null);
        };
        v43.onblocked = function () {
          v42(null);
        };
      } catch (v44) {
        v42(null);
      }
    });
  }
  function v45(v46, v47) {
    return new Promise(function (v48) {
      try {
        if (!v46.objectStoreNames.contains(v47)) {
          return v48(null);
        }
        var v49 = v46.transaction(v47, "readonly");
        var v50 = v49.objectStore(v47);
        var v51 = v50.getAll();
        v51.onsuccess = function () {
          v48(v51.result || []);
        };
        v51.onerror = function () {
          v48(null);
        };
      } catch (v52) {
        v48(null);
      }
    });
  }
  async function v53() {
    try {
      var v54 = [];
      if (indexedDB.databases) {
        try {
          v54 = (await indexedDB.databases()) || [];
        } catch (v55) {
          v54 = [];
        }
      }
      var v56 = new Set(v54.map(function (v57) {
        return v57 && v57.name;
      }).filter(Boolean));
      ["model-storage", "wawc", "wawc_db"].forEach(function (v58) {
        v56.add(v58);
      });
      var v59 = [];
      for (var v60 of v56) {
        var v61 = await v40(v60);
        if (!v61) {
          continue;
        }
        var v62 = Array.from(v61.objectStoreNames || []);
        var v63 = v62.find(function (v64) {
          return /^chat$/i.test(v64) || /chat/i.test(v64) && !/message|msg|media|reaction/i.test(v64);
        });
        if (!v63) {
          try {
            v61.close();
          } catch (v65) {}
          continue;
        }
        var v66 = await v45(v61, v63);
        try {
          v61.close();
        } catch (v67) {}
        if (!v66 || !v66.length) {
          continue;
        }
        for (var v68 = 0; v68 < v66.length; v68++) {
          var v69 = v66[v68];
          if (!v69) {
            continue;
          }
          var v70 = v69.id || v69.jid || v69.key && (v69.key.id || v69.key) || "";
          if (typeof v70 === "object" && v70) {
            v70 = v70._serialized || v70.id || String(v70);
          }
          v70 = String(v70 || "");
          if (!v70 || v70.indexOf("@status") !== -1) {
            continue;
          }
          var v71 = !!v69.isGroup || v25(v70);
          var v60 = v69.name || v69.formattedTitle || v69.subject || v69.notifyName || "";
          v59.push({
            id: v70,
            name: v28(v60),
            isGroup: v71,
            src: "idb:" + v60
          });
        }
        if (v59.length) {
          return v59;
        }
      }
      if (v59.length) {
        return v59;
      } else {
        return null;
      }
    } catch (v72) {
      return null;
    }
  }
  var v73 = 0;
  async function v74(v75) {
    var v76 = Date.now();
    if (!v75 && v76 - v73 < 1500) {
      return;
    }
    v73 = v76;
    var v77 = v30();
    var v78 = await v53();
    var v79 = new Map();
    function v80(v81) {
      if (!v81) {
        return;
      }
      var v82 = v81.id ? "id:" + v81.id : "";
      var v83 = v81.name ? "nm:" + v81.name.toLowerCase() : "";
      var v84 = v82 && v79.get(v82) || v83 && v79.get(v83);
      if (v84) {
        v84.isGroup = v84.isGroup || v81.isGroup;
        if (!v84.id && v81.id) {
          v84.id = v81.id;
        }
        if (!v84.name && v81.name) {
          v84.name = v81.name;
        }
      } else {
        var v85 = {
          id: v81.id || "",
          name: v81.name || "",
          isGroup: !!v81.isGroup
        };
        var v86 = v85;
        if (v82) {
          v79.set(v82, v86);
        }
        if (v83) {
          v79.set(v83, v86);
        }
      }
    }
    (v77 || []).forEach(v80);
    (v78 || []).forEach(v80);
    var v87 = new Set();
    var v88 = [];
    for (var v89 of v79.values()) {
      var v90 = (v89.id || "") + "|" + (v89.name || "").toLowerCase();
      if (v87.has(v90)) {
        continue;
      }
      v87.add(v90);
      v88.push(v89);
    }
    if (!v88.length) {
      return;
    }
    var v91 = {
      source: "lov-wa-store",
      chats: v88,
      hasStore: !!v77,
      hasIdb: !!v78,
      ts: v76
    };
    window.postMessage(v91, "*");
  }
  var v92 = 0;
  var v93 = setInterval(function () {
    v92++;
    v74(true);
    if (v92 > 120) {
      clearInterval(v93);
      setInterval(function () {
        v74(false);
      }, 5000);
    }
  }, 750);
  window.addEventListener("message", function (v94) {
    if (v94.source === window && v94.data && v94.data.source === "lov-wa-store-request") {
      v74(true);
    }
  });
  function v95() {
    var v96 = v5();
    if (!v96) {
      return null;
    }
    var v97 = v96.req;
    var v98 = Object.keys(v96.m);
    for (var v99 = 0; v99 < v98.length; v99++) {
      try {
        var v100 = v97(v98[v99]);
        if (!v100) {
          continue;
        }
        var v101 = [v100.MsgCollection, v100.Msg, v100.default && v100.default.Msg, v100.default];
        for (var v102 = 0; v102 < v101.length; v102++) {
          var v103 = v101[v102];
          if (v103 && typeof v103.get === "function" && (typeof v103.getModelsArray === "function" || v103.models)) {
            return v103;
          }
        }
      } catch (v104) {}
    }
    return null;
  }
  function v105(v106) {
    return new Promise(function (v107, v108) {
      var v109 = new FileReader();
      v109.onload = function () {
        v107(String(v109.result));
      };
      v109.onerror = function () {
        v108(v109.error || new Error("read failed"));
      };
      v109.readAsDataURL(v106);
    });
  }
  async function v110(v111) {
    var v112 = v95();
    if (!v112) {
      throw new Error("Msg collection not found");
    }
    var v113 = null;
    try {
      v113 = v112.get(v111);
    } catch (v114) {}
    if (!v113) {
      var v115 = String(v111).replace(/^true_/, "false_");
      try {
        v113 = v112.get(v115);
      } catch (v116) {}
    }
    if (!v113) {
      throw new Error("Msg not cached: " + v111);
    }
    if (typeof v113.downloadMedia === "function") {
      var v117 = await v113.downloadMedia();
      if (v117 && v117.size) {
        return await v105(v117);
      }
    }
    if (v113.mediaData) {
      if (typeof v113.mediaData.mediaBlob === "function") {
        var v118 = await v113.mediaData.mediaBlob();
        if (v118 && v118.size) {
          return await v105(v118);
        }
      }
      if (v113.mediaData.mediaBlob && v113.mediaData.mediaBlob.forceToBlob) {
        var v119 = await v113.mediaData.mediaBlob.forceToBlob();
        if (v119 && v119.size) {
          return await v105(v119);
        }
      }
    }
    if (window.WPP && window.WPP.chat && typeof window.WPP.chat.downloadMedia === "function") {
      var v120 = await window.WPP.chat.downloadMedia(v111);
      if (v120 && v120.size) {
        return await v105(v120);
      }
    }
    throw new Error("No download method available");
  }
  window.addEventListener("message", function (v121) {
    if (v121.source !== window || !v121.data || v121.data.source !== "lov-wa-audio-request") {
      return;
    }
    var v122 = v121.data.reqId;
    var v123 = v121.data.id;
    v110(v123).then(function (v124) {
      var v125 = {
        source: "lov-wa-audio-response",
        reqId: v122,
        data: v124
      };
      window.postMessage(v125, "*");
    }).catch(function (v126) {
      window.postMessage({
        source: "lov-wa-audio-response",
        reqId: v122,
        error: String(v126 && v126.message || v126)
      }, "*");
    });
  });
  // Active chat id (JID / @lid) from the OPEN chat's React fiber — the only stable
  // identity available when WhatsApp message ids are bare hex. Lets the collector
  // keep two same-name contacts (e.g. two "Hammad"s) in separate conversations.
  function __wceActiveChatId() {
    var JID = /\b\d[\d-]*@(?:c\.us|g\.us|lid)\b/;
    var main = document.querySelector("#main");
    if (!main) return null;
    var fk = Object.keys(main).find(function (k) { return k.indexOf("__reactFiber$") === 0; });
    var root = fk ? main[fk] : null;
    if (!root) return null;
    var seen = new Set(), stack = [root], n = 0;
    while (stack.length && n++ < 8000) {
      var f = stack.pop();
      if (!f || seen.has(f)) continue;
      seen.add(f);
      var p = f.memoizedProps;
      if (p && typeof p === "object") {
        for (var key in p) {
          try {
            var v = p[key];
            if (v && typeof v === "object") {
              var s = v._serialized || (v.id && v.id._serialized) || (v.wid && v.wid._serialized);
              if (typeof s === "string" && JID.test(s)) return s;
            }
          } catch (e) {}
        }
      }
      if (f.child) stack.push(f.child);
      if (f.sibling) stack.push(f.sibling);
    }
    return null;
  }
  window.addEventListener("message", function (ev) {
    if (ev.source !== window || !ev.data || ev.data.source !== "lov-wa-active-chat-request") return;
    var jid = null;
    try { jid = __wceActiveChatId(); } catch (e) {}
    window.postMessage({ source: "lov-wa-active-chat-response", reqId: ev.data.reqId, jid: jid }, "*");
  });
})();