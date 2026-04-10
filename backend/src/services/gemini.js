/**
 * Gemini AI Service
 * WCAG 2.2 + TR Kamu ihlalleri için CSS/JS düzeltme önerileri üretir.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

// İhlal tipi → onarılabilir mi?
const FIXABLE_BY_CSS = new Set([
  "low-contrast",
  "focus-indicator",
  "text-spacing",
  "reflow",
  "non-text-contrast",
  "resize-text",
  "line-height",
]);

const FIXABLE_BY_ATTR = new Set([
  "missing-alt",
  "missing-label",
  "missing-lang",
  "missing-title",
  "missing-role",
  "missing-aria-label",
]);

/**
 * Gemini'ye gönderilecek prompt'u oluşturur.
 */
function buildPrompt(violations, domSnapshot) {
  const violationList = violations
    .map(
      (v, i) =>
        `${i + 1}. Kriter: ${v.wcagCriterion || "bilinmiyor"} | Tip: ${v.type} | Ciddiyet: ${v.severity} | Seçici: ${v.selector} | Açıklama: ${v.description || ""}`,
    )
    .join("\n");

  const snapshotSection = domSnapshot
    ? `\nDOM Özeti (ilgili bölümler):\n\`\`\`html\n${domSnapshot.slice(0, 3000)}\n\`\`\``
    : "";

  return `Sen bir web erişilebilirlik uzmanısın. Aşağıdaki WCAG 2.2 / TR Kamu erişilebilirlik ihlallerini analiz et ve her biri için somut düzeltme önerisi üret.
${snapshotSection}

İhlaller:
${violationList}

Her ihlal için şu JSON formatında yanıt ver (başka hiçbir şey yazma, sadece geçerli JSON array):
[
  {
    "violationIndex": 0,
    "selector": "css-seçici",
    "fixType": "css" | "attribute" | "html" | "none",
    "cssPatch": "geçerli CSS kuralları (fixType css ise)",
    "attrPatch": { "özellik": "değer" } (fixType attribute ise),
    "htmlSuggestion": "önerilen HTML değişikliği açıklaması (fixType html ise)",
    "confidence": 0.0-1.0,
    "reasoning": "kısa Türkçe açıklama"
  }
]

Kurallar:
- Sadece CSS ile çözülebileceklere cssPatch yaz (low-contrast, focus göstergesi, metin boyutu vb.)
- alt, aria-label, lang gibi HTML attribute eksikliklerinde fixType "attribute" kullan
- Otomatik düzeltilemeyeceklerse fixType "none" yaz, reasoning'de ne yapılması gerektiğini açıkla
- cssPatch'te !important kullan, değerler gerçekçi olsun
- Yanıt kesinlikle geçerli JSON olsun, yorum satırı veya markdown blok içermesin`;
}

/**
 * Gemini yanıtını parse eder, hatalı JSON'a karşı güvenli fallback döner.
 */
function parseGeminiResponse(text, violations) {
  // Markdown kod bloğu varsa temizle
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error("Dizi değil");
    return parsed.map((item, idx) => ({
      violationIndex: item.violationIndex ?? idx,
      selector: item.selector || violations[idx]?.selector || "",
      fixType: item.fixType || "none",
      cssPatch: item.cssPatch || "",
      attrPatch: item.attrPatch || null,
      htmlSuggestion: item.htmlSuggestion || "",
      confidence: typeof item.confidence === "number" ? item.confidence : 0.7,
      reasoning: item.reasoning || "",
    }));
  } catch {
    // Parse hatası — violations sayısı kadar "none" döndür
    return violations.map((v, idx) => ({
      violationIndex: idx,
      selector: v.selector || "",
      fixType: "none",
      cssPatch: "",
      attrPatch: null,
      htmlSuggestion: "",
      confidence: 0,
      reasoning: "AI yanıtı parse edilemedi.",
    }));
  }
}

/**
 * Ana fonksiyon: violations listesini Gemini'ye gönderir, düzeltme önerileri döner.
 * API key yoksa veya çağrı başarısız olursa null döner (caller fallback uygular).
 *
 * @param {Array} violations
 * @param {string|null} domSnapshot
 * @returns {Promise<Array|null>}
 */
export async function getAIFixes(violations, domSnapshot = null) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key") {
    return null; // Fallback'e düş
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = buildPrompt(violations, domSnapshot);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return parseGeminiResponse(text, violations);
}

/**
 * Gemini çağrısı başarısız olduğunda veya API key yoksa kullanılan kural tabanlı fallback.
 */
export function getFallbackFixes(violations) {
  return violations.map((v, idx) => {
    let fixType = "none";
    let cssPatch = "";
    let attrPatch = null;
    let reasoning = "Otomatik düzeltme uygulanamadı. Manuel inceleme gerekli.";
    let confidence = 0.5;

    if (FIXABLE_BY_CSS.has(v.type)) {
      fixType = "css";
      confidence = 0.75;

      if (v.type === "low-contrast") {
        cssPatch =
          "color: #1a1a1a !important; background-color: #ffffff !important;";
        reasoning =
          "Kontrast oranını WCAG AA (4.5:1) gereksinimini karşılamak için renk değerleri düzeltildi.";
      } else if (
        v.type === "focus-indicator" ||
        v.type === "non-text-contrast"
      ) {
        cssPatch =
          "outline: 3px solid #0066cc !important; outline-offset: 2px !important;";
        reasoning = "Klavye odak göstergesi eklendi (WCAG 2.4.7).";
      } else if (v.type === "text-spacing") {
        cssPatch =
          "letter-spacing: 0.12em !important; word-spacing: 0.16em !important; line-height: 1.5 !important;";
        reasoning =
          "Metin aralama WCAG 1.4.12 gereksinimlerine göre düzeltildi.";
      }
    } else if (FIXABLE_BY_ATTR.has(v.type)) {
      fixType = "attribute";
      confidence = 0.6;

      if (v.type === "missing-alt") {
        attrPatch = { alt: "" };
        reasoning =
          "Dekoratif görsel için boş alt attribute eklendi. İçeriksel görsel ise açıklayıcı metin girilmeli.";
      } else if (v.type === "missing-lang") {
        attrPatch = { lang: "tr" };
        reasoning = "HTML lang attribute Türkçe olarak ayarlandı (WCAG 3.1.1).";
      } else if (v.type === "missing-title") {
        attrPatch = { title: "Sayfa Başlığı" };
        reasoning =
          "Sayfa title attribute eklendi. Anlamlı bir başlık girilmeli (WCAG 2.4.2).";
      }
    }

    return {
      violationIndex: idx,
      selector: v.selector || "",
      fixType,
      cssPatch,
      attrPatch,
      htmlSuggestion: "",
      confidence,
      reasoning,
    };
  });
}
