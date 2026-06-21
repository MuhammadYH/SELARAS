/**
 * SELARAS AI Backend — server.js
 * Secure, modular API server untuk SELARAS AI Assistant
 * Stack: Node.js + Express
 *
 * ⚠️  API key TIDAK pernah keluar ke frontend.
 *     Semua LLM call terjadi di sini.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { detectIntent }     from './modules/intentDetector.js';
import { retrieveContext }  from './modules/ragRetriever.js';
import { buildMemory, updateMemory } from './modules/memoryManager.js';
import { buildSystemPrompt } from './modules/promptBuilder.js';
import { callGemini }       from './modules/llmClient.js';
import { shouldClarify, buildClarificationPrompt } from './modules/clarificationEngine.js';

const app  = express();
const PORT = process.env.PORT || 3001;

/* ─── Middleware ─── */
app.use(express.json({ limit: '16kb' }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));

/* ─── Rate limiting: 30 req/menit per IP ─── */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.' }
});
app.use('/api/', limiter);

/* ════════════════════════════════════════════════════════
   POST /api/chat
   Body: { message, sessionMemory }
   Returns: { reply, updatedMemory, intent, clarifying }
   ════════════════════════════════════════════════════════ */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionMemory = {} } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    const userMessage = message.trim().slice(0, 1000); // hard cap

    /* ── 1. Detect Intent ── */
    const intent = detectIntent(userMessage, sessionMemory);

    /* ── 2. Check if clarification needed ── */
    const needsClarification = shouldClarify(userMessage, intent, sessionMemory);
    if (needsClarification) {
      const clarifyReply = buildClarificationPrompt(userMessage, intent, sessionMemory);
      const updatedMemory = updateMemory(sessionMemory, {
        userMessage, intent,
        awaitingClarification: true
      });
      return res.json({
        reply: clarifyReply,
        updatedMemory,
        intent,
        clarifying: true
      });
    }

    /* ── 3. Retrieve relevant context (RAG) ── */
    const retrievedContext = retrieveContext(userMessage, intent);

    /* ── 4. Build / update structured memory ── */
    const memory = buildMemory(sessionMemory, { userMessage, intent });

    /* ── 5. Build system prompt ── */
    const systemPrompt = buildSystemPrompt(intent, memory, retrievedContext);

    /* ── 6. Build conversation messages ── */
    const messages = buildMessages(memory.conversationHistory || [], userMessage);

    /* ── 7. Call LLM (server-side, API key aman) ── */
    const aiReply = await callGemini(systemPrompt, messages);

    /* ── 8. Update memory with AI reply ── */
    const updatedMemory = updateMemory(memory, {
      userMessage, aiReply, intent,
      awaitingClarification: false
    });

    return res.json({
      reply: aiReply,
      updatedMemory,
      intent,
      clarifying: false
    });

  } catch (err) {
    console.error('[SELARAS AI] Error:', err.message);
    return res.status(500).json({
      error: 'Maaf, terjadi kesalahan sistem. Tim kami sudah diberitahu.',
      reply: getFallbackReply()
    });
  }
});

/* Health check */
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'SELARAS AI v3' }));

/* ─── Helper: susun messages array ─── */
function buildMessages(history, userMessage) {
  // Ambil max 8 pasang terakhir saja (16 turn)
  const trimmedHistory = history.slice(-16);
  return [...trimmedHistory, { role: 'user', content: userMessage }];
}

function getFallbackReply() {
  return 'Untuk saat ini, hubungi kami melalui:\n• 📧 admin@resik.id\n• 💬 WA +6281234567890\n\nTim kami siap membantu 7 hari seminggu. 🌿';
}

app.listen(PORT, () => {
  console.log(`[SELARAS AI] Server berjalan di port ${PORT} ✅`);
});
