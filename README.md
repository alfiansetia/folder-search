# 🗂️ FolderScope — Desktop File Manager

**FolderScope** adalah aplikasi desktop modern berbasis Electron.js yang dirancang untuk menjelajahi, menyaring, dan mencari file atau folder pada direktori target yang telah ditentukan. Aplikasi ini menawarkan antarmuka yang elegan dengan performa yang cepat dan fitur pencarian rekursif yang kuat.

![App Icon](assets/icon.png)

## ✨ Fitur Utama
- **Modern UI/UX:** Tampilan gelap (Dark Mode) premium dengan animasi halus dan *glassmorphism*.
- **Explorer Mode:** Menjelajahi folder lokal dengan tampilan Grid atau List.
- **Search Engine:** Pencarian cepat hingga ke sub-direktori (rekursif) dengan opsi *Case Sensitive* dan *Exact Match*.
- **Smart Filtering:** Filter file berdasarkan kategori (Gambar, Video, Kode, Dokumen, Arsip).
- **File Stats:** Ringkasan jumlah folder, file, dan total ukuran kapasitas secara real-time.
- **Shortcut Support:** Navigasi cepat dengan tombol keyboard (e.g., Backspace untuk naik folder, F5 refresh).

## 🚀 Instalasi (Development)

Jika Anda ingin menjalankan aplikasi ini dari kode sumber di lingkungan pengembangan:

1.  **Prasyarat:** Pastikan [Node.js](https://nodejs.org/) sudah terinstal di komputer Anda.
2.  **Clone Repository:**
    ```bash
    git clone https://github.com/username/folder-search.git
    cd folder-search
    ```
3.  **Install Dependensi:**
    ```bash
    npm install
    ```
4.  **Jalankan Aplikasi:**
    ```bash
    npm start
    ```

## 📦 Build Menjadi Aplikasi (.exe)

Untuk mengompilasi kode ini menjadi aplikasi siap pakai yang bisa dijalankan di komputer lain tanpa perlu Node.js:

1.  **Build Installer (NSIS):**
    Menghasilkan file `.exe` setup yang bisa diinstal di komputer lain.
    ```bash
    npm run build:installer
    ```
2.  **Build Portable version:**
    Menghasilkan satu file `.exe` mandiri yang bisa langsung dijalankan tanpa instalasi.
    ```bash
    npm run build:portable
    ```
3.  **Output:**
    Cek folder `dist/` setelah proses build selesai.

## 🛠️ Tech Stack
- **Core:** Core JavaScript, HTML5, CSS3 (Vanilla).
- **Framework:** [Electron.js](https://www.electronjs.org/)
- **Build Tool:** [electron-builder](https://www.electron.build/)

## 📝 Lisensi
Distribusi di bawah lisensi ISC.

---
Dibuat dengan ❤️ untuk manajemen file yang lebih mudah.
