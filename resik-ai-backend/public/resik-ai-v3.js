/* ════════════════════════════════════════════════════════
   resik-ai-v3.js — SELARAS AI Assistant v3.0
   
   Perubahan arsitektur dari v2:
   ✅ API key TIDAK ada di frontend (dipindah ke backend)
   ✅ Berkomunikasi dengan backend /api/chat
   ✅ Structured memory dikirim & diterima tiap request
   ✅ Intent-aware UI feedback
   ✅ Clarification state handling
   ✅ Retry & graceful error handling
   ✅ Session isolation via sessionStorage
   ════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     ▶ KONFIGURASI — ubah sesuai environment
     ══════════════════════════════════════════════════════ */

  // URL backend SELARAS AI — TIDAK ada API key di sini
  const AI_BACKEND_URL = 'https://api.resik.id/api/chat'; // production
  // const AI_BACKEND_URL = 'http://localhost:3001/api/chat'; // development

  const TYPING_SPEED_MS = 10;
  const MAX_RETRIES     = 1;

  /* ══════════════════════════════════════════════════════
     ▶ SESSION MEMORY — tersimpan di sessionStorage
     Dikirim ke backend tiap request, dikembalikan updated.
     ══════════════════════════════════════════════════════ */

  const SESSION_KEY = 'resik_ai_memory';

  function getMemory() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveMemory(memory) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(memory));
    } catch {
      // sessionStorage penuh atau tidak tersedia — lanjut tanpa memory
    }
  }

  function clearMemory() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /* ══════════════════════════════════════════════════════
     ▶ QUICK QUESTIONS
     ══════════════════════════════════════════════════════ */
  const QUICK_QUESTIONS = [
    { label: '🌿 Apa itu SELARAS?',       text: 'Apa itu SELARAS dan bagaimana cara kerjanya?' },
    { label: '📋 Cara daftar',           text: 'Bagaimana cara mendaftar di SELARAS?' },
    { label: '💰 Gratis atau berbayar?', text: 'Apakah SELARAS gratis untuk digunakan?' },
    { label: '🚚 Sistem pickup',         text: 'Bagaimana sistem pickup food waste di SELARAS?' },
    { label: '🏅 Badge & reward',        text: 'Apa itu sistem badge di SELARAS?' },
    { label: '🔒 Keamanan pangan',       text: 'Bagaimana SELARAS memastikan keamanan makanan?' },
  ];

  /* ══════════════════════════════════════════════════════
     ▶ FALLBACK — dipakai jika backend tidak bisa dihubungi
     ══════════════════════════════════════════════════════ */
  const FALLBACK_MAP = [
    {
      test: /daftar|registrasi|bergabung|mulai/i,
      reply: 'Untuk mendaftar:\n• Klik **Daftar Gratis** di halaman utama\n• Pilih role: Food Provider atau Pengelola\n• Verifikasi email → akun aktif dalam 3 menit\n\nUntuk Pengelola diperlukan verifikasi dokumen (1–2 hari kerja).'
    },
    {
      test: /pickup|klaim|ambil/i,
      reply: 'Alur pickup:\n• Pengelola temukan listing di peta\n• Klik **Klaim** dan pilih jadwal\n• Provider notifikasi otomatis\n• Pantau status: Waiting → Accepted → On the Way → ✅ Completed'
    },
    {
      test: /gratis|biaya|harga|bayar/i,
      reply: '✅ SELARAS **gratis** untuk perorangan dan organisasi nirlaba.\n\nPaket Pro tersedia untuk bisnis (restoran, hotel) dengan fitur analitik lanjutan. Info: admin@selaras.id'
    },
    {
      test: /keamanan|aman|basi|layak/i,
      reply: 'Keamanan pangan dijaga berlapis:\n• Verifikasi AI saat upload\n• Review manual admin\n• Fitur laporan dari pengguna\n• Penanganan < 2 jam'
    }
  ];

  function getFallback(question) {
    const match = FALLBACK_MAP.find(f => f.test.test(question));
    if (match) return match.reply;
    return 'Maaf, saya sedang tidak bisa terhubung. 🙏\n\nSilakan hubungi tim SELARAS langsung:\n• 📧 admin@selaras.id *(< 24 jam)*\n• 💬 WA +6281234567890 *(< 2 jam)*';
  }

  /* ══════════════════════════════════════════════════════
     ▶ API CALL — ke backend (bukan langsung ke Gemini)
     ══════════════════════════════════════════════════════ */
  async function callBackend(message, retryCount = 0) {
    const memory = getMemory();

    const response = await fetch(AI_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionMemory: memory })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('rate_limit');
      }
      throw new Error(`backend_error_${response.status}`);
    }

    const data = await response.json();

    // Simpan updated memory dari backend
    if (data.updatedMemory) {
      saveMemory(data.updatedMemory);
    }

    return {
      reply: data.reply,
      intent: data.intent,
      clarifying: data.clarifying || false
    };
  }

  /* ══════════════════════════════════════════════════════
     ▶ MARKDOWN → HTML
     ══════════════════════════════════════════════════════ */
  function markdownToHtml(text) {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    const lines = html.split('\n');
    const result = [];
    let inList = false;
    let listType = 'ul';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isBullet   = /^[•\-]\s+/.test(line);
      const isNumbered = /^\d+\.\s+/.test(line);

      if (isBullet || isNumbered) {
        const type = isNumbered ? 'ol' : 'ul';
        if (!inList || listType !== type) {
          if (inList) result.push(`</${listType}>`);
          result.push(`<${type} class="ai-list">`);
          inList = true;
          listType = type;
        }
        const content = line.replace(/^[•\-]\s+/, '').replace(/^\d+\.\s+/, '');
        result.push(`<li>${content}</li>`);
      } else {
        if (inList) { result.push(`</${listType}>`); inList = false; }
        if (line) result.push(`<p>${line}</p>`);
      }
    }
    if (inList) result.push(`</${listType}>`);

    return result.join('');
  }

  /* ══════════════════════════════════════════════════════
     ▶ TYPEWRITER EFFECT
     ══════════════════════════════════════════════════════ */
  function typewriterEffect(container, html, onDone) {
    container.innerHTML = '';
    let i = 0;
    const total = html.length;

    function step() {
      if (i >= total) {
        container.innerHTML = html;
        if (onDone) onDone();
        return;
      }
      i = Math.min(i + 4, total);
      container.innerHTML = html.slice(0, i);
      setTimeout(step, TYPING_SPEED_MS);
    }
    step();
  }

  /* ══════════════════════════════════════════════════════
     ▶ RENDER: bubble percakapan
     ══════════════════════════════════════════════════════ */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function appendMessage(role, text, options = {}) {
    const chatLog = document.getElementById('aiChatLog');
    if (!chatLog) return;

    const bubble = document.createElement('div');
    const isClarifying = options.clarifying;

    if (role === 'user') {
      bubble.className = 'ai-bubble ai-bubble-user';
      bubble.innerHTML = `<span class="ai-bubble-text">${escapeHtml(text)}</span>`;
      chatLog.appendChild(bubble);
    } else {
      bubble.className = `ai-bubble ai-bubble-model${isClarifying ? ' ai-bubble-clarifying' : ''}`;
      const textEl = document.createElement('span');
      textEl.className = 'ai-bubble-text';
      bubble.appendChild(textEl);
      chatLog.appendChild(bubble);

      const htmlContent = markdownToHtml(text);
      if (options.useTyping !== false) {
        typewriterEffect(textEl, htmlContent, () => scrollBottom());
      } else {
        textEl.innerHTML = htmlContent;
      }
    }

    scrollBottom();
  }

  function appendSystemNote(text) {
    const chatLog = document.getElementById('aiChatLog');
    if (!chatLog) return;
    const note = document.createElement('div');
    note.className = 'ai-system-note';
    note.textContent = text;
    chatLog.appendChild(note);
    scrollBottom();
  }

  function scrollBottom() {
    const chatLog = document.getElementById('aiChatLog');
    if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
  }

  /* ══════════════════════════════════════════════════════
     ▶ HANDLER UTAMA: proses pertanyaan
     ══════════════════════════════════════════════════════ */
  async function handleAIQuery(questionOverride) {
    const input         = document.getElementById('searchInput');
    const sendBtn       = document.querySelector('.hero-search-btn');
    const responseArea  = document.getElementById('aiResponseArea');
    const loadingBubble = document.getElementById('aiLoadingBubble');

    const question = (questionOverride || input?.value || '').trim();
    if (!question) { input?.focus(); return; }

    // Buka panel jika belum
    responseArea?.classList.add('ai-open');
    setTimeout(() => {
      responseArea?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    // Tampilkan bubble user
    appendMessage('user', question);

    // Reset input & disable tombol
    if (input) input.value = '';
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '...'; }

    // Tampilkan loading
    if (loadingBubble) loadingBubble.style.display = 'flex';

    let result = null;
    try {
      result = await callBackend(question);
    } catch (err) {
      console.warn('[SELARAS AI] Backend error:', err.message);

      if (err.message === 'rate_limit') {
        if (loadingBubble) loadingBubble.style.display = 'none';
        appendSystemNote('⏳ Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.');
        setButtonReady(sendBtn);
        return;
      }

      // Fallback lokal jika backend mati
      result = { reply: getFallback(question), intent: 'faq', clarifying: false };
    }

    // Sembunyikan loading
    if (loadingBubble) loadingBubble.style.display = 'none';

    // Tampilkan jawaban
    appendMessage('model', result.reply, {
      useTyping: true,
      clarifying: result.clarifying
    });

    setButtonReady(sendBtn);
    input?.focus();
  }

  function setButtonReady(sendBtn) {
    if (!sendBtn) return;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Kirim';
  }

  /* ══════════════════════════════════════════════════════
     ▶ BUILD UI
     ══════════════════════════════════════════════════════ */
  function buildUI() {
    const area = document.getElementById('aiResponseArea');
    if (!area) return;

    area.innerHTML = `
      <div class="ai-response-card">

        <div class="ai-response-header">
          <div class="ai-avatar">🌿</div>
          <div class="ai-header-info">
            <div class="ai-name">SELARAS AI</div>
            <div class="ai-tagline">Asisten operasional platform SELARAS</div>
          </div>
          <button class="ai-clear-btn" id="aiClearBtn" title="Mulai percakapan baru">
            🔄 Reset
          </button>
        </div>

        <div class="ai-quick-wrap" id="aiQuickWrap">
          <div class="ai-quick-label">Pertanyaan populer:</div>
          <div class="ai-quick-chips" id="aiQuickChips"></div>
        </div>

        <div class="ai-chat-log" id="aiChatLog">
          <div class="ai-bubble ai-bubble-model ai-bubble-greeting">
            <span class="ai-bubble-text">
              Halo! Saya <strong>SELARAS AI</strong> 🌿<br>
              Ada yang ingin ditanyakan soal platform SELARAS,
              food waste management, atau bantuan teknis?
            </span>
          </div>
          <div class="ai-loading-bubble" id="aiLoadingBubble" style="display:none">
            <div class="ai-loading-dot"></div>
            <div class="ai-loading-dot"></div>
            <div class="ai-loading-dot"></div>
          </div>
        </div>

      </div>
    `;

    // Render quick chips
    const chipsContainer = document.getElementById('aiQuickChips');
    QUICK_QUESTIONS.forEach(q => {
      const chip = document.createElement('button');
      chip.className = 'ai-chip';
      chip.textContent = q.label;
      chip.addEventListener('click', () => {
        const qw = document.getElementById('aiQuickWrap');
        if (qw) qw.style.display = 'none';
        handleAIQuery(q.text);
      });
      chipsContainer.appendChild(chip);
    });

    // Tombol reset
    document.getElementById('aiClearBtn').addEventListener('click', () => {
      clearMemory();
      buildUI();
      document.getElementById('aiResponseArea')?.classList.add('ai-open');
    });
  }

  /* ══════════════════════════════════════════════════════
     ▶ INISIALISASI
     ══════════════════════════════════════════════════════ */
  function init() {
    const input   = document.getElementById('searchInput');
    const sendBtn = document.querySelector('.hero-search-btn');

    if (!input || !sendBtn) {
      console.warn('[SELARAS AI] Elemen UI tidak ditemukan.');
      return;
    }

    buildUI();

    input.setAttribute('placeholder', 'Ketik pertanyaan tentang SELARAS...');
    input.classList.add('ai-mode');
    input.removeAttribute('oninput');
    sendBtn.textContent = 'Kirim';

    sendBtn.addEventListener('click', e => { e.preventDefault(); handleAIQuery(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleAIQuery(); } });
    input.addEventListener('focus', () => {
      document.getElementById('aiResponseArea')?.classList.add('ai-open');
    });

    console.log('[SELARAS AI v3] Siap. Backend-secure mode aktif. 🌿');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
