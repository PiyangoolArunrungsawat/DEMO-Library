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
3. Switch between reading modes with the radio buttons or double-click the viewer.
4. Navigate pages with the on-screen buttons or arrow keys when in single-page mode.

> Tip: To share or install the reader, serve the `web/` directory with any static file server and add a `manifest.json`/service worker if you want full PWA capabilities.

## Roadmap ideas

- Add support for `.cbr` (RAR) archives via an additional decompression library.
- Persist reading progress and user preferences in local storage.
- Provide optional low-memory rendering by streaming PDF pages on demand in vertical mode.
