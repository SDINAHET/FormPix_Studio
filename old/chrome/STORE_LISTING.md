# Chrome Web Store launch sheet

## Positioning

**Name:** FormPix Studio — Convert, Resize & Optimize

**Short promise:** Prepare any image for a form, social network, or website without uploading it.

Do not position FormPix as only another “save image as” converter. Lead with the three differentiators: exact dimensions, automatic file-size target, and full local preview.

## Suggested description

FormPix Studio prepares images for online forms, social media and web development directly in Chrome. Crop visually, resize to exact dimensions, convert to JPG, PNG, WebP or AVIF, preserve transparency, remove EXIF metadata, and automatically target a maximum file size such as 500 KB.

Everything is processed locally in your browser. Images are never uploaded to FormPix Studio.

Key features:

- visual crop and before/after preview;
- exact dimensions and aspect-ratio control;
- automatic 100 KB, 500 KB, 1 MB or custom targets;
- presets for Instagram, LinkedIn, YouTube, Open Graph and online forms;
- reliable PNG/WebP transparency options;
- batch conversion;
- right-click image import, file picker, drag and drop, and clipboard paste;
- EXIF removal on export;
- optional local history without storing image pixels;
- English, French, Spanish, German, Brazilian Portuguese and Italian.

## Permission justifications

- `storage`: saves user settings and optional local export-history metadata.
- `sidePanel`: displays the complete editor and preview beside the current page.
- `contextMenus`: adds explicit image conversion actions to the right-click menu.
- `downloads`: saves the processed image with the requested filename and destination behavior.
- Optional `http://*/*` and `https://*/*`: requested per website only after the user chooses an image from that page; used solely to retrieve that selected image for local processing.

## Assets still required before submission

- 128 × 128 store icon — already included in the extension.
- At least one 1280 × 800 or 640 × 400 screenshot; use 3–5 screenshots.
- Optional 440 × 280 promotional tile.
- A public HTTPS URL containing `PRIVACY.md`.
- Support URL and contact email.

Recommended screenshot sequence: import screen, visual crop, 500 KB target reached, batch queue, privacy/settings screen.

## Final manual checks

Test unpacked in current stable Chrome on Windows with browser languages `en`, `fr`, `es`, `de`, `pt-BR`, and `it`. Verify local files, clipboard, a normal HTTPS image, denied website permission, PNG transparency, exact dimensions, the 500 KB target, batch downloads, AVIF support/fallback, settings export/import, and history deletion.
