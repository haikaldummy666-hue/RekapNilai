# 📋 Panduan Fitur: Download Template Nilai Ujian (Kelas)

Fitur baru ini memudahkan guru untuk input nilai ujian tertulis **seluruh siswa satu kelas sekaligus** melalui file Excel yang terstruktur, daripada input satu per satu di aplikasi.

---

## 🎯 Fitur Utama

### 1. **Template dengan Daftar Siswa (Format Seperti Gambar)**

Template Excel yang diunduh memiliki format:
- **Kolom A**: No (1, 2, 3, ...)
- **Kolom B**: Nama Siswa (dari siswa yang terdaftar di kelas)
- **Kolom C+**: Mata Pelajaran (header dengan nama mata pelajaran)

| No | Nama Siswa | Qurdis | Akidah Akhlak | Fikih | ... | Bahasa Sunda |
|----|-----------|--------|---------------|-------|-----|---------|
| 1  | Ahmad Fauzan | 85 | 88 | 90 | ... | 92 |
| 2  | Siti Nurfadila | 82 | 85 | 88 | ... | 89 |
| ... | | | | | | |

### 2. ✨ **Proteksi Excel (Aman dari Perubahan Tidak Sengaja)**

- **Hanya kolom nilai yang bisa di-edit** (tidak bisa ubah No, Nama Siswa)
- **Hanya angka 0-100 yang boleh** (tidak bisa teks atau nilai di luar range)
- **Struktur terlindungi** (tidak bisa tambah/hapus kolom atau baris)
- **Sheet dikunci otomatis** - tinggal isi nilai, sisanya aman

### 3. 🎓 **Menu Mata Pelajaran MULOK (Dinamis)**

Fitur untuk mengelola mata pelajaran lokal:
- **Bahasa Sunda otomatis ada** (tidak bisa dihapus, wajib sebagai MULOK)
- **Tambah mata pelajaran lain**: Informatika, Keterampilan, Seni Budaya Lokal, dll
- **Perubahan otomatis tercermin** ke template yang diunduh
- **Jika mata pelajaran dihapus**, kolom di Excel juga hilang

Tersedia 12 pilihan mata pelajaran lokal:
1. Bahasa Sunda (wajib)
2. Bahasa Daerah
3. Seni Budaya Lokal
4. Informatika
5. Keterampilan
6. Olahraga Tradisional
7. Kesenian
8. Pertanian
9. Perdagangan
10. Kerajinan
11. Tata Graha
12. Boga

---

## 📥 Cara Menggunakan

### Step 1: Buka Halaman Ujian Tertulis
1. Masuk aplikasi
2. Pergi ke menu **Ujian Tertulis**

### Step 2: Klik Tombol "Download Template"
Di halaman ujian tertulis, klik tombol **"Download Template"** di bagian atas.

Dialog akan muncul dengan 3 pilihan:

### Step 3: Pilih Format Template

#### **A. Template Individual**
- Untuk input nilai **satu siswa saja**
- Format: Kolom mata pelajaran dengan satu kolom nilai
- Gunakan jika ingin input per siswa

#### **B. Template Nilai Ujian (Kelas)** ⭐ **RECOMMENDED**
- Untuk input nilai **seluruh kelas sekaligus**
- Format: Siswa dalam baris, mata pelajaran dalam kolom (seperti gambar)
- **Pilih Kelas**: Dropdown untuk memilih kelas mana yang ingin didownload
  - "Semua Siswa" = semua siswa tanpa filter kelas
  - Atau pilih kelas spesifik (6.A, 6.B, dll)
- **Informasi**:
  - Jumlah siswa di kelas
  - Jumlah mata pelajaran (SUBJECTS + MULOK)
  - Status: "Sheet dikunci - hanya nilai yang dapat diedit"
- Klik **"Download Template Kelas"**

#### **C. Manajemen Mata Pelajaran Lokal**
- **Daftar Mata Pelajaran Saat Ini**: Badge dengan nama-nama MULOK yang terpilih
  - Bahasa Sunda ada lambang "(wajib)"
  - MULOK lain ada tombol **X** untuk hapus
- **Tambah Mata Pelajaran Lokal**:
  - Dropdown untuk pilih mata pelajaran
  - Tombol **Tambah** untuk konfirmasi
  - Perubahan langsung disimpan
- **Catatan**: Perubahan MULOK akan otomatis tercermin di template berikutnya

### Step 4: Isi Nilai di Excel

1. **Buka file Excel yang diunduh**
2. **Isi kolom nilai** (mulai dari kolom C)
   - Hanya angka 0-100
   - Jika ada yang tidak valid, Excel akan warning
3. **Hanya kolom nilai yang bisa diubah**
   - Kolom No, Nama Siswa terkunci (tidak bisa ubah)
   - Kolom mata pelajaran header juga terkunci

### Step 5: Upload ke Aplikasi (Fitur Mendatang)

