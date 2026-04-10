/**
 * WCAG TR Widget v1.0.0
 * Türkiye Erişilebilirlik Kontrol Listesi — WCAG 2.2 / v2.2.20.00
 * CDN üzerinden müşteri sitelerine gömülür.
 *
 * Kullanım:
 *   <script
 *     src="https://cdn.wcagtr.app/widget/v1/widget.js"
 *     data-token="MUSTERI_TOKENI"
 *     data-mode="auto"
 *     crossorigin="anonymous"
 *     integrity="sha384-HASH"
 *     async
 *   ></script>
 *
 * data-mode     : "auto" (tara+onar) | "scan-only" | "manual"
 * data-lang     : "tr" (varsayılan) | "en"
 * data-fix-mode : "client" (varsayılan) | "server" | "both"
 * data-api-base : API kök adresi (opsiyonel)
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────────
     0. KONFIGÜRASYON
  ───────────────────────────────────────────── */

  const SCRIPT = document.currentScript;
  const GLOBAL_CONFIG = window.WCAGTR_WIDGET_CONFIG || {};
  const EMBEDDED_PUBLIC_KEY_PEM = `__WIDGET_PUBLIC_KEY_PEM__`;

  function toBoolean(value, defaultValue) {
    if (value === undefined || value === null || value === "")
      return defaultValue;
    return ["1", "true", "yes", "on"].includes(
      String(value).trim().toLowerCase(),
    );
  }

  function normalizeApiBase(input, fallback) {
    if (!input) return fallback;

    try {
      const resolved = new URL(String(input), location.origin);
      let normalized = `${resolved.origin}${resolved.pathname}`.replace(
        /\/+$/,
        "",
      );
      if (!/\/api\/v1$/i.test(normalized)) {
        normalized += "/api/v1";
      }
      return normalized;
    } catch {
      return fallback;
    }
  }

  function normalizePublicKey(input) {
    if (!input) return "";
    const key = String(input).trim();
    if (
      !key ||
      key.includes("__WIDGET_PUBLIC_KEY_PEM__") ||
      key.includes("PLACEHOLDER")
    ) {
      return "";
    }
    return key.replace(/\\n/g, "\n");
  }

  const inferredApiBase = (() => {
    try {
      return SCRIPT?.src ? `${new URL(SCRIPT.src).origin}/api/v1` : "";
    } catch {
      return "";
    }
  })();
  const defaultApiBase = "https://api.wcagtr.app/api/v1";
  const configuredApiBase =
    SCRIPT?.dataset?.apiBase ||
    GLOBAL_CONFIG.apiBase ||
    inferredApiBase ||
    defaultApiBase;
  const apiBase = normalizeApiBase(configuredApiBase, defaultApiBase);
  const publicKeyPem = normalizePublicKey(
    SCRIPT?.dataset?.publicKey ||
      GLOBAL_CONFIG.publicKey ||
      EMBEDDED_PUBLIC_KEY_PEM,
  );

  const CONFIG = {
    token: SCRIPT?.dataset?.token || "",
    mode: SCRIPT?.dataset?.mode || "auto",
    lang: SCRIPT?.dataset?.lang || "tr",
    fixMode: SCRIPT?.dataset?.fixMode || "client",
    allowInsecureTokenValidation: toBoolean(
      SCRIPT?.dataset?.allowInsecureTokenValidation,
      false,
    ),
    publicKeyPem,
    apiBase,
  };

  const PUBLIC_KEY_PEM = CONFIG.publicKeyPem;

  const MESSAGES = {
    tr: {
      panelTitle: "Erişilebilirlik Bildirimleri",
      criticalLabel: "KRİTİK",
      highLabel: "YÜKSEK",
      medLabel: "ORTA",
      lowLabel: "DÜŞÜK",
      fixBtn: "Onar",
      fixAllBtn: "Tümünü Onar",
      closeBtn: "Kapat",
      fixedMsg: "Sorun giderildi",
      noViolations: "Erişilebilirlik sorunu tespit edilmedi.",
      scanError: "Tarama sırasında hata oluştu.",
      tokenError: "Geçersiz veya süresi dolmuş token.",
      widgetButtonLabel: "Erişilebilirlik seçeneklerini aç",
      widgetPanelTitle: "Erişilebilirlik Menüsü",
      sectionProfiles: "Hazır Modlar",
      sectionTypography: "Yazı Tipi Boyutlandırma",
      sectionAlignment: "Metin Hizalama",
      sectionVisual: "Görsel Deneyim",
      sectionBackground: "Arkaplan Renk Seçenekleri",
      sectionNavigation: "Yönlendirme",
      sectionSitemap: "Site Haritası",
      modeEpilepsy: "Epilepsi Güvenli Modu",
      modeVisuallyImpaired: "Görme Engelli Modu",
      modeCognitive: "Bilişsel Destek Modu",
      modeAdhd: "DEHB Dostu Modu",
      controlTextScale: "Yazı Boyutu",
      controlLineHeight: "Satır Yüksekliği",
      controlLetterSpacing: "Harf Boşluğu",
      controlReset: "Sıfırla",
      optionLargeText: "Metni Büyüt",
      optionReadableFont: "Okunabilir Yazı Tipi",
      optionDyslexiaFont: "Disleksi Dostu Yazı Tipi",
      optionHighlightHeadings: "Başlıkları Vurgula",
      optionUnderlineLinks: "Bağlantıları Vurgula",
      optionHighContrast: "Yüksek Kontrast",
      optionDarkContrast: "Koyu Kontrast",
      optionLightContrast: "Açık Kontrast",
      optionMonochrome: "Tek Renkli",
      optionLowSaturation: "Düşük Doygunluk",
      optionHighSaturation: "Yüksek Doygunluk",
      optionHideImages: "Resimleri Gizle",
      optionDarkCursor: "Koyu Büyük İmleç",
      optionLightCursor: "Açık Büyük İmleç",
      optionReadingMask: "Okuma Maskesi",
      optionReadingGuide: "Okuma Rehberi",
      optionFocusHighlight: "Odağı Vurgula",
      optionReduceMotion: "Animasyonu Durdur",
      optionKeyboardControl: "Klavye Kontrolü",
      actionReadSite: "Siteyi Sesli Oku",
      actionReadSelection: "Seçilen Metni Oku",
      actionSiteMap: "Site Haritasını Göster",
      alignLeft: "Sola",
      alignCenter: "Ortala",
      alignJustify: "Yasla",
      alignRight: "Sağa",
      bgColorDefault: "Varsayılan",
      bgColorWarm: "Sıcak",
      bgColorCool: "Soğuk",
      bgColorCream: "Krem",
      bgColorDark: "Koyu",
      optionReset: "Ayarları Sıfırla",
      optionOpened: "Erişilebilirlik paneli açıldı",
      optionClosed: "Erişilebilirlik paneli kapatıldı",
      speechUnsupported: "Tarayıcı sesli okuma özelliğini desteklemiyor.",
      noSelection: "Önce bir metin seçin.",
      siteReadStarted: "Sayfa sesli okunuyor.",
      siteReadStopped: "Sesli okuma durduruldu.",
      sitemapTitle: "Sayfa bağlantıları",
      sitemapEmpty: "Bağlantı bulunamadı.",
    },
    en: {
      panelTitle: "Accessibility Notifications",
      criticalLabel: "CRITICAL",
      highLabel: "HIGH",
      medLabel: "MEDIUM",
      lowLabel: "LOW",
      fixBtn: "Fix",
      fixAllBtn: "Fix All",
      closeBtn: "Close",
      fixedMsg: "Issue resolved",
      noViolations: "No accessibility issues detected.",
      scanError: "An error occurred during scan.",
      tokenError: "Invalid or expired token.",
      widgetButtonLabel: "Open accessibility settings",
      widgetPanelTitle: "Accessibility Menu",
      sectionProfiles: "Quick Profiles",
      sectionTypography: "Typography",
      sectionAlignment: "Text Alignment",
      sectionVisual: "Visual Experience",
      sectionBackground: "Background Colors",
      sectionNavigation: "Navigation",
      sectionSitemap: "Sitemap",
      modeEpilepsy: "Seizure Safe Mode",
      modeVisuallyImpaired: "Visually Impaired Mode",
      modeCognitive: "Cognitive Support Mode",
      modeAdhd: "ADHD Friendly Mode",
      controlTextScale: "Text Size",
      controlLineHeight: "Line Height",
      controlLetterSpacing: "Letter Spacing",
      controlReset: "Reset",
      optionLargeText: "Increase Text Size",
      optionReadableFont: "Readable Font",
      optionDyslexiaFont: "Dyslexia Friendly Font",
      optionHighlightHeadings: "Highlight Headings",
      optionUnderlineLinks: "Highlight Links",
      optionHighContrast: "High Contrast",
      optionDarkContrast: "Dark Contrast",
      optionLightContrast: "Light Contrast",
      optionMonochrome: "Monochrome",
      optionLowSaturation: "Low Saturation",
      optionHighSaturation: "High Saturation",
      optionHideImages: "Hide Images",
      optionDarkCursor: "Dark Large Cursor",
      optionLightCursor: "Light Large Cursor",
      optionReadingMask: "Reading Mask",
      optionReadingGuide: "Reading Guide",
      optionFocusHighlight: "Highlight Focus",
      optionReduceMotion: "Stop Animations",
      optionKeyboardControl: "Keyboard Navigation",
      actionReadSite: "Read Site Aloud",
      actionReadSelection: "Read Selected Text",
      actionSiteMap: "Show Sitemap",
      alignLeft: "Left",
      alignCenter: "Center",
      alignJustify: "Justify",
      alignRight: "Right",
      bgColorDefault: "Default",
      bgColorWarm: "Warm",
      bgColorCool: "Cool",
      bgColorCream: "Cream",
      bgColorDark: "Dark",
      optionReset: "Reset Settings",
      optionOpened: "Accessibility panel opened",
      optionClosed: "Accessibility panel closed",
      speechUnsupported: "Speech synthesis is not supported in this browser.",
      noSelection: "Please select some text first.",
      siteReadStarted: "Reading the page aloud.",
      siteReadStopped: "Read aloud stopped.",
      sitemapTitle: "Page links",
      sitemapEmpty: "No links found.",
    },
  };

  const T = MESSAGES[CONFIG.lang] || MESSAGES.tr;

  /* ─────────────────────────────────────────────
     1. TOKEN VALIDATOR
  ───────────────────────────────────────────── */

  const TokenValidator = {
    async validate(rawToken) {
      if (!rawToken) throw new Error(T.tokenError);

      const parts = rawToken.split(".");
      if (parts.length !== 3) throw new Error(T.tokenError);

      const [header, payload, sig] = parts;

      let headerClaims;
      try {
        headerClaims = JSON.parse(atob(this._b64urlToBase64(header)));
      } catch {
        throw new Error(T.tokenError);
      }

      let claims;
      try {
        claims = JSON.parse(atob(this._b64url(payload)));
      } catch {
        throw new Error(T.tokenError);
      }

      // Süre kontrolü
      if (claims.exp && claims.exp < Date.now() / 1000) {
        throw new Error(T.tokenError + " (süresi dolmuş)");
      }

      // Domain kontrolü
      if (claims.domain && claims.domain !== location.hostname) {
        throw new Error(T.tokenError + " (domain uyuşmuyor)");
      }

      if (
        !CONFIG.allowInsecureTokenValidation &&
        headerClaims.alg !== "RS256"
      ) {
        throw new Error(T.tokenError + " (desteklenmeyen algoritma)");
      }

      if (!PUBLIC_KEY_PEM) {
        if (CONFIG.allowInsecureTokenValidation) {
          console.warn(
            "[WCAGTR] Public key yok; token imza doğrulaması dev modda atlandı.",
          );
          return claims;
        }
        throw new Error(T.tokenError + " (public key eksik)");
      }

      if (!window.crypto?.subtle) {
        if (CONFIG.allowInsecureTokenValidation) {
          console.warn(
            "[WCAGTR] Web Crypto API mevcut değil; token imza doğrulaması atlandı.",
          );
          return claims;
        }
        throw new Error(T.tokenError + " (crypto desteklenmiyor)");
      }

      const data = new TextEncoder().encode(`${header}.${payload}`);
      const keyDer = this._pemToDer(PUBLIC_KEY_PEM);

      const key = await crypto.subtle.importKey(
        "spki",
        keyDer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );

      const sigBuf = this._base64urlDecode(sig);
      const valid = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        key,
        sigBuf,
        data,
      );
      if (!valid) throw new Error(T.tokenError + " (imza geçersiz)");

      return claims; // { domain, plan, features, expires }
    },

    _b64url(str) {
      return str.replace(/-/g, "+").replace(/_/g, "/");
    },

    _b64urlToBase64(str) {
      const base = this._b64url(str);
      const padLen = (4 - (base.length % 4)) % 4;
      return `${base}${"=".repeat(padLen)}`;
    },

    _base64urlDecode(str) {
      const b64 = this._b64urlToBase64(str);
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return buf.buffer;
    },

    _pemToDer(pem) {
      const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
      return this._base64urlDecode(b64);
    },
  };

  /* ─────────────────────────────────────────────
     2. CACHE MANAGER (IndexedDB)
  ───────────────────────────────────────────── */

  class CacheManager {
    constructor() {
      this._db = null;
    }

    async open() {
      if (this._db) return this._db;
      return new Promise((resolve, reject) => {
        const req = indexedDB.open("wcagtr-widget", 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("scans"))
            db.createObjectStore("scans", { keyPath: "url" });
          if (!db.objectStoreNames.contains("fixes"))
            db.createObjectStore("fixes", { keyPath: "selector" });
          if (!db.objectStoreNames.contains("patches"))
            db.createObjectStore("patches", { keyPath: "fileHash" });
        };
        req.onsuccess = (e) => {
          this._db = e.target.result;
          resolve(this._db);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async _get(store, key) {
      const db = await this.open();
      return new Promise((resolve) => {
        const req = db
          .transaction(store, "readonly")
          .objectStore(store)
          .get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    }

    async _put(store, value) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }

    async getScan(url) {
      const record = await this._get("scans", url);
      if (record && Date.now() - record.timestamp < 86_400_000) return record;
      return null;
    }

    async saveScan(url, violations) {
      await this._put("scans", { url, violations, timestamp: Date.now() });
    }

    async getFix(selector) {
      return this._get("fixes", selector);
    }

    async saveFix(selector, fix) {
      await this._put("fixes", { selector, ...fix });
    }

    async savePatch(fileHash, patch) {
      await this._put("patches", { fileHash, patch, timestamp: Date.now() });
    }
  }

  /* ─────────────────────────────────────────────
     3. DOM SCANNER
     Tüm 31 WCAG 2.2 / TR Erişilebilirlik Kriteri
  ───────────────────────────────────────────── */

  class DOMScanner {
    scan() {
      const violations = [];
      const add = (v) => violations.push(v);

      // ── 1. METİNSEL OLMAYAN İÇERİK (WCAG 1.1.1) ──────────────────────
      document.querySelectorAll("img").forEach((el) => {
        if (!el.hasAttribute("alt")) {
          add({
            wcag: "1.1.1",
            rule: "img-alt",
            severity: "kritik",
            element: getSelector(el),
            message: "Görsel için alternatif metin (alt) eksik",
            fix: { type: "attribute", attr: "alt", value: "" },
          });
        }
      });

      // SVG/canvas/area alt veya aria-label
      document.querySelectorAll("svg, canvas, area").forEach((el) => {
        const hasLabel =
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          el.getAttribute("title") ||
          el.getAttribute("alt");
        if (!hasLabel) {
          add({
            wcag: "1.1.1",
            rule: "non-text-alt",
            severity: "kritik",
            element: getSelector(el),
            message: `<${el.tagName.toLowerCase()}> için erişilebilir ad (aria-label/title) eksik`,
            fix: { type: "aria-label", value: "" },
          });
        }
      });

      // CAPTCHA açıklaması
      document
        .querySelectorAll('[id*="captcha"], [class*="captcha"], [data-captcha]')
        .forEach((el) => {
          const hasDesc =
            el.getAttribute("aria-describedby") ||
            el.getAttribute("aria-label");
          if (!hasDesc) {
            add({
              wcag: "1.1.1",
              rule: "captcha-alt",
              severity: "yüksek",
              element: getSelector(el),
              message: "CAPTCHA için metin açıklaması eksik",
              fix: { type: "aria-label", value: "Güvenlik doğrulama kodu" },
            });
          }
        });

      // ── 2. SADECE SES / VİDEO (WCAG 1.2.1 – 1.2.3) ──────────────────
      document.querySelectorAll("video, audio").forEach((el) => {
        const hasTrack = el.querySelector("track");
        if (!hasTrack) {
          add({
            wcag: "1.2.2",
            rule: "media-captions",
            severity: "yüksek",
            element: getSelector(el),
            message: `<${el.tagName.toLowerCase()}> için altyazı veya transkript (<track>) eksik`,
            fix: {
              type: "info",
              message: 'Uygun <track kind="captions"> ekleyin.',
            },
          });
        }
        // Otomatik oynatma kontrolü
        if (el.hasAttribute("autoplay") && !el.hasAttribute("muted")) {
          add({
            wcag: "1.4.2",
            rule: "audio-autoplay",
            severity: "yüksek",
            element: getSelector(el),
            message:
              "Otomatik oynatılan medya: kullanıcı durdurma/duraklatma kontrolüne erişemeyebilir",
            fix: { type: "attribute", attr: "muted", value: "" },
          });
        }
      });

      // ── 3. BİLGİ VE İLİŞKİLER (WCAG 1.3.1) ─────────────────────────

      // Başlık sırası
      const headings = Array.from(
        document.querySelectorAll("h1,h2,h3,h4,h5,h6"),
      );
      let prevLevel = 0;
      headings.forEach((el) => {
        const level = parseInt(el.tagName[1], 10);
        if (prevLevel > 0 && level > prevLevel + 1) {
          add({
            wcag: "1.3.1",
            rule: "heading-order",
            severity: "orta",
            element: getSelector(el),
            message: `Başlık seviyesi atlandı: h${prevLevel} → h${level}`,
            fix: {
              type: "info",
              message: `h${prevLevel} sonrası h${prevLevel + 1} kullanın.`,
            },
          });
        }
        prevLevel = level;
      });

      // Hiç h1 yoksa
      if (!document.querySelector("h1")) {
        add({
          wcag: "1.3.1",
          rule: "heading-h1",
          severity: "orta",
          element: "body",
          message: "Sayfada <h1> başlığı yok",
          fix: {
            type: "info",
            message: "Ana içerik başlığı için bir <h1> ekleyin.",
          },
        });
      }

      // Form etiket kontrolü
      document
        .querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), select, textarea',
        )
        .forEach((el) => {
          const id = el.getAttribute("id");
          const hasLabel =
            id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
          const hasAria =
            el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
          const hasTitle = el.getAttribute("title");
          if (!hasLabel && !hasAria && !hasTitle) {
            add({
              wcag: "1.3.1",
              rule: "form-label",
              severity: "kritik",
              element: getSelector(el),
              message: "Form elemanı için etiket (label/aria-label) eksik",
              fix: { type: "aria-label", value: "" },
            });
          }
        });

      // Tablo başlıkları
      document.querySelectorAll("table").forEach((table) => {
        if (!table.querySelector("caption")) {
          add({
            wcag: "1.3.1",
            rule: "table-caption",
            severity: "orta",
            element: getSelector(table),
            message: "Tabloda <caption> (başlık) eksik",
            fix: { type: "info", message: "<table> içine <caption> ekleyin." },
          });
        }
        if (!table.querySelector("th")) {
          add({
            wcag: "1.3.1",
            rule: "table-headers",
            severity: "yüksek",
            element: getSelector(table),
            message: "Tabloda <th> başlık hücresi yok",
            fix: {
              type: "info",
              message:
                'Sütun/satır başlıkları için <th scope="col/row"> kullanın.',
            },
          });
        }
      });

      // <th> scope eksikliği
      document.querySelectorAll("th:not([scope])").forEach((el) => {
        add({
          wcag: "1.3.1",
          rule: "th-scope",
          severity: "orta",
          element: getSelector(el),
          message: "<th> üzerinde scope özniteliği eksik",
          fix: { type: "attribute", attr: "scope", value: "col" },
        });
      });

      // Nav role
      document
        .querySelectorAll(
          'div[class*="nav"], div[class*="menu"], div[id*="nav"], div[id*="menu"]',
        )
        .forEach((el) => {
          if (!el.getAttribute("role") && el.tagName !== "NAV") {
            add({
              wcag: "1.3.1",
              rule: "nav-role",
              severity: "orta",
              element: getSelector(el),
              message: 'Navigasyon bloğunda role="navigation" eksik',
              fix: { type: "attribute", attr: "role", value: "navigation" },
            });
          }
        });

      // <b> ve <i> yerine <strong> ve <em>
      document.querySelectorAll("b, i").forEach((el) => {
        add({
          wcag: "1.3.1",
          rule: "semantic-emphasis",
          severity: "düşük",
          element: getSelector(el),
          message: `Anlamsal etiket kullanın: <${el.tagName.toLowerCase()}> yerine ${el.tagName === "B" ? "<strong>" : "<em>"}`,
          fix: {
            type: "info",
            message:
              "Anlam taşıyan vurgu için semantic HTML etiketleri tercih edin.",
          },
        });
      });

      // ── 4. ANLAMLI SIRALAMA (WCAG 1.3.2) ────────────────────────────
      document.querySelectorAll("[tabindex]").forEach((el) => {
        const val = parseInt(el.getAttribute("tabindex"), 10);
        if (val > 0) {
          add({
            wcag: "1.3.2",
            rule: "positive-tabindex",
            severity: "orta",
            element: getSelector(el),
            message: `tabindex="${val}" odak sırasını bozabilir; 0 veya -1 kullanın`,
            fix: { type: "attribute", attr: "tabindex", value: "0" },
          });
        }
      });

      // ── 5. RENK KULLANIMI (WCAG 1.4.1) ──────────────────────────────
      // Sadece renkle iletilen zorunlu alan uyarılarını yakala
      document
        .querySelectorAll('[required], [aria-required="true"]')
        .forEach((el) => {
          const id = el.getAttribute("id");
          const label = id
            ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
            : null;
          const hasText =
            label && /zorunlu|required|\*/i.test(label.textContent);
          if (!hasText && !el.getAttribute("aria-describedby")) {
            add({
              wcag: "1.4.1",
              rule: "required-text",
              severity: "orta",
              element: getSelector(el),
              message:
                "Zorunlu alan yalnızca renkle belirtilmiş olabilir; metin göstergesi ekleyin",
              fix: {
                type: "info",
                message:
                  'Etikette "(Zorunlu)" metni veya aria-describedby kullanın.',
              },
            });
          }
        });

      // ── 6. ATLAMA BAĞLANTISI (WCAG 2.4.1) ───────────────────────────
      const skipLink = document.querySelector(
        'a[href="#main-content"], a[href="#icerik"], a[href="#content"].skip-link, .skip-link',
      );
      if (!skipLink) {
        add({
          wcag: "2.4.1",
          rule: "skip-link",
          severity: "yüksek",
          element: "body",
          message: 'Tekrar eden içeriği atlayan "İçeriğe geç" bağlantısı eksik',
          fix: {
            type: "prepend",
            tag: "a",
            attrs: { href: "#main-content", class: "wcagtr-skip-link" },
            text: "İçeriğe geç",
          },
        });
      }

      // ── 7. SAYFA BAŞLIĞI (WCAG 2.4.2) ───────────────────────────────
      if (!document.title || document.title.trim() === "") {
        add({
          wcag: "2.4.2",
          rule: "page-title",
          severity: "yüksek",
          element: "title",
          message: "Sayfa başlığı (title) eksik veya boş",
          fix: { type: "title", value: "" },
        });
      }

      // ── 8. BAĞLANTININ MAKSADI (WCAG 2.4.4) ─────────────────────────
      const ambiguousTexts = [
        "tıklayınız",
        "buraya tıklayın",
        "devam",
        "daha fazla",
        "daha fazla oku",
        "click here",
        "read more",
        "more",
        "here",
        "link",
      ];
      document.querySelectorAll("a").forEach((el) => {
        const text = (el.textContent || el.getAttribute("aria-label") || "")
          .trim()
          .toLowerCase();
        if (!text) {
          add({
            wcag: "2.4.4",
            rule: "link-empty",
            severity: "kritik",
            element: getSelector(el),
            message: "Bağlantıda görünür metin veya aria-label yok",
            fix: { type: "aria-label", value: "" },
          });
        } else if (ambiguousTexts.includes(text)) {
          add({
            wcag: "2.4.4",
            rule: "link-purpose",
            severity: "orta",
            element: getSelector(el),
            message: `Belirsiz bağlantı metni: "${text}"`,
            fix: { type: "aria-label", value: "" },
          });
        }
      });

      // ── 9. ODAK GÖSTERGESİ (WCAG 2.4.7) ────────────────────────────
      // outline:none veya outline:0 uygulayan stilleri tespit et
      const styleSheets = Array.from(document.styleSheets);
      styleSheets.forEach((sheet) => {
        try {
          Array.from(sheet.cssRules || []).forEach((rule) => {
            if (rule.selectorText && rule.style) {
              const outline = rule.style.getPropertyValue("outline");
              if (
                /\bnone\b|^0$/.test(outline) &&
                /:focus/.test(rule.selectorText)
              ) {
                add({
                  wcag: "2.4.7",
                  rule: "focus-visible",
                  severity: "yüksek",
                  element: rule.selectorText,
                  message: `"${rule.selectorText}" kuralında outline:none odak görünürlüğünü kaldırıyor`,
                  fix: {
                    type: "css",
                    selector: rule.selectorText,
                    styles: {
                      outline: "3px solid #005fcc",
                      "outline-offset": "2px",
                    },
                  },
                });
              }
            }
          });
        } catch {
          // Cross-origin stylesheet — erişilemiyor, atla
        }
      });

      // ── 10. İSİMLERİN KULLANILAN ETİKETİ İÇERMESİ (WCAG 2.5.3) ─────
      document.querySelectorAll('button, [role="button"]').forEach((el) => {
        const visibleText = el.textContent.trim();
        const ariaLabel = el.getAttribute("aria-label") || "";
        if (
          ariaLabel &&
          visibleText &&
          !ariaLabel.toLowerCase().includes(visibleText.toLowerCase())
        ) {
          add({
            wcag: "2.5.3",
            rule: "label-in-name",
            severity: "orta",
            element: getSelector(el),
            message: `aria-label ("${ariaLabel}") görünür etiketi ("${visibleText}") içermiyor`,
            fix: { type: "aria-label", value: visibleText },
          });
        }
      });

      // ── 11. SAYFA DİLİ (WCAG 3.1.1) ────────────────────────────────
      if (!document.documentElement.getAttribute("lang")) {
        add({
          wcag: "3.1.1",
          rule: "html-lang",
          severity: "yüksek",
          element: "html",
          message: "HTML sayfasında dil (lang) özniteliği belirtilmemiş",
          fix: { type: "attribute", attr: "lang", value: "tr" },
        });
      }

      // ── 12. ODAKLAMADA BAĞLAM DEĞİŞİKLİĞİ YOK (WCAG 3.2.1) ─────────
      // onfocus ile tetiklenen submit/navigation/reload
      document.querySelectorAll("[onfocus]").forEach((el) => {
        const handler = el.getAttribute("onfocus") || "";
        if (/submit|location|navigate|reload/i.test(handler)) {
          add({
            wcag: "3.2.1",
            rule: "no-context-on-focus",
            severity: "yüksek",
            element: getSelector(el),
            message: "Odaklanma (focus) anında bağlam değişikliği tetikleniyor",
            fix: {
              type: "info",
              message:
                "onfocus ile sayfa yönlendirmesi veya submit kullanmayın.",
            },
          });
        }
      });

      // ── 13. GİRDİ İÇİN (WCAG 3.2.2) ────────────────────────────────
      // onchange ile otomatik gönderim yapan select elementleri
      document.querySelectorAll("select[onchange]").forEach((el) => {
        const handler = el.getAttribute("onchange") || "";
        if (/submit|location|navigate/i.test(handler)) {
          add({
            wcag: "3.2.2",
            rule: "no-auto-submit",
            severity: "yüksek",
            element: getSelector(el),
            message:
              "Seçim değiştiğinde otomatik bağlam değişikliği oluyor; Submit butonu gerekli",
            fix: {
              type: "info",
              message:
                "Kullanıcıdan formu Submit butonu ile onaylamasını isteyin.",
            },
          });
        }
      });

      // ── 14. HATA TANIMLAMASI (WCAG 3.3.1) ───────────────────────────
      // aria-invalid=true olan elemanlarda aria-describedby ile hata mesajı olmalı
      document.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
        if (!el.getAttribute("aria-describedby")) {
          add({
            wcag: "3.3.1",
            rule: "error-description",
            severity: "kritik",
            element: getSelector(el),
            message:
              "Geçersiz alan (aria-invalid=true) için aria-describedby ile hata mesajı bağlantısı eksik",
            fix: {
              type: "info",
              message:
                "Hata mesajı elementine id ekleyin, aria-describedby ile bağlayın.",
            },
          });
        }
      });

      // ── 15. ETİKETLER VE KULLANIM TALİMATLARI (WCAG 3.3.2) ──────────
      // Zorunlu alan göstergesi sadece * ise metin alternatifi yoktur
      document.querySelectorAll("label").forEach((label) => {
        if (/^\s*\*\s*$/.test(label.textContent)) {
          add({
            wcag: "3.3.2",
            rule: "required-indicator",
            severity: "orta",
            element: getSelector(label),
            message:
              'Zorunlu alan yalnızca "*" ile gösteriliyor; metin açıklaması da ekleyin',
            fix: {
              type: "info",
              message: '"(zorunlu)" metnini etikete ekleyin.',
            },
          });
        }
      });

      // fieldset/legend gruplandırma eksikliği — checkbox/radio grubu
      const checkboxGroups = {};
      document
        .querySelectorAll('input[type="checkbox"], input[type="radio"]')
        .forEach((el) => {
          const name = el.getAttribute("name") || el.id || getSelector(el);
          if (!checkboxGroups[name]) checkboxGroups[name] = [];
          checkboxGroups[name].push(el);
        });
      Object.values(checkboxGroups).forEach((group) => {
        if (group.length > 1) {
          const inFieldset = group[0].closest("fieldset");
          if (!inFieldset) {
            add({
              wcag: "3.3.2",
              rule: "fieldset-legend",
              severity: "orta",
              element: getSelector(group[0]),
              message:
                "İlgili form grubu <fieldset> ve <legend> ile sarmalanmamış",
              fix: {
                type: "info",
                message:
                  "Grup elemanlarını <fieldset><legend>Başlık</legend>...</fieldset> içine alın.",
              },
            });
          }
        }
      });

      // ── 16. İSİM, ROL, DEĞER (WCAG 4.1.2) ──────────────────────────
      // Düğme gibi davranan ama button olmayan öğeler
      document
        .querySelectorAll(
          "[onclick]:not(button):not(a):not(input):not(select):not(textarea)",
        )
        .forEach((el) => {
          const role = el.getAttribute("role");
          if (!role) {
            add({
              wcag: "4.1.2",
              rule: "interactive-role",
              severity: "yüksek",
              element: getSelector(el),
              message:
                "Tıklanabilir eleman için role (button/link vb.) ve keyboard desteği eksik",
              fix: { type: "attribute", attr: "role", value: "button" },
            });
          }
          if (!el.hasAttribute("tabindex")) {
            add({
              wcag: "4.1.2",
              rule: "interactive-tabindex",
              severity: "yüksek",
              element: getSelector(el),
              message:
                "Tıklanabilir eleman klavye ile erişilebilir değil (tabindex eksik)",
              fix: { type: "attribute", attr: "tabindex", value: "0" },
            });
          }
        });

      // Genişletilebilir bileşenlerde aria-expanded eksikliği
      document
        .querySelectorAll("[data-toggle], [data-collapse], [data-dropdown]")
        .forEach((el) => {
          if (
            !el.hasAttribute("aria-expanded") &&
            !el.hasAttribute("aria-haspopup")
          ) {
            add({
              wcag: "4.1.2",
              rule: "aria-expanded",
              severity: "orta",
              element: getSelector(el),
              message:
                "Genişletilebilir eleman için aria-expanded veya aria-haspopup eksik",
              fix: { type: "attribute", attr: "aria-expanded", value: "false" },
            });
          }
        });

      // ── 17. KLAVYE ERİŞİLEBİLİRLİK (WCAG 2.1.1) ────────────────────
      // onmouseover ile işlev gören ama klavye alternatifi olmayan öğeler
      document
        .querySelectorAll(
          "[onmouseover]:not([onfocus]):not([onkeydown]):not([onkeyup])",
        )
        .forEach((el) => {
          add({
            wcag: "2.1.1",
            rule: "keyboard-alt",
            severity: "yüksek",
            element: getSelector(el),
            message:
              "onmouseover ile işlev var ancak klavye (onfocus/onkeydown) alternatifi yok",
            fix: {
              type: "info",
              message: "onmouseover işlevini onfocus olayına da bağlayın.",
            },
          });
        });

      // ── 18. DURAKLATMA / DURDURMA (WCAG 2.2.2) ──────────────────────
      // marquee ve otomatik kayan içerik
      document.querySelectorAll("marquee").forEach((el) => {
        add({
          wcag: "2.2.2",
          rule: "marquee",
          severity: "yüksek",
          element: getSelector(el),
          message:
            "<marquee> eski ve erişilebilir değil; durdur/başlat kontrolü sunan modern bir çözüm kullanın",
          fix: {
            type: "info",
            message:
              "<marquee> yerine pause/play butonu olan CSS animasyonu kullanın.",
          },
        });
      });

      // ── 19. BLOKLARIN PAS GEÇİLMESİ — frame/iframe başlığı ──────────
      document.querySelectorAll("iframe").forEach((el) => {
        if (!el.getAttribute("title")) {
          add({
            wcag: "2.4.1",
            rule: "iframe-title",
            severity: "orta",
            element: getSelector(el),
            message: "<iframe> için title özniteliği eksik",
            fix: { type: "attribute", attr: "title", value: "" },
          });
        }
      });

      // ── 20. TEKRARLANAN GİRİŞ (WCAG 3.3.7) ──────────────────────────
      // autocomplete olmayan metin alanlarını raporla
      const autocompleteCandidates = [
        "name",
        "email",
        "tel",
        "address",
        "username",
        "password",
      ];
      document
        .querySelectorAll(
          'input[type="text"], input[type="email"], input[type="tel"]',
        )
        .forEach((el) => {
          if (!el.hasAttribute("autocomplete")) {
            const name = (
              el.getAttribute("name") ||
              el.getAttribute("id") ||
              ""
            ).toLowerCase();
            const matches = autocompleteCandidates.some((k) =>
              name.includes(k),
            );
            if (matches) {
              add({
                wcag: "3.3.7",
                rule: "autocomplete",
                severity: "düşük",
                element: getSelector(el),
                message:
                  "Tekrarlanan giriş kolaylığı için autocomplete özniteliği önerilir",
                fix: {
                  type: "info",
                  message:
                    "Uygun autocomplete değeri ekleyin (name, email, tel vb.).",
                },
              });
            }
          }
        });

      return violations;
    }
  }

  /* ─────────────────────────────────────────────
     4. CLIENT FIXER
  ───────────────────────────────────────────── */

  class ClientFixer {
    applyFix(violation, suggestedFix) {
      const sel = violation.element;

      switch (suggestedFix.type) {
        case "attribute": {
          const el = this._el(sel);
          if (!el) return false;
          el.setAttribute(suggestedFix.attr, suggestedFix.value);
          break;
        }
        case "aria-label": {
          const el = this._el(sel);
          if (!el) return false;
          el.setAttribute("aria-label", suggestedFix.value);
          break;
        }
        case "title": {
          document.title = suggestedFix.value;
          break;
        }
        case "css": {
          this._injectCSS(suggestedFix.selector, suggestedFix.styles);
          break;
        }
        case "prepend": {
          // Atlama bağlantısı gibi body'nin başına element ekle
          const el = document.createElement(suggestedFix.tag);
          Object.entries(suggestedFix.attrs || {}).forEach(([k, v]) =>
            el.setAttribute(k, v),
          );
          el.textContent = suggestedFix.text || "";
          document.body.insertBefore(el, document.body.firstChild);
          break;
        }
        case "wrap": {
          const el = this._el(sel);
          if (!el) return false;
          const wrapper = document.createElement(suggestedFix.tag);
          if (suggestedFix.attrs) {
            Object.entries(suggestedFix.attrs).forEach(([k, v]) =>
              wrapper.setAttribute(k, v),
            );
          }
          el.parentNode.insertBefore(wrapper, el);
          wrapper.appendChild(el);
          break;
        }
        case "info":
        default:
          // Otomatik uygulanamaz; bildiri panelinde gösterilir
          return false;
      }
      return true;
    }

    _el(selector) {
      if (selector === "html") return document.documentElement;
      if (selector === "body") return document.body;
      if (selector === "title") return document.querySelector("title");
      try {
        return document.querySelector(selector);
      } catch {
        return null;
      }
    }

    _injectCSS(selector, styles) {
      let sheet = document.getElementById("wcagtr-fixes");
      if (!sheet) {
        sheet = document.createElement("style");
        sheet.id = "wcagtr-fixes";
        sheet.setAttribute(
          "nonce",
          document.querySelector('meta[name="csp-nonce"]')?.content || "",
        );
        document.head.appendChild(sheet);
      }
      const rule = `${selector} { ${Object.entries(styles)
        .map(([k, v]) => `${k}:${v}`)
        .join(";")} }`;
      try {
        sheet.sheet.insertRule(rule, sheet.sheet.cssRules.length);
      } catch {
        /* geçersiz selector */
      }
    }

    injectSkipLinkStyles() {
      this._injectCSS(".wcagtr-skip-link", {
        position: "absolute",
        top: "-9999px",
        left: "-9999px",
        "z-index": "999999",
        background: "#005fcc",
        color: "#fff",
        padding: "12px 24px",
        "font-size": "1rem",
        "border-radius": "0 0 4px 4px",
        "text-decoration": "none",
      });
      this._injectCSS(".wcagtr-skip-link:focus", {
        top: "0",
        left: "0",
        outline: "3px solid #ffbf00",
        "outline-offset": "2px",
      });
    }
  }

  /* ─────────────────────────────────────────────
     5. VIOLATION REPORTER
  ───────────────────────────────────────────── */

  class ViolationReporter {
    constructor(token) {
      this._token = token;
      this._timer = null;
      this._pending = null;
    }

    report(violations) {
      this._pending = violations;
      clearTimeout(this._timer);
      // 2 saniyelik debounce — DOM mutasyonlarında çok fazla istek atmamak için
      this._timer = setTimeout(() => this._send(), 2000);
    }

    async _send() {
      if (!this._pending) return;
      const payload = {
        url: location.href,
        violations: this._pending,
        timestamp: new Date().toISOString(),
      };
      try {
        await fetch(`${CONFIG.apiBase}/scan/report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this._token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // Ağ hatası — sessizce yok say, sonraki taramada tekrar denenir
      }
      this._pending = null;
    }
  }

  /* ─────────────────────────────────────────────
     6. AI SCAN REQUESTER
  ───────────────────────────────────────────── */

  async function requestAIScan(violations, token) {
    // DOM snapshotında PII olmadığından emin olmak için
    // input[type=password] ve meta verilerini temizle
    const sanitized = document.documentElement.cloneNode(true);
    sanitized
      .querySelectorAll('input[type="password"], script, style')
      .forEach((n) => n.remove());
    const domSnapshot = sanitized.outerHTML.slice(0, 60_000); // max 60 KB

    const res = await fetch(`${CONFIG.apiBase}/scan/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: location.href,
        violations,
        domSnapshot,
        lang: CONFIG.lang,
      }),
    });
    if (!res.ok) throw new Error(`AI tarama hatası: ${res.status}`);
    return res.json();
    // Yanıt: { fixes: [{ selector, fix, confidence, explanation }] }
  }

  /* ─────────────────────────────────────────────
     7. PATCH REQUESTER (Sunucu tarafı yamalar)
  ───────────────────────────────────────────── */

  class PatchRequester {
    constructor(token) {
      this._token = token;
    }

    async requestPatches(violations) {
      const res = await fetch(`${CONFIG.apiBase}/patches/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._token}`,
        },
        body: JSON.stringify({ url: location.href, violations }),
      });
      if (!res.ok) return [];
      return (await res.json()).patches || [];
    }
  }

  /* ─────────────────────────────────────────────
     8. OWNER NOTIFIER (Site sahibine bildiri paneli)
  ───────────────────────────────────────────── */

  class OwnerNotifier {
    constructor(fixer) {
      this._fixer = fixer;
      this._panel = null;
    }

    show(violations, onFix) {
      if (this._panel) this._panel.remove();
      if (!violations.length) return;

      this._panel = this._buildPanel(violations, onFix);
      document.body.appendChild(this._panel);

      // Odak yönetimi — ilk butona odaklan
      const firstBtn = this._panel.querySelector("button");
      firstBtn?.focus();

      // Klavye tuzağı
      this._panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this._close();
        if (e.key === "Tab") this._trapFocus(e);
      });
    }

    _buildPanel(violations, onFix) {
      const severityMap = {
        kritik: T.criticalLabel,
        yüksek: T.highLabel,
        orta: T.medLabel,
        düşük: T.lowLabel,
      };

      const listItems = violations
        .map((v) => {
          const sev = severityMap[v.severity] || v.severity.toUpperCase();
          return `
          <li class="wcagtr-item wcagtr-sev-${v.severity}" role="listitem">
            <span class="wcagtr-badge" aria-hidden="true">${sev}</span>
            <span class="wcagtr-msg">
              <strong>WCAG ${v.wcag}</strong>: ${v.message}
            </span>
            <button
              class="wcagtr-fix-btn"
              aria-label="${v.message} sorununu onar"
              data-rule="${v.rule}"
              data-selector="${v.element}"
            >${T.fixBtn}</button>
          </li>`;
        })
        .join("");

      const panel = document.createElement("aside");
      panel.id = "wcagtr-panel";
      panel.setAttribute("role", "complementary");
      panel.setAttribute("aria-label", T.panelTitle);
      panel.setAttribute("aria-live", "polite");
      panel.innerHTML = `
        <div
          id="wcagtr-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wcagtr-title"
        >
          <h2 id="wcagtr-title" class="wcagtr-title">
            ${violations.length} ${T.panelTitle}
          </h2>
          <ul class="wcagtr-list" aria-label="${T.panelTitle}" role="list">
            ${listItems}
          </ul>
          <div class="wcagtr-actions">
            <button id="wcagtr-fix-all" class="wcagtr-btn-primary">${T.fixAllBtn}</button>
            <button id="wcagtr-close"   class="wcagtr-btn-secondary" aria-label="${T.closeBtn}">${T.closeBtn}</button>
          </div>
        </div>`;

      this._injectPanelStyles();

      // Tek tek onar
      panel.querySelectorAll(".wcagtr-fix-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const rule = btn.dataset.rule;
          const selector = btn.dataset.selector;
          const v = violations.find(
            (x) => x.rule === rule && x.element === selector,
          );
          if (v && onFix) onFix([v]);
          btn.textContent = T.fixedMsg;
          btn.disabled = true;
          btn.setAttribute("aria-disabled", "true");
        });
      });

      // Tümünü onar
      panel.querySelector("#wcagtr-fix-all").addEventListener("click", () => {
        if (onFix) onFix(violations);
        panel.querySelectorAll(".wcagtr-fix-btn").forEach((b) => {
          b.textContent = T.fixedMsg;
          b.disabled = true;
          b.setAttribute("aria-disabled", "true");
        });
      });

      // Kapat
      panel
        .querySelector("#wcagtr-close")
        .addEventListener("click", () => this._close());

      return panel;
    }

    _close() {
      if (this._panel) {
        this._panel.remove();
        this._panel = null;
      }
    }

    _trapFocus(e) {
      if (!this._panel) return;
      const focusable = Array.from(
        this._panel.querySelectorAll(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    _injectPanelStyles() {
      if (document.getElementById("wcagtr-styles")) return;
      const style = document.createElement("style");
      style.id = "wcagtr-styles";
      style.textContent = `
        #wcagtr-panel {
          position: fixed;
          bottom: 0;
          right: 0;
          z-index: 2147483647;
          width: min(480px, 100vw);
          max-height: 80vh;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #1a1a1a;
          background: #fff;
          border-top: 4px solid #005fcc;
          border-left: 1px solid #ccc;
          border-radius: 8px 0 0 0;
          box-shadow: -2px -2px 16px rgba(0,0,0,.2);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        #wcagtr-dialog {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
          max-height: 80vh;
        }
        .wcagtr-title {
          margin: 0;
          padding: 12px 16px;
          font-size: 1rem;
          background: #005fcc;
          color: #fff;
        }
        .wcagtr-list {
          margin: 0;
          padding: 8px 0;
          list-style: none;
          overflow-y: auto;
          flex: 1;
        }
        .wcagtr-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 16px;
          border-bottom: 1px solid #eee;
        }
        .wcagtr-badge {
          flex-shrink: 0;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .5px;
          background: #eee;
          color: #333;
        }
        .wcagtr-sev-kritik .wcagtr-badge { background:#d32f2f; color:#fff; }
        .wcagtr-sev-yüksek .wcagtr-badge { background:#e65100; color:#fff; }
        .wcagtr-sev-orta   .wcagtr-badge { background:#f9a825; color:#000; }
        .wcagtr-sev-düşük  .wcagtr-badge { background:#388e3c; color:#fff; }
        .wcagtr-msg { flex: 1; font-size: .85rem; }
        .wcagtr-fix-btn {
          flex-shrink: 0;
          padding: 4px 10px;
          border: 1px solid #005fcc;
          border-radius: 4px;
          background: #fff;
          color: #005fcc;
          cursor: pointer;
          font-size: .8rem;
          min-width: 44px;
          min-height: 44px;
        }
        .wcagtr-fix-btn:focus {
          outline: 3px solid #005fcc;
          outline-offset: 2px;
        }
        .wcagtr-fix-btn:disabled { opacity: .5; cursor: default; }
        .wcagtr-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #eee;
          background: #f9f9f9;
        }
        .wcagtr-btn-primary {
          flex: 1;
          padding: 10px;
          background: #005fcc;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: .9rem;
          min-height: 44px;
        }
        .wcagtr-btn-primary:focus {
          outline: 3px solid #ffbf00;
          outline-offset: 2px;
        }
        .wcagtr-btn-secondary {
          padding: 10px 16px;
          background: #fff;
          color: #333;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          font-size: .9rem;
          min-height: 44px;
        }
        .wcagtr-btn-secondary:focus {
          outline: 3px solid #005fcc;
          outline-offset: 2px;
        }
        @media (max-width: 480px) {
          #wcagtr-panel { width: 100vw; right: 0; border-radius: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          #wcagtr-panel { transition: none; }
        }
        @media (forced-colors: active) {
          .wcagtr-badge { border: 1px solid ButtonText; }
          .wcagtr-btn-primary { forced-color-adjust: none; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* ─────────────────────────────────────────────
     8.5 ACCESSIBILITY WIDGET (Ziyaretçi butonu)
  ───────────────────────────────────────────── */

  class AccessibilityWidget {
    constructor() {
      this._launcher = null;
      this._panel = null;
      this._liveRegion = null;
      this._lastFocused = null;
      this._storageKey = `wcagtr-user-settings:${location.hostname}`;
      this._settings = this._defaultSettings();
      this._classMap = {
        readableFont: "wcagtr-a11y-readable-font",
        dyslexiaFont: "wcagtr-a11y-dyslexia-font",
        highlightHeadings: "wcagtr-a11y-highlight-headings",
        underlineLinks: "wcagtr-a11y-underline-links",
        reduceMotion: "wcagtr-a11y-reduce-motion",
        keyboardControl: "wcagtr-a11y-keyboard-control",
        hideImages: "wcagtr-a11y-hide-images",
        darkCursor: "wcagtr-a11y-dark-cursor",
        lightCursor: "wcagtr-a11y-light-cursor",
        focusHighlight: "wcagtr-a11y-focus-highlight",
      };
      this._contrastKeys = ["darkContrast", "lightContrast", "highContrast", "monochrome"];
      this._saturationKeys = ["lowSaturation", "highSaturation"];
      this._cursorKeys = ["darkCursor", "lightCursor"];
      this._modePresets = {
        modeEpilepsy: {
          reduceMotion: true,
          highContrast: true,
          lowSaturation: true,
        },
        modeVisuallyImpaired: {
          readableFont: true,
          underlineLinks: true,
          focusHighlight: true,
          darkCursor: true,
          textScale: 22,
          lineHeight: 1.8,
        },
        modeCognitive: {
          readableFont: true,
          highlightHeadings: true,
          reduceMotion: true,
          readingGuide: true,
          lineHeight: 1.9,
          letterSpacing: 1,
        },
        modeAdhd: {
          readingMask: true,
          readingGuide: true,
          focusHighlight: true,
          reduceMotion: true,
        },
      };
      this._isReadingSite = false;
      this._speechUtterance = null;
      this._handleOutsideClick = this._onDocumentClick.bind(this);
      this._handleReadingPointer = this._onReadingPointerMove.bind(this);
    }

    mount() {
      this._injectStyles();
      this._loadSettings();
      this._applySettings();
      this._buildUI();
    }

    _buildUI() {
      if (document.getElementById("wcagtr-user-launcher")) return;

      const launcher = document.createElement("button");
      launcher.id = "wcagtr-user-launcher";
      launcher.type = "button";
      launcher.className = "wcagtr-user-launcher";
      launcher.setAttribute("aria-label", T.widgetButtonLabel);
      launcher.setAttribute("aria-haspopup", "dialog");
      launcher.setAttribute("aria-expanded", "false");
      launcher.innerHTML = `
        <span class="wcagtr-user-icon" aria-hidden="true">
          <svg class="wcagtr-user-lucide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="16" cy="4" r="1" />
            <path d="m18 19 1-7-6 1" />
            <path d="m5 8 3-3 5.5 3-2.36 3.5" />
            <path d="M4.24 14.5a5 5 0 0 0 6.88 6" />
            <path d="M13.76 17.5a5 5 0 0 0-6.88-6" />
          </svg>
        </span>
      `;

      const panel = document.createElement("aside");
      panel.id = "wcagtr-user-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-labelledby", "wcagtr-user-title");
      panel.hidden = true;
      panel.innerHTML = `
        <div class="wcagtr-user-header">
          <h2 id="wcagtr-user-title" class="wcagtr-user-title">${T.widgetPanelTitle}</h2>
          <button type="button" id="wcagtr-user-close" class="wcagtr-user-close" aria-label="${T.closeBtn}">
            <svg class="wcagtr-user-close-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <p id="wcagtr-user-live" class="wcagtr-user-sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
        <div class="wcagtr-user-scroll">
          <section class="wcagtr-user-section" aria-labelledby="wcagtr-user-profiles">
            <h3 id="wcagtr-user-profiles" class="wcagtr-user-section-title">${T.sectionProfiles}</h3>
            <div class="wcagtr-user-grid wcagtr-user-grid-modes">
              ${this._renderModeButton("modeEpilepsy", T.modeEpilepsy, "shield")}
              ${this._renderModeButton("modeVisuallyImpaired", T.modeVisuallyImpaired, "eye")}
              ${this._renderModeButton("modeCognitive", T.modeCognitive, "brain")}
              ${this._renderModeButton("modeAdhd", T.modeAdhd, "zap")}
            </div>
          </section>

          <section class="wcagtr-user-section" aria-labelledby="wcagtr-user-typography">
            <h3 id="wcagtr-user-typography" class="wcagtr-user-section-title">${T.sectionTypography}</h3>
            <div class="wcagtr-user-stack">
              ${this._renderAdjustControl("textScale", T.controlTextScale, "%")}
              ${this._renderAdjustControl("lineHeight", T.controlLineHeight, "")}
              ${this._renderAdjustControl("letterSpacing", T.controlLetterSpacing, "px")}
            </div>
          </section>

          <section class="wcagtr-user-section" aria-labelledby="wcagtr-user-alignment">
            <h3 id="wcagtr-user-alignment" class="wcagtr-user-section-title">${T.sectionAlignment}</h3>
            <div class="wcagtr-user-grid wcagtr-user-grid-align">
              ${this._renderAlignButton("left", T.alignLeft, "align-left")}
              ${this._renderAlignButton("center", T.alignCenter, "align-center")}
              ${this._renderAlignButton("justify", T.alignJustify, "align-justify")}
              ${this._renderAlignButton("right", T.alignRight, "align-right")}
            </div>
          </section>

          <section class="wcagtr-user-section" aria-labelledby="wcagtr-user-visual">
            <h3 id="wcagtr-user-visual" class="wcagtr-user-section-title">${T.sectionVisual}</h3>
            <div class="wcagtr-user-grid">
              ${this._renderSettingButton("readableFont", T.optionReadableFont, "type")}
              ${this._renderSettingButton("dyslexiaFont", T.optionDyslexiaFont, "text-cursor-input")}
              ${this._renderSettingButton("highlightHeadings", T.optionHighlightHeadings, "heading")}
              ${this._renderSettingButton("underlineLinks", T.optionUnderlineLinks, "link-2")}
              ${this._renderSettingButton("darkContrast", T.optionDarkContrast, "moon")}
              ${this._renderSettingButton("lightContrast", T.optionLightContrast, "sun")}
              ${this._renderSettingButton("highContrast", T.optionHighContrast, "circle-divide")}
              ${this._renderSettingButton("monochrome", T.optionMonochrome, "circle-off")}
              ${this._renderSettingButton("lowSaturation", T.optionLowSaturation, "droplet")}
              ${this._renderSettingButton("highSaturation", T.optionHighSaturation, "droplet")}
            </div>
          </section>

          <section class="wcagtr-user-section" aria-labelledby="wcagtr-user-background">
            <h3 id="wcagtr-user-background" class="wcagtr-user-section-title">${T.sectionBackground}</h3>
            <div class="wcagtr-user-color-row">
              ${this._renderBackgroundButton("", T.bgColorDefault, "transparent")}
              ${this._renderBackgroundButton("#f5ecd8", T.bgColorWarm, "#f5ecd8")}
              ${this._renderBackgroundButton("#d9eefb", T.bgColorCool, "#d9eefb")}
              ${this._renderBackgroundButton("#efe8c8", T.bgColorCream, "#efe8c8")}
              ${this._renderBackgroundButton("#1f2937", T.bgColorDark, "#1f2937")}
            </div>
          </section>

          <section class="wcagtr-user-section" aria-labelledby="wcagtr-user-navigation">
            <h3 id="wcagtr-user-navigation" class="wcagtr-user-section-title">${T.sectionNavigation}</h3>
            <div class="wcagtr-user-grid">
              ${this._renderActionButton("readSite", T.actionReadSite, "volume-2")}
              ${this._renderActionButton("readSelection", T.actionReadSelection, "file-audio")}
              ${this._renderSettingButton("hideImages", T.optionHideImages, "image-off")}
              ${this._renderSettingButton("darkCursor", T.optionDarkCursor, "mouse-pointer")}
              ${this._renderSettingButton("lightCursor", T.optionLightCursor, "mouse-pointer-2")}
              ${this._renderSettingButton("readingMask", T.optionReadingMask, "scan-line")}
              ${this._renderSettingButton("readingGuide", T.optionReadingGuide, "pilcrow")}
              ${this._renderSettingButton("focusHighlight", T.optionFocusHighlight, "focus")}
              ${this._renderSettingButton("reduceMotion", T.optionReduceMotion, "activity")}
              ${this._renderSettingButton("keyboardControl", T.optionKeyboardControl, "keyboard")}
            </div>
          </section>

          <section class="wcagtr-user-section" aria-labelledby="wcagtr-user-sitemap-title">
            <h3 id="wcagtr-user-sitemap-title" class="wcagtr-user-section-title">${T.sectionSitemap}</h3>
            <button type="button" class="wcagtr-user-action wcagtr-user-action-full" data-action="siteMap" aria-pressed="false">
              <span class="wcagtr-user-toggle-icon">${this._icon("map")}</span>
              <span class="wcagtr-user-toggle-label">${T.actionSiteMap}</span>
            </button>
            <div id="wcagtr-user-sitemap" class="wcagtr-user-sitemap" hidden></div>
          </section>
        </div>
        <div class="wcagtr-user-actions">
          <button type="button" id="wcagtr-user-reset" class="wcagtr-user-reset">${T.optionReset}</button>
        </div>
      `;

      launcher.addEventListener("click", () => this._togglePanel());
      launcher.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._togglePanel();
        }
      });

      panel.addEventListener("click", (event) => this._onPanelClick(event));
      const closeButton = panel.querySelector("#wcagtr-user-close");
      if (closeButton) {
        const handleClosePress = (event) => {
          event.preventDefault();
          event.stopPropagation();
          this._closePanel();
        };
        closeButton.addEventListener("click", handleClosePress);
        closeButton.addEventListener("pointerup", handleClosePress);
        closeButton.addEventListener("touchend", handleClosePress, {
          passive: false,
        });
      }
      panel
        .querySelector("#wcagtr-user-reset")
        ?.addEventListener("click", () => this._resetSettings());

      panel.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          this._closePanel();
          return;
        }
        if (event.key === "Tab") {
          this._trapFocus(event);
        }
      });

      document.body.appendChild(launcher);
      document.body.appendChild(panel);

      this._launcher = launcher;
      this._panel = panel;
      this._liveRegion = panel.querySelector("#wcagtr-user-live");
      this._updateButtons();
    }

    _defaultSettings() {
      return {
        modeEpilepsy: false,
        modeVisuallyImpaired: false,
        modeCognitive: false,
        modeAdhd: false,
        readableFont: false,
        dyslexiaFont: false,
        highlightHeadings: false,
        underlineLinks: false,
        darkContrast: false,
        lightContrast: false,
        highContrast: false,
        monochrome: false,
        lowSaturation: false,
        highSaturation: false,
        hideImages: false,
        darkCursor: false,
        lightCursor: false,
        readingMask: false,
        readingGuide: false,
        focusHighlight: false,
        reduceMotion: false,
        keyboardControl: false,
        textScale: 0,
        lineHeight: 1.4,
        letterSpacing: 0,
        alignment: "",
        backgroundColor: "",
      };
    }

    _renderModeButton(key, label, iconName) {
      return `
        <button
          type="button"
          class="wcagtr-user-toggle wcagtr-user-mode"
          data-mode="${key}"
          aria-pressed="${this._settings[key] ? "true" : "false"}"
        >
          <span class="wcagtr-user-toggle-icon">${this._icon(iconName)}</span>
          <span class="wcagtr-user-toggle-label">${label}</span>
        </button>
      `;
    }

    _renderSettingButton(key, label, iconName) {
      return `
        <button
          type="button"
          class="wcagtr-user-toggle"
          data-setting="${key}"
          aria-pressed="${this._settings[key] ? "true" : "false"}"
        >
          <span class="wcagtr-user-toggle-icon">${this._icon(iconName)}</span>
          <span class="wcagtr-user-toggle-label">${label}</span>
        </button>
      `;
    }

    _renderActionButton(action, label, iconName) {
      return `
        <button
          type="button"
          class="wcagtr-user-action"
          data-action="${action}"
          aria-pressed="false"
        >
          <span class="wcagtr-user-toggle-icon">${this._icon(iconName)}</span>
          <span class="wcagtr-user-toggle-label">${label}</span>
        </button>
      `;
    }

    _renderAdjustControl(key, label, unit) {
      return `
        <div class="wcagtr-user-adjust">
          <span class="wcagtr-user-adjust-label">${label}</span>
          <div class="wcagtr-user-adjust-controls">
            <button type="button" class="wcagtr-user-adjust-btn" data-adjust="${key}" data-delta="-1" aria-label="${label} -">−</button>
            <span class="wcagtr-user-adjust-value" data-value="${key}">0${unit}</span>
            <button type="button" class="wcagtr-user-adjust-btn" data-adjust="${key}" data-delta="1" aria-label="${label} +">+</button>
          </div>
        </div>
      `;
    }

    _renderAlignButton(alignment, label, iconName) {
      return `
        <button
          type="button"
          class="wcagtr-user-toggle wcagtr-user-align"
          data-align="${alignment}"
          aria-pressed="${this._settings.alignment === alignment ? "true" : "false"}"
        >
          <span class="wcagtr-user-toggle-icon">${this._icon(iconName)}</span>
          <span class="wcagtr-user-toggle-label">${label}</span>
        </button>
      `;
    }

    _renderBackgroundButton(color, label, swatchColor) {
      return `
        <button
          type="button"
          class="wcagtr-user-color-btn"
          data-bg-color="${color}"
          aria-pressed="${this._settings.backgroundColor === color ? "true" : "false"}"
          aria-label="${label}"
        >
          <span class="wcagtr-user-color-swatch" style="background:${swatchColor};"></span>
          <span class="wcagtr-user-color-label">${label}</span>
        </button>
      `;
    }

    _icon(name) {
      const map = {
        shield: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />`,
        eye: `<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />`,
        brain: `<path d="M12 18V5" /><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" /><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" /><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" /><path d="M18 18a4 4 0 0 0 2-7.464" /><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" /><path d="M6 18a4 4 0 0 1-2-7.464" /><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />`,
        zap: `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />`,
        type: `<path d="M12 4v16" /><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" /><path d="M9 20h6" />`,
        "text-cursor-input": `<path d="M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6" /><path d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7" /><path d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1" /><path d="M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1" /><path d="M9 6v12" />`,
        heading: `<path d="M6 12h12" /><path d="M6 20V4" /><path d="M18 20V4" />`,
        "link-2": `<path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" x2="16" y1="12" y2="12" />`,
        moon: `<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />`,
        sun: `<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />`,
        "circle-divide": `<circle cx="12" cy="12" r="10" /><path d="M12 2v20" /><path d="M12 12h10" />`,
        "circle-off": `<path d="m2 2 20 20" /><path d="M8.35 2.69A10 10 0 0 1 21.3 15.65" /><path d="M19.08 19.08A10 10 0 1 1 4.92 4.92" />`,
        droplet: `<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />`,
        "volume-2": `<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" />`,
        "file-audio": `<path d="M4 6.835V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-.343" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M2 19a2 2 0 0 1 4 0v1a2 2 0 0 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 0 1-4 0v-1a2 2 0 0 1 4 0" />`,
        "image-off": `<line x1="2" x2="22" y1="2" y2="22" /><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" /><line x1="13.5" x2="6" y1="13.5" y2="21" /><line x1="18" x2="21" y1="12" y2="15" /><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59" /><path d="M21 15V5a2 2 0 0 0-2-2H9" />`,
        "mouse-pointer": `<path d="M12.586 12.586 19 19" /><path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z" />`,
        "mouse-pointer-2": `<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />`,
        "scan-line": `<path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" />`,
        pilcrow: `<path d="M13 4v16" /><path d="M17 4v16" /><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />`,
        focus: `<circle cx="12" cy="12" r="3" /><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />`,
        activity: `<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />`,
        keyboard: `<path d="M10 8h.01" /><path d="M12 12h.01" /><path d="M14 8h.01" /><path d="M16 12h.01" /><path d="M18 8h.01" /><path d="M6 8h.01" /><path d="M7 16h10" /><path d="M8 12h.01" /><rect width="20" height="16" x="2" y="4" rx="2" />`,
        map: `<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" />`,
        "align-left": `<path d="M21 5H3" /><path d="M15 12H3" /><path d="M17 19H3" />`,
        "align-center": `<path d="M21 5H3" /><path d="M17 12H7" /><path d="M19 19H5" />`,
        "align-justify": `<path d="M3 5h18" /><path d="M3 12h18" /><path d="M3 19h18" />`,
        "align-right": `<path d="M21 5H3" /><path d="M21 12H9" /><path d="M21 19H7" />`,
      };

      return `<svg aria-hidden="true" class="wcagtr-user-lucide" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${map[name] || ""}</svg>`;
    }

    _onPanelClick(event) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (target.closest("#wcagtr-user-close")) {
        this._closePanel();
        return;
      }

      if (target.closest("#wcagtr-user-reset")) {
        this._resetSettings();
        return;
      }

      const modeBtn = target.closest("[data-mode]");
      if (modeBtn) {
        const modeKey = modeBtn.getAttribute("data-mode");
        if (modeKey && Object.prototype.hasOwnProperty.call(this._modePresets, modeKey)) {
          this._toggleMode(modeKey);
        }
        return;
      }

      const settingBtn = target.closest("[data-setting]");
      if (settingBtn) {
        const key = settingBtn.getAttribute("data-setting");
        if (key && Object.prototype.hasOwnProperty.call(this._settings, key)) {
          this._setSetting(key, !this._settings[key]);
        }
        return;
      }

      const adjustBtn = target.closest("[data-adjust]");
      if (adjustBtn) {
        const key = adjustBtn.getAttribute("data-adjust");
        const delta = Number(adjustBtn.getAttribute("data-delta"));
        if (key && Number.isFinite(delta)) {
          this._adjustSetting(key, delta);
        }
        return;
      }

      const alignBtn = target.closest("[data-align]");
      if (alignBtn) {
        const alignment = alignBtn.getAttribute("data-align");
        this._settings.alignment = this._settings.alignment === alignment ? "" : alignment;
        this._applySettings();
        this._saveSettings();
        this._updateButtons();
        return;
      }

      const bgBtn = target.closest("[data-bg-color]");
      if (bgBtn) {
        const color = bgBtn.getAttribute("data-bg-color") || "";
        this._settings.backgroundColor = this._settings.backgroundColor === color ? "" : color;
        this._applySettings();
        this._saveSettings();
        this._updateButtons();
        return;
      }

      const actionBtn = target.closest("[data-action]");
      if (actionBtn) {
        const action = actionBtn.getAttribute("data-action");
        if (action === "readSite") {
          this._toggleSiteReadAloud();
          return;
        }
        if (action === "readSelection") {
          this._readSelection();
          return;
        }
        if (action === "siteMap") {
          this._toggleSitemap();
        }
      }
    }

    _toggleMode(modeKey) {
      const isActive = Boolean(this._settings[modeKey]);
      const base = this._defaultSettings();
      this._settings = { ...base };

      if (!isActive) {
        this._settings[modeKey] = true;
        this._applyModePreset(modeKey);
      }

      this._applySettings();
      this._saveSettings();
      this._updateButtons();
    }

    _applyModePreset(modeKey) {
      const preset = this._modePresets[modeKey];
      if (!preset) return;

      this._settings = { ...this._settings, ...preset };
      if (preset.highContrast) {
        this._settings.darkContrast = false;
        this._settings.lightContrast = false;
        this._settings.monochrome = false;
      }
      if (preset.lowSaturation) {
        this._settings.highSaturation = false;
      }
      if (preset.darkCursor) {
        this._settings.lightCursor = false;
      }
    }

    _togglePanel() {
      if (!this._panel || !this._launcher) return;
      if (this._panel.hidden) {
        this._openPanel();
      } else {
        this._closePanel();
      }
    }

    _openPanel() {
      if (!this._panel || !this._launcher) return;
      this._lastFocused = document.activeElement;
      this._panel.hidden = false;
      this._panel.removeAttribute("hidden");
      this._panel.style.display = "";
      this._launcher.setAttribute("aria-expanded", "true");
      document.addEventListener("mousedown", this._handleOutsideClick);
      const first = this._panel.querySelector(".wcagtr-user-toggle");
      first?.focus();
      this._announce(T.optionOpened);
    }

    _closePanel() {
      if (!this._panel || !this._launcher) return;
      if (this._panel.hidden) return;
      this._panel.hidden = true;
      this._panel.setAttribute("hidden", "");
      this._panel.style.display = "none";
      this._launcher.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", this._handleOutsideClick);
      this._announce(T.optionClosed);
      if (this._lastFocused && typeof this._lastFocused.focus === "function") {
        this._lastFocused.focus();
      } else {
        this._launcher.focus();
      }
    }

    _onDocumentClick(event) {
      if (!this._panel || this._panel.hidden) return;
      const target = event.target;
      if (this._panel.contains(target) || this._launcher?.contains(target)) return;
      this._closePanel();
    }

    _trapFocus(event) {
      if (!this._panel || this._panel.hidden) return;
      const focusable = Array.from(
        this._panel.querySelectorAll(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.disabled);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    _setSetting(key, value) {
      const nextValue = Boolean(value);
      if (this._contrastKeys.includes(key) && nextValue) {
        this._contrastKeys.forEach((contrastKey) => {
          this._settings[contrastKey] = false;
        });
      }
      if (this._saturationKeys.includes(key) && nextValue) {
        this._saturationKeys.forEach((saturationKey) => {
          this._settings[saturationKey] = false;
        });
      }
      if (this._cursorKeys.includes(key) && nextValue) {
        this._cursorKeys.forEach((cursorKey) => {
          this._settings[cursorKey] = false;
        });
      }

      this._settings[key] = nextValue;
      this._applySettings();
      this._saveSettings();
      this._updateButtons();
    }

    _adjustSetting(key, delta) {
      if (key === "textScale") {
        this._settings.textScale = Math.min(80, Math.max(0, this._settings.textScale + delta * 5));
      } else if (key === "lineHeight") {
        const next = this._settings.lineHeight + delta * 0.1;
        this._settings.lineHeight = Number(Math.min(2.6, Math.max(1.2, next)).toFixed(1));
      } else if (key === "letterSpacing") {
        this._settings.letterSpacing = Math.min(12, Math.max(0, this._settings.letterSpacing + delta));
      }

      this._applySettings();
      this._saveSettings();
      this._updateButtons();
    }

    _resetSettings() {
      this._settings = this._defaultSettings();
      this._stopSpeech();
      this._toggleSitemap(false);
      this._applySettings();
      this._saveSettings();
      this._updateButtons();
      this._announce(T.optionReset);
    }

    _loadSettings() {
      try {
        const raw = localStorage.getItem(this._storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        Object.keys(this._settings).forEach((key) => {
          if (typeof this._settings[key] === "boolean" && typeof parsed?.[key] === "boolean") {
            this._settings[key] = parsed[key];
          } else if (
            typeof this._settings[key] === "number" &&
            typeof parsed?.[key] === "number" &&
            Number.isFinite(parsed[key])
          ) {
            this._settings[key] = parsed[key];
          } else if (typeof this._settings[key] === "string" && typeof parsed?.[key] === "string") {
            this._settings[key] = parsed[key];
          }
        });
        if (parsed?.largeText === true && this._settings.textScale === 0) {
          this._settings.textScale = 12;
        }
        this._settings.textScale = Math.min(80, Math.max(0, this._settings.textScale));
        this._settings.lineHeight = Number(Math.min(2.6, Math.max(1.2, this._settings.lineHeight)).toFixed(1));
        this._settings.letterSpacing = Math.min(12, Math.max(0, this._settings.letterSpacing));
      } catch (error) {
        console.warn("[WCAGTR] Kullanıcı erişilebilirlik ayarları okunamadı:", error);
      }
    }

    _saveSettings() {
      try {
        localStorage.setItem(this._storageKey, JSON.stringify(this._settings));
      } catch (error) {
        console.warn("[WCAGTR] Kullanıcı erişilebilirlik ayarları kaydedilemedi:", error);
      }
    }

    _applySettings() {
      const root = document.documentElement;
      Object.entries(this._classMap).forEach(([key, className]) => {
        root.classList.toggle(className, this._settings[key]);
      });

      root.style.setProperty("--wcagtr-text-scale", `${this._settings.textScale}%`);
      root.style.setProperty("--wcagtr-line-height", String(this._settings.lineHeight));
      root.style.setProperty("--wcagtr-letter-spacing", `${this._settings.letterSpacing}px`);
      root.classList.toggle("wcagtr-a11y-text-scale", this._settings.textScale > 0);
      root.classList.toggle("wcagtr-a11y-line-height", this._settings.lineHeight > 1.4);
      root.classList.toggle("wcagtr-a11y-letter-spacing", this._settings.letterSpacing > 0);

      const alignments = ["left", "center", "justify", "right"];
      alignments.forEach((alignment) => {
        root.classList.toggle(
          `wcagtr-a11y-align-${alignment}`,
          this._settings.alignment === alignment,
        );
      });

      root.classList.toggle("wcagtr-a11y-custom-bg", Boolean(this._settings.backgroundColor));
      if (this._settings.backgroundColor) {
        root.style.setProperty("--wcagtr-bg-color", this._settings.backgroundColor);
      } else {
        root.style.removeProperty("--wcagtr-bg-color");
      }

      const filters = [];
      if (this._settings.darkContrast) filters.push("brightness(0.82) contrast(1.2)");
      if (this._settings.lightContrast) filters.push("brightness(1.14) contrast(1.08)");
      if (this._settings.highContrast) filters.push("contrast(1.45)");
      if (this._settings.monochrome) filters.push("grayscale(1)");
      if (this._settings.lowSaturation) filters.push("saturate(0.55)");
      if (this._settings.highSaturation) filters.push("saturate(1.6)");
      const filterValue = filters.join(" ");
      root.classList.toggle("wcagtr-a11y-visual-filter", Boolean(filterValue));
      if (filterValue) {
        root.style.setProperty("--wcagtr-visual-filter", filterValue);
      } else {
        root.style.removeProperty("--wcagtr-visual-filter");
      }

      this._syncReadingHelpers();
    }

    _updateButtons() {
      if (!this._panel) return;
      this._panel.querySelectorAll("[data-setting]").forEach((button) => {
        const key = button.getAttribute("data-setting");
        const active = Boolean(key && this._settings[key]);
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.classList.toggle("wcagtr-user-toggle-active", active);
      });

      this._panel.querySelectorAll("[data-mode]").forEach((button) => {
        const key = button.getAttribute("data-mode");
        const active = Boolean(key && this._settings[key]);
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.classList.toggle("wcagtr-user-toggle-active", active);
      });

      this._panel.querySelectorAll("[data-align]").forEach((button) => {
        const key = button.getAttribute("data-align");
        const active = this._settings.alignment === key;
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.classList.toggle("wcagtr-user-toggle-active", active);
      });

      this._panel.querySelectorAll("[data-bg-color]").forEach((button) => {
        const key = button.getAttribute("data-bg-color");
        const active = this._settings.backgroundColor === key;
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.classList.toggle("wcagtr-user-color-btn-active", active);
      });

      this._panel.querySelectorAll("[data-action]").forEach((button) => {
        const action = button.getAttribute("data-action");
        let active = false;
        if (action === "readSite") active = this._isReadingSite;
        if (action === "siteMap") {
          const siteMap = this._panel?.querySelector("#wcagtr-user-sitemap");
          active = Boolean(siteMap && !siteMap.hidden);
        }
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.classList.toggle("wcagtr-user-toggle-active", active);
      });

      const textScaleValue = this._panel.querySelector('[data-value="textScale"]');
      const lineHeightValue = this._panel.querySelector('[data-value="lineHeight"]');
      const letterSpacingValue = this._panel.querySelector('[data-value="letterSpacing"]');
      if (textScaleValue) textScaleValue.textContent = `${this._settings.textScale}%`;
      if (lineHeightValue) lineHeightValue.textContent = this._settings.lineHeight.toFixed(1);
      if (letterSpacingValue) letterSpacingValue.textContent = `${this._settings.letterSpacing}px`;
    }

    _announce(message) {
      if (!this._liveRegion) return;
      this._liveRegion.textContent = "";
      setTimeout(() => {
        this._liveRegion.textContent = message;
      }, 20);
    }

    _toggleSiteReadAloud() {
      if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
        this._announce(T.speechUnsupported);
        return;
      }

      if (this._isReadingSite) {
        this._stopSpeech();
        this._announce(T.siteReadStopped);
        return;
      }

      const text = document.body?.innerText?.replace(/\s+/g, " ").trim();
      if (!text) return;

      this._speak(text, true);
      this._announce(T.siteReadStarted);
    }

    _readSelection() {
      const selected = (window.getSelection()?.toString() || "").trim();
      if (!selected) {
        this._announce(T.noSelection);
        return;
      }
      this._speak(selected, false);
    }

    _speak(text, siteRead) {
      this._stopSpeech();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 9000));
      utterance.lang = CONFIG.lang === "en" ? "en-US" : "tr-TR";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => {
        this._isReadingSite = false;
        this._speechUtterance = null;
        this._updateButtons();
      };
      utterance.onerror = () => {
        this._isReadingSite = false;
        this._speechUtterance = null;
        this._updateButtons();
      };
      this._speechUtterance = utterance;
      this._isReadingSite = siteRead;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      this._updateButtons();
    }

    _stopSpeech() {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this._isReadingSite = false;
      this._speechUtterance = null;
      this._updateButtons();
    }

    _toggleSitemap(forceOpen) {
      if (!this._panel) return;
      const container = this._panel.querySelector("#wcagtr-user-sitemap");
      if (!container) return;

      const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : container.hidden;
      if (shouldOpen) {
        this._renderSitemap(container);
      }
      container.hidden = !shouldOpen;
      this._updateButtons();
    }

    _renderSitemap(container) {
      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((link) => {
          const href = link.href || "";
          const text = (link.textContent || "").trim();
          return { href, text };
        })
        .filter((item) => {
          if (!item.href || !item.text) return false;
          try {
            const parsed = new URL(item.href, location.href);
            return parsed.protocol !== "javascript:";
          } catch {
            return false;
          }
        });

      const unique = [];
      const seen = new Set();
      links.forEach((item) => {
        const key = `${item.text}::${item.href}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      });

      if (!unique.length) {
        container.innerHTML = `<p class="wcagtr-user-sitemap-empty">${T.sitemapEmpty}</p>`;
        return;
      }

      container.innerHTML = "";
      const title = document.createElement("p");
      title.className = "wcagtr-user-sitemap-title";
      title.textContent = T.sitemapTitle;
      container.appendChild(title);

      const list = document.createElement("ul");
      list.className = "wcagtr-user-sitemap-list";
      unique.slice(0, 80).forEach((item) => {
        const li = document.createElement("li");
        const anchor = document.createElement("a");
        anchor.href = item.href;
        anchor.textContent = item.text;
        li.appendChild(anchor);
        list.appendChild(li);
      });
      container.appendChild(list);
    }

    _syncReadingHelpers() {
      const root = document.documentElement;
      root.classList.toggle("wcagtr-a11y-reading-mask", this._settings.readingMask);
      root.classList.toggle("wcagtr-a11y-reading-guide", this._settings.readingGuide);

      const existingMask = document.getElementById("wcagtr-reading-mask");
      const existingGuide = document.getElementById("wcagtr-reading-guide");
      if (!existingMask) {
        const mask = document.createElement("div");
        mask.id = "wcagtr-reading-mask";
        mask.setAttribute("aria-hidden", "true");
        document.body.appendChild(mask);
      }
      if (!existingGuide) {
        const guide = document.createElement("div");
        guide.id = "wcagtr-reading-guide";
        guide.setAttribute("aria-hidden", "true");
        document.body.appendChild(guide);
      }

      const mask = document.getElementById("wcagtr-reading-mask");
      const guide = document.getElementById("wcagtr-reading-guide");
      if (mask) {
        mask.hidden = !this._settings.readingMask;
      }
      if (guide) {
        guide.hidden = !this._settings.readingGuide;
      }

      if (this._settings.readingMask || this._settings.readingGuide) {
        window.addEventListener("mousemove", this._handleReadingPointer, { passive: true });
      } else {
        window.removeEventListener("mousemove", this._handleReadingPointer);
      }
    }

    _onReadingPointerMove(event) {
      const y = `${Math.round(event.clientY)}px`;
      const root = document.documentElement;
      root.style.setProperty("--wcagtr-reading-y", y);
    }

    _injectStyles() {
      if (document.getElementById("wcagtr-user-widget-styles")) return;
      const style = document.createElement("style");
      style.id = "wcagtr-user-widget-styles";
      style.textContent = `
        :root {
          --wcagtr-orange: #ff6b35;
          --wcagtr-peach: #f7c59f;
          --wcagtr-cream: #efefd0;
          --wcagtr-navy: #004e89;
          --wcagtr-blue: #1a659e;
        }
        .wcagtr-user-launcher {
          position: fixed;
          left: 16px;
          bottom: 16px;
          z-index: 2147483646;
          width: 58px;
          height: 58px;
          border: 1px solid rgba(255, 255, 255, 0.26);
          border-radius: 999px;
          background: linear-gradient(145deg, #ff6b35, #c94a14);
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.34);
          min-width: 44px;
          min-height: 44px;
        }
        .wcagtr-user-launcher::before {
          content: "";
          position: absolute;
          inset: 2px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          pointer-events: none;
        }
        .wcagtr-user-launcher:focus-visible {
          outline: 3px solid #efefd0;
          outline-offset: 2px;
        }
        .wcagtr-user-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .wcagtr-user-icon .wcagtr-user-lucide {
          width: 24px;
          height: 24px;
        }
        #wcagtr-user-panel {
          position: fixed;
          left: 16px;
          bottom: 88px;
          z-index: 2147483646;
          width: min(420px, calc(100vw - 32px));
          max-height: min(88vh, 880px);
          background: linear-gradient(150deg, rgba(0, 18, 48, 0.92), rgba(0, 55, 105, 0.86));
          color: #fbfbff;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 18px;
          backdrop-filter: blur(32px) saturate(200%) brightness(1.08);
          box-shadow:
            0 36px 70px rgba(0, 0, 0, 0.42),
            0 12px 24px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          padding: 12px;
          font-family: "Segoe UI", Inter, Arial, sans-serif;
          display: flex;
          flex-direction: column;
        }
        #wcagtr-user-panel[hidden] {
          display: none !important;
        }
        #wcagtr-user-panel,
        #wcagtr-user-panel * {
          box-sizing: border-box;
        }
        #wcagtr-user-panel button {
          font: inherit;
          letter-spacing: normal;
          text-transform: none;
          min-width: 0;
          -webkit-appearance: none;
          appearance: none;
        }
        .wcagtr-user-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          position: relative;
          z-index: 2;
        }
        .wcagtr-user-title {
          margin: 0;
          font-size: 1.03rem;
          line-height: 1.4;
          font-weight: 700;
        }
        .wcagtr-user-close {
          width: 44px;
          height: 44px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #fbfbff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          position: relative;
        }
        .wcagtr-user-close::after {
          content: "";
          position: absolute;
          inset: -6px;
          pointer-events: none;
        }
        .wcagtr-user-close-icon {
          width: 16px;
          height: 16px;
        }
        .wcagtr-user-close:focus-visible {
          outline: 3px solid #efefd0;
          outline-offset: 2px;
        }
        .wcagtr-user-scroll {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding-right: 4px;
          margin-right: -2px;
        }
        .wcagtr-user-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .wcagtr-user-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 999px;
        }
        .wcagtr-user-section {
          margin-bottom: 12px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 14px;
          backdrop-filter: blur(8px);
        }
        .wcagtr-user-section-title {
          margin: 0;
          font-size: 0.87rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: var(--wcagtr-peach);
          margin-bottom: 8px;
        }
        .wcagtr-user-stack {
          display: grid;
          gap: 8px;
        }
        .wcagtr-user-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .wcagtr-user-grid-modes {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .wcagtr-user-grid-align {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .wcagtr-user-toggle {
          width: 100%;
          min-height: 74px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.07);
          color: #fbfbff;
          text-align: center;
          padding: 10px 8px;
          font-size: 0.82rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .wcagtr-user-mode {
          min-height: 104px;
          padding: 10px 8px 12px;
        }
        .wcagtr-user-mode .wcagtr-user-toggle-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
        }
        .wcagtr-user-mode .wcagtr-user-toggle-icon .wcagtr-user-lucide {
          width: 18px;
          height: 18px;
        }
        .wcagtr-user-mode .wcagtr-user-toggle-label {
          min-height: 2.5em;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          line-height: 1.25;
        }
        .wcagtr-user-action {
          width: 100%;
          min-height: 74px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.07);
          color: #fbfbff;
          text-align: center;
          padding: 10px 8px;
          font-size: 0.82rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .wcagtr-user-action-full {
          min-height: 60px;
          font-size: 0.9rem;
        }
        .wcagtr-user-toggle-icon {
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 11px;
          color: #f7c59f;
          flex-shrink: 0;
        }
        .wcagtr-user-toggle-icon .wcagtr-user-lucide {
          width: 19px;
          height: 19px;
        }
        .wcagtr-user-toggle-label {
          flex: 1;
          line-height: 1.35;
        }
        .wcagtr-user-toggle-active {
          border-color: rgba(255, 107, 53, 0.62) !important;
          background: linear-gradient(160deg, rgba(255, 107, 53, 0.24), rgba(255, 107, 53, 0.1)) !important;
          box-shadow: 0 0 0 1px rgba(255, 107, 53, 0.32), 0 8px 18px rgba(255, 107, 53, 0.14);
          color: #fbfbff;
        }
        .wcagtr-user-toggle-active .wcagtr-user-toggle-icon,
        .wcagtr-user-action.wcagtr-user-toggle-active .wcagtr-user-toggle-icon {
          background: rgba(255, 107, 53, 0.3);
          color: #efefd0;
        }
        .wcagtr-user-toggle:hover,
        .wcagtr-user-action:hover {
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        .wcagtr-user-toggle:focus-visible,
        .wcagtr-user-action:focus-visible,
        .wcagtr-user-reset:focus-visible,
        .wcagtr-user-adjust-btn:focus-visible,
        .wcagtr-user-color-btn:focus-visible {
          outline: 3px solid #efefd0;
          outline-offset: 2px;
        }
        .wcagtr-user-adjust {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.06);
        }
        .wcagtr-user-adjust-label {
          font-size: 0.84rem;
          color: #fbfbff;
          white-space: nowrap;
        }
        .wcagtr-user-adjust-controls {
          display: grid;
          grid-template-columns: 44px minmax(62px, auto) 44px;
          align-items: center;
          gap: 8px;
          justify-content: end;
          flex-shrink: 0;
        }
        .wcagtr-user-adjust-btn {
          width: 44px;
          min-width: 44px;
          height: 44px;
          min-height: 44px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.1);
          color: #fbfbff;
          font-size: 1.1rem;
          line-height: 1;
          cursor: pointer;
        }
        .wcagtr-user-adjust-value {
          min-width: 62px;
          text-align: center;
          font-size: 0.9rem;
          font-variant-numeric: tabular-nums;
        }
        .wcagtr-user-color-row {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        .wcagtr-user-color-btn {
          min-height: 60px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.07);
          color: #fbfbff;
          padding: 8px 4px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .wcagtr-user-color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.34);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }
        .wcagtr-user-color-label {
          font-size: 0.64rem;
          line-height: 1.2;
        }
        .wcagtr-user-color-btn-active {
          border-color: rgba(255, 107, 53, 0.62);
          box-shadow: 0 0 0 1px rgba(255, 107, 53, 0.32);
        }
        .wcagtr-user-sitemap {
          margin-top: 8px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          background: rgba(255, 255, 255, 0.07);
          padding: 10px;
          max-height: 180px;
          overflow: auto;
        }
        .wcagtr-user-sitemap-title {
          margin: 0 0 8px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--wcagtr-peach);
        }
        .wcagtr-user-sitemap-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }
        .wcagtr-user-sitemap-list a {
          color: #fbfbff;
          text-decoration: underline;
          text-underline-offset: 0.15em;
        }
        .wcagtr-user-sitemap-empty {
          margin: 0;
          font-size: 0.82rem;
          color: #fbfbff;
        }
        .wcagtr-user-actions {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          justify-content: stretch;
        }
        .wcagtr-user-reset {
          width: 100%;
          min-height: 46px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.09);
          color: #fbfbff;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .wcagtr-user-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
          white-space: nowrap;
        }
        html.wcagtr-a11y-text-scale { font-size: calc(100% + var(--wcagtr-text-scale, 0%)) !important; }
        html.wcagtr-a11y-line-height,
        html.wcagtr-a11y-line-height body,
        html.wcagtr-a11y-line-height p,
        html.wcagtr-a11y-line-height li {
          line-height: var(--wcagtr-line-height, 1.4) !important;
        }
        html.wcagtr-a11y-letter-spacing,
        html.wcagtr-a11y-letter-spacing body,
        html.wcagtr-a11y-letter-spacing p,
        html.wcagtr-a11y-letter-spacing li,
        html.wcagtr-a11y-letter-spacing button,
        html.wcagtr-a11y-letter-spacing input,
        html.wcagtr-a11y-letter-spacing textarea {
          letter-spacing: var(--wcagtr-letter-spacing, 0px) !important;
        }
        html.wcagtr-a11y-align-left body > :not(#wcagtr-user-panel):not(#wcagtr-user-launcher):not(#wcagtr-reading-mask):not(#wcagtr-reading-guide) { text-align: left !important; }
        html.wcagtr-a11y-align-center body > :not(#wcagtr-user-panel):not(#wcagtr-user-launcher):not(#wcagtr-reading-mask):not(#wcagtr-reading-guide) { text-align: center !important; }
        html.wcagtr-a11y-align-justify body > :not(#wcagtr-user-panel):not(#wcagtr-user-launcher):not(#wcagtr-reading-mask):not(#wcagtr-reading-guide) { text-align: justify !important; }
        html.wcagtr-a11y-align-right body > :not(#wcagtr-user-panel):not(#wcagtr-user-launcher):not(#wcagtr-reading-mask):not(#wcagtr-reading-guide) { text-align: right !important; }
        html.wcagtr-a11y-visual-filter body > :not(#wcagtr-user-panel):not(#wcagtr-user-launcher):not(#wcagtr-reading-mask):not(#wcagtr-reading-guide) {
          filter: var(--wcagtr-visual-filter, none) !important;
        }
        html.wcagtr-a11y-custom-bg body > :not(#wcagtr-user-panel):not(#wcagtr-user-launcher):not(#wcagtr-reading-mask):not(#wcagtr-reading-guide) {
          background-color: var(--wcagtr-bg-color) !important;
        }
        html.wcagtr-a11y-underline-links a {
          text-decoration: underline !important;
          text-underline-offset: 0.18em;
          text-decoration-thickness: 2px;
          color: inherit !important;
          font-weight: 700;
        }
        html.wcagtr-a11y-reduce-motion *,
        html.wcagtr-a11y-reduce-motion *::before,
        html.wcagtr-a11y-reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
        html.wcagtr-a11y-highlight-headings h1,
        html.wcagtr-a11y-highlight-headings h2,
        html.wcagtr-a11y-highlight-headings h3,
        html.wcagtr-a11y-highlight-headings h4,
        html.wcagtr-a11y-highlight-headings h5,
        html.wcagtr-a11y-highlight-headings h6 {
          background: linear-gradient(180deg, rgba(255, 230, 150, 0.28), rgba(255, 230, 150, 0.08));
          border-radius: 4px;
          padding-inline: 0.1em;
        }
        html.wcagtr-a11y-readable-font,
        html.wcagtr-a11y-readable-font body,
        html.wcagtr-a11y-readable-font button,
        html.wcagtr-a11y-readable-font input,
        html.wcagtr-a11y-readable-font textarea,
        html.wcagtr-a11y-readable-font select {
          font-family: Arial, Helvetica, "Segoe UI", sans-serif !important;
          letter-spacing: 0.02em;
          line-height: 1.6 !important;
        }
        html.wcagtr-a11y-dyslexia-font,
        html.wcagtr-a11y-dyslexia-font body,
        html.wcagtr-a11y-dyslexia-font button,
        html.wcagtr-a11y-dyslexia-font input,
        html.wcagtr-a11y-dyslexia-font textarea,
        html.wcagtr-a11y-dyslexia-font select {
          font-family: "OpenDyslexic", "Comic Sans MS", "Verdana", sans-serif !important;
          letter-spacing: 0.03em;
          word-spacing: 0.08em;
          line-height: 1.8 !important;
        }
        html.wcagtr-a11y-focus-highlight :focus-visible {
          outline: 4px solid #ffbf47 !important;
          outline-offset: 2px !important;
        }
        html.wcagtr-a11y-keyboard-control :focus-visible {
          box-shadow: 0 0 0 3px #efefd0 !important;
        }
        html.wcagtr-a11y-hide-images img,
        html.wcagtr-a11y-hide-images picture,
        html.wcagtr-a11y-hide-images svg[role="img"] {
          visibility: hidden !important;
        }
        html.wcagtr-a11y-dark-cursor,
        html.wcagtr-a11y-dark-cursor * {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath d='M3 2l8 20 2-8 8-2z' fill='%23000'/%3E%3C/svg%3E") 2 2, auto !important;
        }
        html.wcagtr-a11y-light-cursor,
        html.wcagtr-a11y-light-cursor * {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath d='M3 2l8 20 2-8 8-2z' fill='%23fff' stroke='%23000' stroke-width='1.2'/%3E%3C/svg%3E") 2 2, auto !important;
        }
        #wcagtr-reading-mask {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2147483644;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.55) 0,
            rgba(0, 0, 0, 0.55) calc(var(--wcagtr-reading-y, 50vh) - 62px),
            rgba(0, 0, 0, 0) calc(var(--wcagtr-reading-y, 50vh) - 62px),
            rgba(0, 0, 0, 0) calc(var(--wcagtr-reading-y, 50vh) + 62px),
            rgba(0, 0, 0, 0.55) calc(var(--wcagtr-reading-y, 50vh) + 62px),
            rgba(0, 0, 0, 0.55) 100%
          );
        }
        #wcagtr-reading-guide {
          position: fixed;
          left: 0;
          right: 0;
          height: 2px;
          top: var(--wcagtr-reading-y, 50vh);
          pointer-events: none;
          z-index: 2147483645;
          background: #ff6b35;
          box-shadow: 0 0 10px rgba(255, 107, 53, 0.85);
        }
        @media (max-width: 640px) {
          .wcagtr-user-launcher {
            left: 12px;
            bottom: 12px;
          }
          #wcagtr-user-panel {
            left: 12px;
            bottom: 76px;
            width: calc(100vw - 24px);
            max-height: calc(100vh - 94px);
          }
          .wcagtr-user-grid,
          .wcagtr-user-grid-align,
          .wcagtr-user-color-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .wcagtr-user-grid-align {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
          .wcagtr-user-color-label {
            font-size: 0.7rem;
          }
          .wcagtr-user-mode {
            min-height: 98px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .wcagtr-user-launcher,
          .wcagtr-user-toggle,
          .wcagtr-user-action {
            transition: none !important;
          }
        }
        @media (forced-colors: active) {
          .wcagtr-user-launcher,
          #wcagtr-user-panel,
          .wcagtr-user-toggle,
          .wcagtr-user-action,
          .wcagtr-user-color-btn,
          .wcagtr-user-reset {
            forced-color-adjust: none;
            background: Canvas;
            color: CanvasText;
            border-color: CanvasText;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* ─────────────────────────────────────────────
     9. YARDIMCI FONKSİYONLAR
  ───────────────────────────────────────────── */

  function getSelector(el) {
    if (!el) return "";
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      const idx = Array.from(node.parentNode?.children || []).indexOf(node) + 1;
      parts.unshift(`${part}:nth-child(${idx})`);
      if (node.parentNode?.id) {
        parts.unshift(`#${CSS.escape(node.parentNode.id)}`);
        break;
      }
      node = node.parentNode;
    }
    return parts.join(" > ") || el.tagName.toLowerCase();
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  /* ─────────────────────────────────────────────
     10. ANA BOOTSTRAP
  ───────────────────────────────────────────── */

  async function bootstrap() {
    if (!CONFIG.token) {
      console.warn("[WCAGTR] data-token özniteliği eksik.");
      return;
    }

    // Token doğrulama
    let claims;
    try {
      claims = await TokenValidator.validate(CONFIG.token);
    } catch (err) {
      console.error("[WCAGTR]", err.message);
      return;
    }

    const cache = new CacheManager();
    const scanner = new DOMScanner();
    const fixer = new ClientFixer();
    const reporter = new ViolationReporter(CONFIG.token);
    const accessibilityWidget = new AccessibilityWidget();

    fixer.injectSkipLinkStyles();
    if (claims?.features?.accessibilityWidget !== false) {
      accessibilityWidget.mount();
    }

    async function runScan() {
      const url = location.href;

      // Önce önbellekten bak
      const cached = await cache.getScan(url);
      let violations;
      if (cached) {
        violations = cached.violations;
      } else {
        violations = scanner.scan();
        await cache.saveScan(url, violations);
      }

      if (CONFIG.mode === "scan-only") {
        reporter.report(violations);
        return;
      }

      // Client-side otomatik düzeltmeler
      if (CONFIG.fixMode === "client" || CONFIG.fixMode === "both") {
        violations.forEach((v) => {
          if (v.fix.type !== "info") {
            const applied = fixer.applyFix(v, v.fix);
            if (applied) cache.saveFix(v.element, { rule: v.rule, fix: v.fix });
          }
        });
      }

      // Sunucu tarafı yama isteği
      if (CONFIG.fixMode === "server" || CONFIG.fixMode === "both") {
        const pr = new PatchRequester(CONFIG.token);
        pr.requestPatches(violations).catch(() => {});
      }

      // API'ye raporla
      reporter.report(violations);

      // Site üzerindeki bildirim paneli kapatıldı.
      // İhlaller customer panelde "Taramalar / Erişilebilirlik Bildirimleri" ekranından yönetilir.
    }

    // DOMContentLoaded veya hemen çalıştır
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runScan, { once: true });
    } else {
      await runScan();
    }

    // DOM mutasyonlarını izle — SPA rotasyon geçişleri için
    if (CONFIG.mode === "auto") {
      const debouncedScan = debounce(async () => {
        const violations = scanner.scan();
        await cache.saveScan(location.href, violations);
        reporter.report(violations);
      }, 1000);

      const observer = new MutationObserver((mutations) => {
        const significant = mutations.some(
          (m) => m.addedNodes.length > 0 || m.type === "attributes",
        );
        if (significant) debouncedScan();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["alt", "aria-label", "lang", "role", "tabindex"],
      });
    }
  }

  // Başlat
  bootstrap().catch((err) => console.error("[WCAGTR] Başlatma hatası:", err));
})();
