# Indonesia Right Now & Indonesia Gov Stats (IRN + IGS)

**Tagline:** *Membuka data publik Indonesia dalam satu portal interaktif*  
**Live demo:** https://irn-igs-demo.example.com  
**Tech stack:** Next.js 14 (App Router) • TypeScript • Tailwind CSS • ECharts • Three.js • Zod • Groq AI

---

## Latar Belakang & Masalah
Indonesia memiliki ribuan dataset publik yang tersebar di berbagai institusi. Pengguna sering kesulitan mengakses, menafsirkan, dan membandingkan data tersebut, khususnya pada tingkat provinsi atau kabupaten. Pada saat yang sama, akses ke berita terkait kebijakan publik masih terfragmentasi.

## Solusi – Mengapa Proyek Ini Berbeda
- **Dual‑Mode:** `IRN` menyajikan rangkuman berita dengan pembersihan AI, sedangkan `IGS` menyediakan eksplorasi data pemerintah secara terstruktur.
- **AI Cleansing:** Berita dibersihkan melalui endpoint `/api/news` yang memanfaatkan Groq LLM, menghilangkan bias, duplikasi, dan data pribadi.
- **Visualisasi Interaktif:** Grafik ECharts, peta 3D Three.js, serta diagram dinamis memperkuat pemahaman data.
- **Anti‑Slop Design System:** Palet warna IGS (paper, navy, red), tipografi `Plus Jakarta Sans` & `IBM Plex Mono`, border hairline, teks `tabular‑nums`, dan seluruh UI berbahasa Indonesia.
- **Open Government Data:** Semua dataset CSV (≥ 25 file) diproses menjadi JSON statis, tersedia offline, dan dapat di‑filter menurut wilayah (Nasional, Pulau, Provinsi).

---

## Fitur Utama untuk Pengguna
### Mode IRN (Berita)
- **Analisis URL:** Masukkan URL artikel, dapatkan rangkuman otomatis.
- **Krisis Hari Ini:** Panel berita terkini dengan refresh tiap menit.
- **Bookmark & Watchlist:** Simpan artikel untuk dibaca nanti.

### Mode IGS (Data Pemerintah)
- **Penelusuran Data:** Filter nasional, pulau, atau provinsi; pilih tahun (2020‑2026, sesuai cakupan sumber).
- **Insight otomatis:** 9 insight terpilih (mis. `growth‑vs‑welfare`) ditampilkan di halaman `/gov`.
- **Dashboard & Analitik:** Grafik ECharts (bar, funnel, scatter) dan peta interaktif Three.js.
- **Ekspor & Unduh:** Data dapat diunduh dalam format CSV/JSON.

---

## Kesesuaian dengan Tema MIA 2026
- **Transparansi Data Publik:** Semua dataset resmi dipublikasikan dan dapat diakses tanpa otentikasi.
- **Masa Depan Digital:** Integrasi AI untuk pembersihan konten dan visualisasi 3D menampilkan cara inovatif mengelola informasi publik.
- **Aksesibilitas:** Desain anti‑slop memenuhi WCAG 2.1 AA (kontras, navigasi keyboard, `aria` labels).

---

## Ringkasan Teknis
- **188 halaman statis** (output `next build`).
- **25+ file CSV** di `/datasets` diproses oleh `scripts/build-data.mjs` menjadi JSON di `lib/data`.
- **API:** `/api/news` (AI‑cleansing), `/api/fetch` (generic fetch), `/api/gov-geo` (geo‑JSON).
- **Testing:** 29 vitest unit test (formatter, agregasi, tipe data) semua PASS.

---

## Cara Menjalankan
```bash
# 1. Clone repository frontend
git clone https://github.com/dedyasxkaguya/indonesia-right-now-fe.git
cd indonesia-right-now-fe

# 2. Instal dependencies (wajib menggunakan pnpm)
pnpm install

# 3. Siapkan environment
cp .env.example .env.local
# Edit .env.local dan isi GROQ_API_KEY dengan API key milikmu.

# 4. Jalankan development server
pnpm dev
```

Frontend berjalan di `http://localhost:3000` dan secara default mengakses backend di `http://localhost:8000`. Sesuaikan `BACKEND_URL` pada `.env.local` jika backend berjalan di alamat lain. `GROQ_API_KEY` hanya untuk server; jangan beri awalan `NEXT_PUBLIC_` atau commit `.env.local`. `.env.example` berisi placeholder, bukan API key yang aktif.

---

*Dibuat untuk kompetisi **MIA 2026 – Designing Digital Futures**, tema *Powering Public Transparency*.*