> 💡 **Note**: Fitur upload dari Excel akan ditambahkan di update berikutnya
> Untuk saat ini, bisa:
> - Input nilai di aplikasi manual, atau
> - Hubungi admin untuk batch import

---

## 💡 Tips & Best Practices

### ✅ Yang Boleh Dilakukan
- ✅ Edit nilai di kolom mata pelajaran (hanya angka 0-100)
- ✅ Lihat daftar siswa lengkap di template
- ✅ Tambah/hapus MULOK sesuai kebutuhan sekolah
- ✅ Download template berkali-kali (selalu update dengan MULOK terbaru)

### ❌ Yang TIDAK Boleh Dilakukan
- ❌ Ubah nomor siswa atau nama siswa
- ❌ Tambah atau hapus baris siswa
- ❌ Ubah nama kolom mata pelajaran
- ❌ Input nilai di luar range 0-100
- ❌ Input teks atau simbol di kolom nilai

---

## 🔒 Fitur Proteksi Excel (Detail Teknis)

### Apa yang Terkunci?

| Bagian | Status | Keterangan |
|--------|--------|-----------|
| Kolom A (No) | 🔒 Terkunci | Tidak bisa diubah |
| Kolom B (Nama Siswa) | 🔒 Terkunci | Tidak bisa diubah |
| Kolom C+ (Nilai) | 🔓 Terbuka | Bisa di-edit (hanya angka) |
| Penambahan Baris | 🔒 Terkunci | Tidak bisa tambah siswa baru |
| Penambahan Kolom | 🔒 Terkunci | Tidak bisa tambah mata pelajaran |
| Format Cells | 🔒 Terkunci | Tidak bisa ubah format |

### Password
- **Tidak ada password** - bisa langsung isi tanpa password
- Proteksi otomatis aktif saat sheet dibuka
- Tujuan: proteksi dari perubahan tidak sengaja, bukan keamanan data

---

## 📊 Contoh Workflow

### Scenario: Input nilai ujian tertulis kelas 6.A

1. **Guru membuka halaman Ujian Tertulis** di aplikasi
2. **Klik "Download Template"**
3. **Pilih "Template Nilai Ujian (Kelas)"**
4. **Pilih Kelas**: 6.A
5. **Lihat info**: "Siswa di kelas: 30, Mata Pelajaran: 14"
6. **Klik "Download Template Kelas"**
   - File `Template-Ujian-Tertulis-Kelas.xlsx` ter-download
7. **Buka di Excel**, isi nilai untuk semua 30 siswa
8. **Simpan file**
9. **Upload ke aplikasi** (fitur akan ditambah nanti) atau hubungi admin

**Keuntungan**: 
- Selesai input 30 siswa hanya dalam 5-10 menit
- Tidak perlu ganti-ganti siswa di aplikasi
- Tidak bisa salah input struktur (kolom/baris terkunci)

---

## 🆘 Troubleshooting

### Q: "Semua siswa belum ada di aplikasi, bagaimana?"
**A**: 
1. Masuk menu **Daftar Siswa**
2. Impor file Excel siswa
3. Atau input manual satu per satu (atau bulk upload)
4. Baru download template ujian

### Q: "Template tidak ada kolom mata pelajaran X yang saya ingin"
**A**:
1. Buka lagi "Download Template"
2. Di bagian "Manajemen Mata Pelajaran Lokal"
3. Pilih mata pelajaran di dropdown
4. Klik "Tambah"
5. Download template lagi - kolom baru sudah ada

### Q: "Tidak bisa ubah nilai di Excel"
**A**: 
Berarti sel itu terkunci. Pastikan:
- Anda mengedit di kolom **nilai** (kolom C ke kanan)
- Bukan di kolom No atau Nama Siswa
- Jika masih tidak bisa, coba:
  1. Tutup file dan buka lagi
  2. Restart Excel
  3. Coba di komputer lain

### Q: "Mata pelajaran lama masih muncul di template"
**A**:
- Aplikasi cache hasil download
- Coba: buka template lama di folder, lihat apakah file baru (check modified time)
- Atau clear browser cache dan download lagi

### Q: "Format nilai tidak valid (misal harus integer 0-100)"
**A**:
- Excel protection hanya dapat limit format yang diset
- Manual check: input harus angka bulat 0-100
- Jangan input: 85.5 (harus 85 atau 86), "NA", teks, dll

---

## 📝 Catatan Versi

- **v1.0 (Current)**: Template download dengan MULOK dinamis
- **v1.1 (Planned)**: Upload Excel hasil isi nilai ke aplikasi
- **v2.0 (Planned)**: Batch import dengan validasi data lengkap

---

## 📞 Support

Jika ada pertanyaan atau error, hubungi admin dengan informasi:
- Browser apa yang digunakan
- Error message (jika ada)
- Screenshot

---

**Selamat menggunakan! 🎉**
