/**
 * modules/clarificationEngine.js
 * Mendeteksi ambiguitas dan menghasilkan pertanyaan klarifikasi yang fokus.
 * Prinsip: AI harus DIAGNOSTIK, bukan FAQ generator.
 */

/* ─── Aturan klarifikasi per intent ─── */
const CLARIFICATION_RULES = {
  pickup_problem: {
    ambiguityCheck: (msg) => !/saat|ketika|pada (saat|tahap|proses)|setelah|sebelum/.test(msg),
    question: (msg) =>
      `Pickup gagal di tahap mana?\n\n` +
      `• **Saat proses klaim** (tombol klaim tidak berfungsi)\n` +
      `• **Setelah klaim** (driver tidak datang / status tidak berubah)\n` +
      `• **Saat pickup berlangsung** (ada masalah di lokasi)\n` +
      `• **Setelah selesai** (status salah / tidak tercatat)\n\n` +
      `Biar saya bantu dengan langkah yang paling relevan.`
  },

  troubleshooting: {
    ambiguityCheck: (msg) => !/login|upload|dashboard|notifikasi|foto|peta|map/.test(msg),
    question: (msg) =>
      `Masalahnya terjadi di fitur apa?\n\n` +
      `• **Login / akses akun**\n` +
      `• **Upload listing makanan**\n` +
      `• **Dashboard / tampilan**\n` +
      `• **Notifikasi / email**\n` +
      `• **Fitur lain** (sebutkan)\n\n` +
      `Info ini penting agar saya bisa diagnosis yang tepat.`
  },

  technical_issue: {
    ambiguityCheck: (msg) => !/password|email|otp|verifikasi|akun/.test(msg),
    question: (msg) =>
      `Masalah teknis yang kamu hadapi:\n\n` +
      `• **Tidak bisa login** (salah password / akun terkunci)\n` +
      `• **Email tidak masuk** (verifikasi / reset password)\n` +
      `• **Akun belum aktif / diverifikasi**\n` +
      `• **Masalah teknis lain**\n\n` +
      `Pilih yang paling sesuai supaya saya bisa bantu langsung.`
  },

  operational: {
    ambiguityCheck: (msg) => !/provider|pengelola|upload|klaim|listing|dashboard/.test(msg),
    question: (msg) =>
      `Kamu menggunakan SELARAS sebagai:\n\n` +
      `• **Food Provider** (ingin upload / kelola listing)\n` +
      `• **Pengelola** (ingin klaim / pickup makanan)\n\n` +
      `Role kamu menentukan alur yang berbeda.`
  },

  unclear: {
    ambiguityCheck: () => true, // selalu klarifikasi jika intent unclear
    question: (msg) =>
      `Boleh saya tahu lebih lanjut? 🙏\n\n` +
      `Apakah pertanyaanmu tentang:\n` +
      `• **Cara mendaftar / mulai** menggunakan SELARAS\n` +
      `• **Masalah teknis** yang sedang dihadapi\n` +
      `• **Cara kerja fitur** tertentu\n` +
      `• **Lainnya**\n\n` +
      `Biar saya bisa kasih jawaban yang paling tepat sasaran.`
  }
};

/* ─── Kondisi TIDAK perlu klarifikasi ─── */
const SKIP_CLARIFICATION_INTENTS = new Set(['faq', 'pricing', 'onboarding', 'escalation', 'complaint', 'emotional']);

/**
 * Apakah pesan ini membutuhkan klarifikasi dulu?
 * @returns {boolean}
 */
export function shouldClarify(message, intentResult, memory) {
  const { intent, confidence } = intentResult;

  // Skip jika memory sedang menunggu jawaban user atas pertanyaan sebelumnya
  if (memory.awaitingClarification && memory.lastIntent === intent) return false;

  // Beberapa intent sudah self-explanatory
  if (SKIP_CLARIFICATION_INTENTS.has(intent)) return false;

  // Jika pesan cukup panjang (> 60 karakter), kemungkinan sudah cukup konteks
  if (message.length > 60) return false;

  const rule = CLARIFICATION_RULES[intent];
  if (!rule) return false;

  return rule.ambiguityCheck(message);
}

/**
 * Bangun teks klarifikasi
 * @returns {string}
 */
export function buildClarificationPrompt(message, intentResult, memory) {
  const { intent } = intentResult;
  const rule = CLARIFICATION_RULES[intent] || CLARIFICATION_RULES['unclear'];
  return rule.question(message);
}
