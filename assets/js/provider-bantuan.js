/* provider-bantuan.js — FAQ & Panduan interactions */
(function () {

  /* ── Panduan data ── */
  const PANDUAN = [
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
      iconBg: '#E8F5E9', iconColor: '#2E7D32',
      title: 'Cara Mendaftarkan Smart Bin Baru',
      desc: 'Panduan langkah demi langkah untuk menghubungkan smart bin baru ke akun provider Anda.',
      link: '#',
    },
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      iconBg: '#E3F2FD', iconColor: '#1565C0',
      title: 'Cara Mencatat Setoran Limbah',
      desc: 'Pelajari cara mencatat setoran limbah organik secara akurat dan mendapatkan konfirmasi dari admin.',
      link: '#',
    },
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
      iconBg: '#F3E5F5', iconColor: '#6A1B9A',
      title: 'Membaca Laporan & Statistik',
      desc: 'Cara memahami data dashboard, laporan bulanan, dan statistik dampak lingkungan Anda.',
      link: '#',
    },
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
      iconBg: '#FFF8E1', iconColor: '#F57F17',
      title: 'Mengatur Notifikasi & Alert',
      desc: 'Konfigurasi notifikasi kapasitas bin, jadwal pengangkutan, dan peringatan sistem.',
      link: '#',
    },
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.18V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.18l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      iconBg: '#FFF3E0', iconColor: '#E65100',
      title: 'Pengaturan Profil Organisasi',
      desc: 'Cara memperbarui informasi lembaga, kontak, dan preferensi akun provider Anda.',
      link: '#',
    },
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      iconBg: '#E8F5E9', iconColor: '#2E7D32',
      title: 'Export & Download Laporan',
      desc: 'Panduan mengunduh laporan PDF/Excel untuk keperluan audit, pelaporan, atau dokumentasi internal.',
      link: '#',
    },
  ];

  const grid = document.getElementById('panduan-grid');
  if (grid) {
    grid.innerHTML = PANDUAN.map(p => `
      <div class="panduan-card">
        <div class="panduan-icon" style="background:${p.iconBg};color:${p.iconColor};">${p.icon}</div>
        <div class="panduan-title">${p.title}</div>
        <div class="panduan-desc">${p.desc}</div>
        <a class="panduan-link" href="${p.link}">
          Baca panduan
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </div>`).join('');
  }

  /* ── FAQ data ── */
  const FAQS = [
    {
      q: 'Bagaimana cara mendaftarkan smart bin baru ke sistem SELARAS?',
      a: 'Masuk ke halaman Smart Bin, lalu klik tombol "Tambah Bin". Masukkan kode perangkat yang tertera di label bin, nama lokasi, dan titik koordinat. Tim admin akan memverifikasi dalam 1×24 jam kerja.',
    },
    {
      q: 'Apa yang harus dilakukan jika sensor bin menunjukkan data yang tidak akurat?',
      a: 'Coba restart perangkat dengan menekan tombol reset di bawah bin selama 5 detik. Jika masalah berlanjut, hubungi support melalui WhatsApp dengan menyertakan kode bin dan foto kondisi perangkat.',
    },
    {
      q: 'Berapa lama proses konfirmasi setoran limbah?',
      a: 'Konfirmasi setoran biasanya dilakukan dalam 2–4 jam kerja oleh admin pondok. Anda akan mendapatkan notifikasi otomatis saat setoran dikonfirmasi. Jika lebih dari 1 hari kerja belum ada konfirmasi, hubungi admin.',
    },
    {
      q: 'Bagaimana cara melihat riwayat aktivitas dan laporan saya?',
      a: 'Kunjungi menu "Riwayat" di sidebar untuk melihat seluruh histori aktivitas. Untuk laporan ringkasan bulanan, kunjungi menu "Laporan Saya". Anda dapat mengunduh laporan dalam format PDF atau Excel.',
    },
    {
      q: 'Apakah data kontribusi lingkungan saya akurat?',
      a: 'Ya, data kontribusi dihitung berdasarkan berat limbah yang dikonfirmasi oleh admin menggunakan faktor konversi standar emisi karbon (IPCC 2019). Setiap 1 kg limbah organik yang terkelola setara dengan pengurangan ~0.5 kg CO₂e.',
    },
    {
      q: 'Bagaimana cara mengubah jadwal pengangkutan?',
      a: 'Jadwal pengangkutan diatur oleh tim SELARAS berdasarkan kapasitas bin. Untuk permintaan perubahan jadwal khusus, hubungi support kami minimal 1 hari sebelumnya melalui WhatsApp atau email.',
    },
  ];

  const faqList = document.getElementById('faq-list');
  if (faqList) {
    faqList.innerHTML = FAQS.map((f, i) => `
      <div class="faq-item" id="faq-${i}">
        <div class="faq-question" onclick="toggleFaq(${i})">
          <span class="faq-q-text">${f.q}</span>
          <span class="faq-chevron">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
        <div class="faq-answer"><div class="faq-answer-inner">${f.a}</div></div>
      </div>`).join('');
  }

  window.toggleFaq = function(i) {
    const item = document.getElementById('faq-' + i);
    if (!item) return;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  };

  /* ── Search ── */
  document.getElementById('bantuan-search')?.addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    if (!q) {
      document.querySelectorAll('.panduan-card').forEach(c => c.style.display = '');
      document.querySelectorAll('.faq-item').forEach(c => c.style.display = '');
      return;
    }
    document.querySelectorAll('.panduan-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
    document.querySelectorAll('.faq-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(q) ? '' : 'none';
      if (text.includes(q)) item.classList.add('open');
    });
  });

})();
