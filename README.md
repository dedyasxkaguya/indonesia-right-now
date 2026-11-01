# Indonesia Right Now × Indonesia Government Stats

**Indonesia Right Now (IRN) × Indonesia Government Stats (IGS)** adalah platform yang menyatukan informasi berita dan data pemerintahan Indonesia dalam satu wadah yang mudah dijelajahi. IRN menghimpun berita dari berbagai provinsi, sedangkan IGS membantu pengguna menelusuri informasi publik, seperti anggaran, kebijakan, program, dan alokasi.

Informasi dikumpulkan dari sumber tepercaya dan disajikan secara terstruktur agar lebih mudah dipahami, termasuk oleh pengguna dengan beragam kebutuhan aksesibilitas. Melalui platform ini, IRN × IGS berupaya memudahkan masyarakat menemukan informasi yang relevan dan menelusuri sumbernya dalam format yang lebih tertata.

## Teknologi yang Digunakan

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, ECharts dan Three.js untuk visualisasi, serta Groq AI.
- **Backend:** Python, FastAPI, BeautifulSoup dan Playwright untuk pengumpulan serta pengolahan konten, serta Groq AI.

## Cara Menjalankan Project

Petunjuk berikut mengasumsikan kedua folder bernama `frontend` dan `backend`. Ganti `<URL_REPOSITORI>` dengan URL repositori yang digunakan.

### 1. Clone repositori

```bash
git clone <URL_REPOSITORI> indonesia-right-now
cd indonesia-right-now
```

### 2. Siapkan dan jalankan backend

Buka terminal pertama, lalu jalankan perintah berikut dari direktori repositori:

```bash
cd backend
python -m venv .venv
```

Aktifkan virtual environment:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Linux/macOS
source .venv/bin/activate
```

Instal dependensi dan siapkan konfigurasi:

```bash
python -m pip install -e .
python -m playwright install chromium
```

Salin `.env.example` menjadi `.env`, lalu isi `GROQ_API_KEY` dengan kunci API Groq yang valid untuk mengaktifkan fitur AI. Berkas dependensi backend saat ini dikelola melalui `pyproject.toml`, bukan `requirements.txt`.

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# Linux/macOS
cp .env.example .env
```

Jalankan FastAPI pada port `8000`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 3. Siapkan dan jalankan frontend

Buka terminal kedua, lalu jalankan:

```bash
cd frontend-irn
pnpm install
```

Salin `.env.example` menjadi `.env.local`:

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```bash
# Linux/macOS
cp .env.example .env.local
```

Pastikan `.env.local` memuat konfigurasi berikut agar frontend terhubung ke backend lokal:

```env
BACKEND_URL=http://localhost:8000
```

Jalankan frontend:

```bash
pnpm dev
```

### 4. Akses website

Buka [http://localhost:3000](http://localhost:3000) di peramban.

## Progres Saat Ini

Fondasi antarmuka IRN × IGS telah dikembangkan dengan baik dan menyajikan pengalaman yang dinamis untuk menjelajahi berita maupun data pemerintahan. Namun, integrasi backend dan sumber data masih terus disempurnakan. Untuk IRN, tim masih mengevaluasi sumber berita yang legal, aktual, dan faktual, sekaligus merancang pemanfaatan AI yang efisien tanpa mengurangi keandalan informasi. Untuk IGS, ketersediaan dataset yang relevan masih menjadi tantangan; sebagian data memiliki akses terbatas, sementara data lainnya memerlukan penelusuran lebih lanjut.

Dengan demikian, pengembangan frontend telah mencapai tahap yang kuat, sedangkan backend masih memerlukan penyempurnaan dan validasi lebih lanjut. Proyek ini memiliki fondasi untuk terus dikembangkan, dengan tujuan menghadirkan akses yang lebih mudah, terstruktur, dan bertanggung jawab terhadap informasi publik Indonesia.
