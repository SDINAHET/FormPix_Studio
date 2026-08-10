# FormPix Studio

FormPix Studio is a local-first Chrome extension for preparing images for online forms and web development.

## Current features

- Import by file picker, drag and drop, clipboard paste, or image context menu.
- Convert to JPEG, PNG, WebP, or AVIF with real re-encoding and support detection.
- Preserve PNG/WebP transparency.
- Choose white, transparent, or custom canvas backgrounds.
- Remove a plain white background with an adjustable tolerance and softened edges.
- Resize to exact dimensions or use ready-made presets.
- Fit, stretch, or visually crop by dragging the image in the preview.
- Compare the original and processed image in one click.
- Use presets for forms, Instagram, LinkedIn, YouTube, stories, Open Graph and website hero images.
- Set a maximum file size and automatically optimize quality.
- Apply instant 100 KB, 500 KB or 1 MB targets.
- Optionally reduce dimensions when the target size cannot otherwise be reached.
- Strip EXIF and other source metadata during export.
- Process everything locally without analytics or uploads.
- Configure a default quick format and separate JPEG/WebP/AVIF quality defaults.
- Add context-menu actions for JPG, PNG, WebP and AVIF.
- Choose the native Save As dialog or a dedicated Downloads subfolder.
- Add optional timestamps to exported filenames.
- Export and import settings.
- Keep an optional local export history containing metadata only, never image pixels.
- Refresh history counters and recent exports instantly when a download completes.
- Open a recent downloaded image from history in the operating system's default viewer.
- Author, GitHub, rating, feedback, assistance and share actions in Settings.
- Refresh an already-open side panel immediately when a new webpage image is selected from the context menu.
- Open the side panel and import the clicked webpage image automatically; a newer selection replaces the unsaved preview and wins over slower earlier requests.
- Import and export several images with the same settings in a local batch queue.
- Browser-default or manually selected interface language across the same 20 locales as TuneDock.
- Embedded Settings view that preserves the current unsaved image and changes the gear into a Back arrow.
- Optional one-time access for all websites or remembered permission per website.
- Timestamped filenames enabled by default.
- Stéphane Dinahet and GitHub/SDINAHET identity visible on the main screen.

## Install for testing

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `FormPix-Studio` folder.
5. Click the extension icon to open the editor in Chrome's side panel.

To import an image directly from a webpage, right-click the image and select **Open in FormPix Studio**. Chrome will ask for access only to that image's website when you click **Allow and import**.

## Transparency behavior

- Existing alpha transparency is preserved when exporting PNG or WebP.
- JPEG cannot contain transparency, so FormPix composites transparent pixels on white or the selected custom color.
- AVIF export reports a clear error if the installed Chrome build cannot encode AVIF natively.
- Chrome can use a subfolder inside Downloads, but extensions cannot discover an arbitrary operating-system folder selected in the native dialog.
- **Make a solid background transparent** is intended for images with a plain white background. It is deterministic color removal, not AI background removal. The tolerance control helps preserve anti-aliased edges.

## Technical notes

- Manifest V3.
- No build step and no external dependencies.
- Canvas-based conversion and resizing.
- Optional, per-origin website access for context-menu imports.
