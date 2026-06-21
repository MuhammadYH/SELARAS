/**
 * modules/llmClient.js
 * Abstraction layer untuk LLM call.
 * API key HANYA ada di sini — di server, tidak pernah ke frontend.
 *
 * Bisa diganti ke Claude / OpenAI dengan minimal perubahan.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // dari environment variable, BUKAN hardcode

if (!GEMINI_API_KEY) {
  console.error('[SELARAS AI] ⚠️  GEMINI_API_KEY tidak ditemukan di environment variables!');
}

/**
 * Kirim ke Gemini API dengan system prompt + conversation messages.
 *
 * @param {string} systemPrompt
 * @param {Array<{role: string, content: string}>} messages - format: [{role:'user'|'assistant', content:'...'}]
 * @returns {Promise<string>} teks respons AI
 */
export async function callGemini(systemPrompt, messages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Convert ke format Gemini (role: user/model, parts: [{text}])
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.7,  // deliberate, tidak terlalu random
      topP: 0.9
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.status);
    throw new Error(`Gemini API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Respons AI kosong');

  return text.trim();
}

/* ─── Future: tambahkan callClaude(), callOpenAI() di sini ─── */
