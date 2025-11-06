# DEMO-Library

An experimental manga/comic reader that runs in any modern web browser on desktop or mobile. Load PDF volumes, CBZ/ZIP archives, or folders full of images and switch between page-by-page and vertical scroll reading modes.

## Why a web app?

- **Runs everywhere** – Open `web/index.html` locally or host it as a PWA-compatible site for Windows, macOS, Linux, iOS, and Android.
- **No installs required** – Everything is client-side using vanilla JS, `pdf.js`, and `JSZip`.
- **Flexible inputs** – Supports PDF, CBZ/ZIP (with images), and plain image folders (`.jpg/.png/.webp/.gif`).
- **Multiple reading modes** – Toggle between single-page navigation and continuous vertical scrolling (webtoon-style).

## Getting started

1. Open `web/index.html` in a browser (Chrome, Edge, Firefox, Safari). ทุกไลบรารีอยู่ในโปรเจกต์แล้วจึงไม่ต้องต่อเน็ต (ถ้าเปิดผ่าน `file://` ระบบจะปิด worker อัตโนมัติให้ PDF ยังอ่านได้)
2. Use the buttons or drag-and-drop to load:
   - A single PDF file
   - A single CBZ/ZIP archive of images
   - Multiple image files or an entire folder (works best on desktop browsers) — รองรับ `.jpg/.png/.webp/.gif` ทั้งไฟล์เดี่ยวและไฟล์ที่อยู่ใน ZIP/CBZ
3. เปิดเมนูการตั้งค่าผ่านไอคอนรูปเฟืองเพื่อสลับโหมดการอ่าน ปรับธีม กำหนดความสูงของพื้นที่อ่าน และในโหมดเลื่อนแนวตั้งสามารถเลือกได้ว่าจะเว้นช่องว่างระหว่างหน้าหรือไม่
4. Navigate pages with the on-screen buttons or arrow keys when in single-page mode.

> Tip: To share or install the reader, serve the `web/` directory with any static file server and add a `manifest.json`/service worker if you want full PWA capabilities.

### เปิดผ่านเว็บเซิร์ฟเวอร์แบบคลิกครั้งเดียว

สคริปต์ทั้งหมดอยู่ในโฟลเดอร์ `scripts/`:

- **Windows** : เปิด `scripts/start_server.bat` (ดับเบิลคลิก). จะเปิดคอนโซล รันเซิร์ฟเวอร์ และเปิดเบราว์เซอร์ให้อัตโนมัติ; ปิดหน้าต่างเพื่อหยุด
- **macOS** : ดับเบิลคลิก `scripts/start_server.command` (ครั้งแรกอาจต้องคลิกขวา → Open เพื่ออนุญาต)
- **Linux** : ตั้งค่าให้รันได้ (`chmod +x scripts/start_server.sh`) แล้วดับเบิลคลิก `start_server.sh` เพื่อเปิดในเทอร์มินัล หรือรัน `python3 scripts/start_server.py`
- ทุกสคริปต์ต้องมี Python 3 ในระบบ และจะเสิร์ฟโฟลเดอร์ `web/` เดียวกันที่ `http://127.0.0.1:<port>/`

## Roadmap ideas

- Add support for `.cbr` (RAR) archives via an additional decompression library.
- Persist reading progress and user preferences in local storage.
- Provide optional low-memory rendering by streaming PDF pages on demand in vertical mode.
