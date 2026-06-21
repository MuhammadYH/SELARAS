# SELARAS AI v3 — Arsitektur & Panduan Deployment

## Ringkasan Perubahan dari v2 → v3

| Aspek | v2 (Lama) | v3 (Baru) |
|---|---|---|
| API Key | ❌ Exposed di frontend JS | ✅ Hanya di server environment |
| LLM Call | ❌ Langsung dari browser | ✅ Server-side saja |
| Memory | ❌ Raw array conversation | ✅ Structured session memory |
| Intent | ❌ Tidak ada | ✅ 11 intent class + confidence |
| Clarification | ❌ Tidak ada | ✅ Ambiguity detection per intent |
| RAG | ❌ Tidak ada | ✅ Keyword-weighted retrieval |
| System Prompt | ❌ Monolith statis | ✅ Dinamis per intent + memory |
| Rate Limiting | ❌ Tidak ada | ✅ 30 req/menit per IP |
| Error Handling | ❌ Minimal | ✅ Retry + fallback + user feedback |

---

## Struktur File

```
resik-ai-backend/
├── server.js                    # Entry point — Express API
├── package.json
├── .env.example                 # Template environment variables
│
└── modules/
    ├── intentDetector.js        # Klasifikasi intent (11 class)
    ├── clarificationEngine.js   # Deteksi ambiguitas + pertanyaan klarifikasi
    ├── ragRetriever.js          # Knowledge base + retrieval
    ├── memoryManager.js         # Structured session memory
    ├── promptBuilder.js         # Dynamic system prompt builder
    └── llmClient.js             # Gemini API wrapper (server-side)

public/
└── resik-ai-v3.js               # Frontend (ganti resik-ai.js lama)
```

---

## Alur Request Lengkap

```
User mengetik pesan
        │
        ▼
[Frontend: resik-ai-v3.js]
 - Ambil sessionMemory dari sessionStorage
 - POST /api/chat { message, sessionMemory }
        │
        ▼
[Backend: server.js]
        │
        ├─► intentDetector.js
        │     → deteksi intent + emotion + confidence
        │
        ├─► clarificationEngine.js
        │     → apakah pesan ambigu?
        │     → jika ya: kembalikan pertanyaan klarifikasi (tanpa LLM call)
        │
        ├─► ragRetriever.js
        │     → cari chunk relevan dari knowledge base
        │     → inject ke prompt (menghindari halusinasi)
        │
        ├─► memoryManager.js
        │     → update structured memory
        │     → track: role, issue, emotion, history
        │
        ├─► promptBuilder.js
        │     → bangun system prompt dinamis
        │     → layer: identity + intent mode + memory + style + RAG context
        │
        └─► llmClient.js
              → panggil Gemini API (API key aman di server)
              → kembalikan reply
        │
        ▼
[Backend response]
 { reply, updatedMemory, intent, clarifying }
        │
        ▼
[Frontend]
 - Simpan updatedMemory ke sessionStorage
 - Render bubble dengan typewriter effect
```

---

## Cara Install & Jalankan

### 1. Clone / salin folder backend

```bash
cd resik-ai-backend
npm install
```

### 2. Setup environment variable

```bash
cp .env.example .env
# Edit .env, isi GEMINI_API_KEY dengan API key dari Google AI Studio
```

### 3. Jalankan server

```bash
# Development
npm run dev

# Production
npm start
```

Server berjalan di `http://localhost:3001`

### 4. Ganti frontend

Di HTML website SELARAS, ganti:
```html
<!-- HAPUS ini: -->
<script src="resik-ai.js"></script>

<!-- GANTI dengan: -->
<script src="resik-ai-v3.js"></script>
```

Di `resik-ai-v3.js`, sesuaikan `AI_BACKEND_URL`:
```js
// Development:
const AI_BACKEND_URL = 'http://localhost:3001/api/chat';

// Production:
const AI_BACKEND_URL = 'https://api.resik.id/api/chat';
```

---

## Deployment Options

### Option A: VPS / Cloud VM (paling simpel)

```bash
# Install PM2 untuk process management
npm install -g pm2

# Jalankan server
pm2 start server.js --name resik-ai

# Auto-restart saat reboot
pm2 startup
pm2 save
```

### Option B: Railway / Render (gratis tier tersedia)

1. Push folder `resik-ai-backend/` ke GitHub repo
2. Connect ke Railway.app atau Render.com
3. Set environment variable `GEMINI_API_KEY` di dashboard mereka
4. Deploy — dapat URL publik otomatis

### Option C: Cloudflare Workers (edge, sangat cepat)

Perlu refactor `server.js` ke format Workers (fetch handler).
Modul-modul lainnya bisa dipakai langsung.

---

## Menambah Knowledge Base (RAG)

Edit file `modules/ragRetriever.js`, tambahkan chunk baru di array `KNOWLEDGE_BASE`:

```js
{
  id: 'fitur-baru-xyz',
  topic: 'operational',          // harus match intent name
  tags: ['kata kunci', 'lain'],  // dipakai untuk matching
  content: `
KONTEN YANG AKAN DIINJEKSI KE PROMPT:
- Poin 1
- Poin 2
...
`
}
```

Untuk scale besar (>500 chunk), ganti dengan:
- **Embedding** menggunakan `text-embedding-004` (Gemini) atau `text-embedding-3-small` (OpenAI)
- **Vector DB**: Pinecone (managed) atau pgvector (self-hosted di PostgreSQL)

---

## Menambah Intent Baru

Edit `modules/intentDetector.js`:

```js
{
  intent: 'nama_intent_baru',
  patterns: [
    /pola regex pertama/i,
    /pola regex kedua/i
  ]
}
```

Lalu tambahkan layer di `modules/promptBuilder.js`:

```js
const INTENT_LAYERS = {
  // ... existing
  nama_intent_baru: `
MODE: DESKRIPSI MODE
Instruksi spesifik untuk intent ini...
`
}
```

---

## Security Checklist

- [x] API key tidak ada di frontend
- [x] API key dibaca dari environment variable (bukan hardcode)
- [x] Rate limiting aktif (30 req/menit per IP)
- [x] Input validation + hard cap 1000 karakter
- [x] CORS dikonfigurasi ke origin spesifik (set `FRONTEND_ORIGIN`)
- [x] Safety settings Gemini aktif
- [ ] **TODO**: Tambahkan logging (Winston/Pino) untuk audit trail
- [ ] **TODO**: Tambahkan moderasi konten sebelum LLM call
- [ ] **TODO**: Autentikasi endpoint jika perlu (JWT / API key internal)

---

## Roadmap Upgrade Selanjutnya

### Phase 2 — Intelligence
- [ ] Embedding-based RAG (ganti keyword retrieval)
- [ ] Tool calling: cek status pickup real-time dari database
- [ ] Handoff ke human agent via webhook

### Phase 3 — Scale
- [ ] Redis untuk rate limiting terdistribusi
- [ ] Logging + analytics dashboard
- [ ] A/B testing response strategy
- [ ] Multi-language support (EN + ID)
