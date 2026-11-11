# Indonesia Right Now (IRN) × Indonesia Government Stats (IGS)

**"From Visionaries to Architects of Change"**

Platform web terpadu yang dikembangkan untuk kompetisi Multimedia In Action (MIA) 2026. IRN × IGS hadir sebagai jawaban atas permasalahan maraknya disinformasi serta sulitnya mengakses data resmi pemerintah yang masih terfragmentasi. 

Dengan menggabungkan dua subtema utama (Open Government Data dan Data-Driven Decision Support), platform ini menyatukan **IRN (Indonesia Right Now)** yang menyajikan berita fakta terkini, dan **IGS (Indonesia Government Stats)** yang mengolah statistik pemerintahan (anggaran, kebijakan, indikator makro) menjadi dashboard interaktif dan visualisasi 3D yang intuitif serta mudah dipahami masyarakat umum.

## Fitur Utama

- **Dual-Mode Architecture:** Beralih dengan mulus antara eksplorasi berita (IRN) dan eksplorasi data publik (IGS).
- **AI Chatbot Terintegrasi:**
  - **IRN Presenter:** Dilengkapi dengan Truth Guardrail untuk menganalisis keragaman sumber berita tanpa mengklaim benar atau salah secara subjektif.
  - **IGS Data Assistant:** Menggunakan Tool Calling untuk menghitung statistik (rata-rata, median) secara presisi tanpa halusinasi AI.
- **Interactive Visualizations:** Visualisasi data 2D (ECharts) dan objek 3D (Three.js) yang responsif.
- **25+ Datasets:** Eksplorasi data pemerintah daerah, ekonomi, infrastruktur, dan kesejahteraan.
- **Aksesibilitas (A11y):** Desain antarmuka yang ramah pengguna, termasuk untuk penyandang disabilitas.

## Teknologi yang Digunakan

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, ECharts, Three.js.
- **Backend:** Python, FastAPI, BeautifulSoup/Playwright (Web Scraping).
- **AI Engine:** Groq API.
- **Deployment:** Vercel (Frontend) dan VPS/Cloud (Backend).

## Cara Menjalankan Project

Pastikan Anda sudah menginstal **Node.js 20+**, **pnpm**, dan **Python 3.11+**. Project ini terdiri dari dua folder utama: `backend` (FastAPI) dan `frontend` (Next.js).

### 1. Clone Repositori
```bash
git clone <URL_REPOSITORI> indonesia-right-now
cd indonesia-right-now
2. Setup & Jalankan Backend (Terminal 1)
powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows (Gunakan `source .venv/bin/activate` di Mac/Linux)
python -m pip install -e .
python -m playwright install chromium
Copy-Item .env.example .env    # Windows (Gunakan `cp` di Mac/Linux)
Buka file .env dan isi GROQ_API_KEY dengan API Key Groq yang valid.
Jalankan server:

powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
3. Setup & Jalankan Frontend (Terminal 2)
Buka terminal baru (biarkan terminal backend tetap berjalan):

powershell
cd frontend
pnpm install
Copy-Item .env.example .env.local  # Windows (Gunakan `cp` di Mac/Linux)
Pastikan file .env.local berisi konfigurasi BACKEND_URL=http://localhost:8000.
Jalankan frontend:

powershell
pnpm dev
4. Akses Aplikasi
Buka browser dan akses http://localhost:3000.

Progres Saat Ini
Fondasi antarmuka (Frontend) IRN × IGS telah selesai dikembangkan dengan sangat baik, menyajikan pengalaman pengguna yang dinamis, responsif, dan kaya akan visualisasi data interaktif.

Sistem Backend dan integrasi sumber data saat ini telah berjalan, namun masih terus disempurnakan. Untuk IRN, tim terus mengevaluasi feed berita agar tetap legal, aktual, dan faktual, serta merancang pemanfaatan AI yang efisien. Untuk IGS, tantangan utama terletak pada ketersediaan dataset publik yang terkadang terbatas atau terfragmentasi.

Proyek ini telah memiliki fondasi arsitektur yang kuat dan siap untuk dikembangkan lebih lanjut, dengan tujuan menghadirkan akses informasi publik yang lebih mudah, terstruktur, dan akuntabel bagi seluruh masyarakat Indonesia.