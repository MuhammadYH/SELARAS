/**
 * modules/ragRetriever.js
 * Retrieval-Augmented Generation (RAG) untuk SELARAS AI.
 *
 * Implementasi: keyword-weighted retrieval (production-ready tanpa vector DB).
 * Catatan: untuk scale besar, ganti dengan embedding + Pinecone/Weaviate.
 *
 * Setiap chunk knowledge punya:
 * - id, topic, tags (untuk matching), content (untuk inject ke prompt)
 */

const KNOWLEDGE_BASE = [
  /* ─── ONBOARDING ─── */
  {
    id: 'onboard-provider',
    topic: 'onboarding',
    tags: ['daftar', 'registrasi', 'provider', 'mulai', 'bergabung'],
    content: `
CARA MENDAFTAR SEBAGAI FOOD PROVIDER:
1. Klik "Daftar Gratis" di halaman utama SELARAS
2. Pilih role: Food Provider
3. Isi data: nama bisnis, alamat, kategori (restoran/kantin/hotel/dll)
4. Verifikasi email (cek inbox / spam)
5. Akun langsung aktif — bisa upload listing pertama

Waktu daftar: ±3 menit. Bisa juga via akun Google.
`
  },
  {
    id: 'onboard-pengelola',
    topic: 'onboarding',
    tags: ['daftar', 'registrasi', 'pengelola', 'bank sampah', 'organisasi'],
    content: `
CARA MENDAFTAR SEBAGAI PENGELOLA:
1. Klik "Daftar Gratis" → pilih role: Pengelola
2. Isi data organisasi (nama, alamat, jenis pengelola)
3. Upload dokumen verifikasi:
   - Akta pendirian / surat izin operasional
   - KTP penanggung jawab
4. Proses verifikasi: 1–2 hari kerja oleh tim SELARAS
5. Setelah disetujui → bisa mulai klaim listing

PENTING: Akun Pengelola memerlukan verifikasi manual. Tidak langsung aktif.
`
  },

  /* ─── PICKUP SYSTEM ─── */
  {
    id: 'pickup-flow',
    topic: 'pickup',
    tags: ['pickup', 'klaim', 'alur', 'sistem', 'ambil'],
    content: `
ALUR PICKUP DI SELARAS:
1. Pengelola buka dashboard → lihat listing tersedia di peta
2. Klik listing → pilih "Klaim"
3. Pilih jadwal pickup yang tersedia
4. Provider menerima notifikasi otomatis
5. Status berubah: Waiting → Accepted → On the Way → Completed
6. Konfirmasi selesai oleh kedua pihak → listing ditutup

Status real-time bisa dipantau dari dashboard masing-masing.
`
  },
  {
    id: 'pickup-troubleshoot-klaim',
    topic: 'pickup_problem',
    tags: ['pickup gagal', 'klaim gagal', 'tombol klaim', 'tidak bisa klaim'],
    content: `
TROUBLESHOOT: GAGAL KLAIM LISTING

Kemungkinan penyebab:
A) Akun Pengelola belum terverifikasi → cek status di Profile > Verifikasi
B) Listing sudah diklaim orang lain → refresh halaman
C) Kapasitas pickup harian sudah penuh → coba esok hari
D) Browser/koneksi bermasalah → clear cache, coba incognito

Langkah: Dashboard → My Pickups → lihat error message jika ada.
Jika masih gagal: screenshot + kirim ke admin@resik.id
`
  },
  {
    id: 'pickup-troubleshoot-driver',
    topic: 'pickup_problem',
    tags: ['driver tidak datang', 'pickup tidak selesai', 'status tidak berubah'],
    content: `
TROUBLESHOOT: DRIVER / PICKUP TIDAK SELESAI

Jika status stuck di "Accepted" / "On the Way":
1. Tunggu 30 menit dari jadwal pickup
2. Cek notifikasi — mungkin ada perubahan jadwal
3. Hubungi pihak lain via fitur chat di dalam platform
4. Jika tetap tidak ada respons → laporkan via Dashboard > Laporkan Masalah

Tim SELARAS akan menindaklanjuti dalam 2 jam kerja.
Pickup yang tidak selesai tidak mempengaruhi rating akun Anda.
`
  },

  /* ─── PRICING ─── */
  {
    id: 'pricing-free',
    topic: 'pricing',
    tags: ['gratis', 'biaya', 'harga', 'free', 'bayar'],
    content: `
HARGA & PAKET SELARAS:

✅ GRATIS untuk:
- Perorangan (semua fitur dasar)
- Organisasi nirlaba / bank sampah
- Food Provider skala kecil (warung, rumah tangga)

💼 PAKET PRO (berbayar) untuk bisnis:
- Restoran, hotel, katering, kantin institusi
- Fitur: analitik lanjutan, laporan impact, dukungan prioritas, API akses
- Harga: hubungi admin@resik.id untuk penawaran khusus

Tidak ada biaya tersembunyi untuk akun Gratis.
`
  },

  /* ─── FOOD SAFETY ─── */
  {
    id: 'food-safety',
    topic: 'verification',
    tags: ['keamanan pangan', 'food safety', 'verifikasi makanan', 'layak konsumsi'],
    content: `
SISTEM KEAMANAN PANGAN SELARAS:

Berlapis:
1. Verifikasi foto AI — setiap listing dianalisis otomatis saat upload
2. Review manual admin untuk listing berisiko tinggi
3. Rating sistem — Pengelola bisa beri feedback tiap pickup
4. Fitur Laporan — siapapun bisa laporkan listing mencurigakan
5. Listing dilaporkan ditangani < 2 jam

SELARAS hanya menerima:
✅ Makanan masih layak konsumsi
✅ Makanan mendekati expired tapi aman
✅ Bahan mentah berlebih
✅ Sisa organik untuk kompos
❌ Makanan basi / tidak aman ditolak otomatis
`
  },

  /* ─── BADGE ─── */
  {
    id: 'badge-system',
    topic: 'faq',
    tags: ['badge', 'reward', 'eco', 'warrior', 'poin', 'kontributor'],
    content: `
SISTEM BADGE SELARAS:

🌱 Green Beginner — donasi/pickup pertama berhasil
🤝 Eco Helper — 10+ pickup/donasi sukses
⚔️ Waste Warrior — 50+ pickup/donasi sukses

Badge tampil di profil publik.
Bisa dibagikan ke Instagram, LinkedIn, dll.
Badge baru sedang dikembangkan — update via newsletter SELARAS.
`
  },

  /* ─── TECHNICAL ─── */
  {
    id: 'tech-login',
    topic: 'technical_issue',
    tags: ['login', 'password', 'lupa sandi', 'akun terkunci', 'tidak bisa masuk'],
    content: `
TROUBLESHOOT LOGIN:

Lupa password:
→ Halaman login → "Lupa Password" → masukkan email → cek inbox

Email verifikasi tidak masuk:
→ Cek folder Spam / Promotions
→ Tunggu 5 menit
→ Minta kirim ulang dari halaman registrasi

Akun terkunci (5x salah password):
→ Tunggu 15 menit, coba lagi
→ Atau gunakan fitur reset password

Masih bermasalah: kirim email ke admin@resik.id dengan subject "Login Issue"
`
  },

  /* ─── CONTACT ─── */
  {
    id: 'contact',
    topic: 'escalation',
    tags: ['kontak', 'hubungi', 'email', 'whatsapp', 'admin', 'tim resik'],
    content: `
KONTAK TIM SELARAS:
📧 Email: admin@resik.id (respons < 24 jam)
💬 WhatsApp: +6281234567890 (respons < 2 jam, jam kerja)
📋 Form kontak: resik.id/kontak

Jam operasional: Senin–Sabtu, 08.00–17.00 WIB
Hari Minggu: respons terbatas, prioritas masalah kritis
`
  }
];

/**
 * Ambil context relevan berdasarkan pesan + intent.
 * @param {string} message
 * @param {{ intent: string }} intentResult
 * @returns {string} - teks yang akan diinjeksi ke system prompt
 */
export function retrieveContext(message, intentResult) {
  const { intent } = intentResult;
  const msgLower = message.toLowerCase();

  // Score tiap chunk
  const scored = KNOWLEDGE_BASE.map(chunk => {
    let score = 0;

    // Exact topic match
    if (chunk.topic === intent) score += 3;

    // Tag matching dengan pesan
    for (const tag of chunk.tags) {
      if (msgLower.includes(tag)) score += 2;
    }

    // Partial word matching
    const words = msgLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      if (chunk.tags.some(t => t.includes(word))) score += 1;
      if (chunk.content.toLowerCase().includes(word)) score += 0.5;
    }

    return { chunk, score };
  });

  // Ambil top 2 chunk dengan score > 0
  const topChunks = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ chunk }) => chunk.content.trim());

  if (topChunks.length === 0) return '';

  return `\n\n[KONTEKS RELEVAN DARI KNOWLEDGE BASE SELARAS]\n${topChunks.join('\n\n---\n\n')}\n[/KONTEKS]`;
}
