const $ = (id) => document.getElementById(id);
const ui = {
  emptyState: $("emptyState"), workspace: $("workspace"), fileInput: $("fileInput"),
  chooseButton: $("chooseButton"), pasteButton: $("pasteButton"), replaceButton: $("replaceButton"), resetButton: $("resetButton"), settingsButton: $("settingsButton"), compareButton: $("compareButton"),
  urlImport: $("urlImport"), loadUrlButton: $("loadUrlButton"),
  canvas: $("previewCanvas"), sourceName: $("sourceName"), sourceMeta: $("sourceMeta"), originalSize: $("originalSize"), outputSize: $("outputSize"),
  preset: $("presetSelect"), width: $("widthInput"), height: $("heightInput"), lockRatio: $("lockRatio"),
  backgroundMode: $("backgroundMode"), customColorRow: $("customColorRow"), backgroundColor: $("backgroundColor"), backgroundColorValue: $("backgroundColorValue"),
  removeSolid: $("removeSolidBackground"), toleranceRow: $("toleranceRow"), tolerance: $("toleranceInput"), toleranceValue: $("toleranceValue"), warning: $("transparencyWarning"),
  quality: $("qualityInput"), qualityValue: $("qualityValue"), maxSize: $("maxSizeInput"), strict: $("strictDimensions"), sizeMessage: $("sizeMessage"),
  outputBadge: $("outputBadge"), outputDimensions: $("outputDimensions"), outputDetails: $("outputDetails"), filename: $("filenameInput"),
  download: $("downloadButton"), downloadSize: $("downloadSize"), status: $("statusMessage"), cropHelp: $("cropHelp"),
  batchPanel: $("batchPanel"), batchList: $("batchList"), batchCount: $("batchCount"), downloadAll: $("downloadAllButton")
};

const state = {
  bitmap: null, file: null, sourceUrl: "", format: "image/jpeg", fit: "contain", aspect: 1,
  renderedBlob: null, renderToken: 0, pendingTimer: null, settings: {}, pendingCopy: false,
  batchFiles: [], activeBatchIndex: 0, cropX: .5, cropY: .5, showOriginal: false, cropDrag: null,
  consumingSelectionId: "", importToken: 0
};

const PRESETS = {
  profile: [512, 512], form: [800, 800], fullhd: [1920, 1080],
  youtube: [1280, 720], linkedin: [1200, 627], instagram: [1080, 1080],
  story: [1080, 1920], opengraph: [1200, 630], webhero: [1600, 900]
};
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function prettyBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function safeBaseName(name = "image") {
  return name.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || "image";
}

function setStatus(message = "", error = false) {
  ui.status.textContent = message;
  ui.status.classList.toggle("error", error);
}

function setBusy(busy) {
  ui.download.disabled = busy;
  ui.download.querySelector("span").textContent = busy ? "Processing…" : "Download optimized image";
}

async function loadBlob(blob, name = "image") {
  if (!blob?.type?.startsWith("image/")) throw new Error("Choose a valid image file.");
  if (blob.size > 60 * 1024 * 1024) throw new Error("The image is larger than 60 MB.");
  if (state.bitmap?.close) state.bitmap.close();
  state.bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  state.file = { name, type: blob.type, size: blob.size };
  state.aspect = state.bitmap.width / state.bitmap.height;
  ui.width.value = state.bitmap.width;
  ui.height.value = state.bitmap.height;
  ui.preset.value = "original";
  ui.sourceName.textContent = name;
  ui.sourceMeta.textContent = `${state.bitmap.width} × ${state.bitmap.height} · ${blob.type.replace("image/", "").toUpperCase()}`;
  ui.originalSize.textContent = prettyBytes(blob.size);
  ui.filename.value = safeBaseName(name);
  applySavedQuality();
  ui.emptyState.classList.add("hidden");
  ui.workspace.classList.remove("hidden");
  setStatus();
  scheduleRender(0);
}

async function loadFile(file) {
  try { await loadBlob(file, file.name); }
  catch (error) { setStatus(error.message, true); }
}

async function loadFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith("image/"));
  if (!images.length) return setStatus("Choose at least one image file.", true);
  state.batchFiles = images;
  state.activeBatchIndex = 0;
  renderBatchList();
  await loadFile(images[0]);
}

function renderBatchList() {
  ui.batchPanel.classList.toggle("hidden", state.batchFiles.length < 2);
  ui.batchCount.textContent = `${state.batchFiles.length} images`;
  ui.batchList.replaceChildren();
  state.batchFiles.forEach((file, index) => {
    const row = document.createElement("div"); row.className = `batch-item${index === state.activeBatchIndex ? " active" : ""}`;
    const button = document.createElement("button"); button.type = "button"; button.textContent = file.name;
    button.addEventListener("click", async () => { state.activeBatchIndex = index; state.cropX = state.cropY = .5; renderBatchList(); await loadFile(file); });
    const size = document.createElement("span"); size.textContent = prettyBytes(file.size);
    row.append(button, size); ui.batchList.append(row);
  });
}

async function pasteImage() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((candidate) => candidate.startsWith("image/"));
      if (type) return loadBlob(await item.getType(type), `clipboard-${Date.now()}.${EXTENSIONS[type] || "png"}`);
    }
    throw new Error("No image was found in the clipboard.");
  } catch (error) { setStatus(error.message || "Clipboard permission was denied.", true); }
}

function updateFormatUi() {
  const label = EXTENSIONS[state.format].toUpperCase();
  ui.outputBadge.textContent = label;
  document.querySelectorAll(".format-button").forEach((button) => button.classList.toggle("active", button.dataset.format === state.format));
  const transparencySupported = state.format !== "image/jpeg";
  ui.warning.classList.toggle("hidden", transparencySupported || ui.backgroundMode.value !== "transparent");
  ui.quality.disabled = state.format === "image/png";
  if (!transparencySupported && ui.backgroundMode.value === "transparent") ui.backgroundMode.value = "white";
  const current = safeBaseName(ui.filename.value);
  ui.filename.value = current;
  applySavedQuality();
  scheduleRender();
}

function applySavedQuality() {
  const qualities = state.settings.qualities || { jpeg: 95, webp: 90, avif: 85 };
  const key = EXTENSIONS[state.format] === "jpg" ? "jpeg" : EXTENSIONS[state.format];
  if (qualities[key]) {
    ui.quality.value = qualities[key];
    ui.qualityValue.textContent = `${qualities[key]}%`;
  }
}

function updateDimensions(changed) {
  let width = Math.max(1, Number(ui.width.value) || 1);
  let height = Math.max(1, Number(ui.height.value) || 1);
  if (ui.lockRatio.checked) {
    if (changed === "width") height = Math.max(1, Math.round(width / state.aspect));
    else if (changed === "height") width = Math.max(1, Math.round(height * state.aspect));
  }
  ui.width.value = Math.min(12000, width);
  ui.height.value = Math.min(12000, height);
  ui.preset.value = "custom";
  scheduleRender();
}

function choosePreset(value) {
  if (!state.bitmap) return;
  if (value === "original") {
    ui.width.value = state.bitmap.width;
    ui.height.value = state.bitmap.height;
  } else if (PRESETS[value]) {
    [ui.width.value, ui.height.value] = PRESETS[value];
  }
  scheduleRender();
}

function getBackground() {
  if (state.format === "image/jpeg" && ui.backgroundMode.value === "transparent") return "#ffffff";
  if (ui.backgroundMode.value === "white") return "#ffffff";
  if (ui.backgroundMode.value === "custom") return ui.backgroundColor.value;
  return null;
}

function drawSource(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: ui.removeSolid.checked });
  context.clearRect(0, 0, width, height);
  const background = getBackground();
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  const sourceWidth = state.bitmap.width;
  const sourceHeight = state.bitmap.height;
  let dx = 0, dy = 0, dw = width, dh = height;
  if (state.fit !== "stretch") {
    const scale = state.fit === "cover"
      ? Math.max(width / sourceWidth, height / sourceHeight)
      : Math.min(width / sourceWidth, height / sourceHeight);
    dw = sourceWidth * scale;
    dh = sourceHeight * scale;
    dx = state.fit === "cover" ? (width - dw) * state.cropX : (width - dw) / 2;
    dy = state.fit === "cover" ? (height - dh) * state.cropY : (height - dh) / 2;
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(state.bitmap, dx, dy, dw, dh);
  if (ui.removeSolid.checked && state.format !== "image/jpeg") removeBackground(context, width, height);
  return context;
}

function removeBackground(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const tolerance = Number(ui.tolerance.value);
  const threshold = tolerance * 4.42;
  const softness = Math.max(8, threshold * .42);
  for (let i = 0; i < data.length; i += 4) {
    const distance = Math.sqrt((255 - data[i]) ** 2 + (255 - data[i + 1]) ** 2 + (255 - data[i + 2]) ** 2);
    if (distance <= threshold) data[i + 3] = 0;
    else if (distance < threshold + softness) data[i + 3] = Math.round(255 * (distance - threshold) / softness);
  }
  context.putImageData(imageData, 0, 0);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (!blob || blob.type !== type) reject(new Error(`${EXTENSIONS[type]?.toUpperCase() || type} encoding is not available in this Chrome version.`));
    else resolve(blob);
  }, type, quality));
}

async function encodeWithinLimit(width, height) {
  const maxBytes = Math.max(0, Number(ui.maxSize.value) || 0) * 1024;
  const strict = ui.strict.checked;
  const requestedQuality = Number(ui.quality.value) / 100;
  let workingWidth = width;
  let workingHeight = height;
  let best = null;

  for (let resizePass = 0; resizePass < 8; resizePass++) {
    const canvas = document.createElement("canvas");
    drawSource(canvas, workingWidth, workingHeight);
    if (!maxBytes) return { blob: await canvasToBlob(canvas, state.format, requestedQuality), canvas, width: workingWidth, height: workingHeight, quality: requestedQuality };

    if (state.format === "image/png") {
      const blob = await canvasToBlob(canvas, state.format);
      best = { blob, canvas, width: workingWidth, height: workingHeight, quality: 1 };
      if (blob.size <= maxBytes || strict) return best;
    } else {
      let low = .25;
      let high = requestedQuality;
      let smallest = null;
      for (let attempt = 0; attempt < 9; attempt++) {
        const quality = (low + high) / 2;
        const blob = await canvasToBlob(canvas, state.format, quality);
        if (!smallest || blob.size < smallest.blob.size) smallest = { blob, canvas, width: workingWidth, height: workingHeight, quality };
        if (blob.size <= maxBytes) {
          best = { blob, canvas, width: workingWidth, height: workingHeight, quality };
          low = quality;
        } else high = quality;
      }
      if (best?.blob.size <= maxBytes || strict) {
        if (!best || best.width !== workingWidth) {
          const blob = await canvasToBlob(canvas, state.format, .25);
          best = { blob, canvas, width: workingWidth, height: workingHeight, quality: .25 };
        }
        return best;
      }
      best = smallest;
    }
    const ratio = Math.min(.9, Math.sqrt(maxBytes / best.blob.size) * .96);
    workingWidth = Math.max(1, Math.round(workingWidth * ratio));
    workingHeight = Math.max(1, Math.round(workingHeight * ratio));
  }
  return best;
}

async function render() {
  if (!state.bitmap) return;
  const token = ++state.renderToken;
  setBusy(true);
  try {
    const width = Math.min(12000, Math.max(1, Number(ui.width.value) || state.bitmap.width));
    const height = Math.min(12000, Math.max(1, Number(ui.height.value) || state.bitmap.height));
    const result = await encodeWithinLimit(width, height);
    if (token !== state.renderToken) return;
    state.renderedBlob = result.blob;
    const previewMax = 1200;
    const previewScale = Math.min(1, previewMax / Math.max(result.width, result.height));
    if (state.showOriginal) drawOriginalPreview();
    else drawSource(ui.canvas, Math.max(1, Math.round(result.width * previewScale)), Math.max(1, Math.round(result.height * previewScale)));
    ui.outputSize.textContent = prettyBytes(result.blob.size);
    ui.downloadSize.textContent = prettyBytes(result.blob.size);
    ui.outputDimensions.textContent = `${result.width} × ${result.height} px`;
    ui.outputDetails.textContent = `${EXTENSIONS[state.format].toUpperCase()} · quality ${Math.round(result.quality * 100)}% · metadata removed`;
    const maxBytes = Number(ui.maxSize.value) * 1024;
    if (maxBytes && result.blob.size > maxBytes) {
      ui.sizeMessage.textContent = ui.strict.checked
        ? `The requested limit cannot be reached without reducing dimensions (${prettyBytes(result.blob.size)}).`
        : `Closest result: ${prettyBytes(result.blob.size)}.`;
    } else if (maxBytes) ui.sizeMessage.textContent = `Target reached with the best available quality.`;
    else ui.sizeMessage.textContent = "Add a limit when a form imposes a maximum file size.";
    setStatus();
  } catch (error) {
    state.renderedBlob = null;
    setStatus(error.message, true);
  } finally {
    if (token === state.renderToken) setBusy(false);
  }
}

function drawOriginalPreview() {
  const max = 1200;
  const scale = Math.min(1, max / Math.max(state.bitmap.width, state.bitmap.height));
  ui.canvas.width = Math.max(1, Math.round(state.bitmap.width * scale));
  ui.canvas.height = Math.max(1, Math.round(state.bitmap.height * scale));
  const context = ui.canvas.getContext("2d");
  context.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
  context.drawImage(state.bitmap, 0, 0, ui.canvas.width, ui.canvas.height);
}

function scheduleRender(delay = 180) {
  clearTimeout(state.pendingTimer);
  state.pendingTimer = setTimeout(render, delay);
}

async function downloadResult() {
  if (!state.renderedBlob) return;
  const extension = EXTENSIONS[state.format];
  const timestamp = state.settings.addTimestamp ? `-${new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15)}` : "";
  const filename = `${safeBaseName(ui.filename.value)}${timestamp}.${extension}`;
  const url = URL.createObjectURL(state.renderedBlob);
  const subfolder = String(state.settings.subfolder || "").replace(/(^[\\/]+|[\\/]+$|\.\.)/g, "").replace(/[<>:"|?*]/g, "-");
  const downloadName = subfolder ? `${subfolder}/${filename}` : filename;
  try {
    const downloadId = await chrome.downloads.download({ url, filename: downloadName, saveAs: Boolean(state.settings.saveAs), conflictAction: "uniquify" });
    await recordHistory(filename, downloadId);
    setStatus(`Saved ${filename}`);
  } catch (error) {
    setStatus(error.message || "Download failed.", true);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

async function downloadAll() {
  if (state.batchFiles.length < 2) return downloadResult();
  const originalIndex = state.activeBatchIndex;
  ui.downloadAll.disabled = true;
  for (let index = 0; index < state.batchFiles.length; index++) {
    state.activeBatchIndex = index;
    renderBatchList();
    await loadFile(state.batchFiles[index]);
    clearTimeout(state.pendingTimer);
    await render();
    await downloadResult();
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  state.activeBatchIndex = originalIndex;
  await loadFile(state.batchFiles[originalIndex]);
  renderBatchList();
  ui.downloadAll.disabled = false;
  setStatus(`${state.batchFiles.length} images processed.`);
}

async function copyResultAsPng() {
  if (!state.bitmap) return;
  const canvas = document.createElement("canvas");
  drawSource(canvas, Number(ui.width.value), Number(ui.height.value));
  const blob = await canvasToBlob(canvas, "image/png");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  setStatus("PNG copied to the clipboard.");
}

async function recordHistory(filename, downloadId) {
  if (!state.settings.keepHistory || !state.renderedBlob) return;
  const { imageDockHistory = [] } = await chrome.storage.local.get("imageDockHistory");
  imageDockHistory.unshift({
    id: crypto.randomUUID(), filename, createdAt: new Date().toISOString(),
    source: state.sourceUrl || "local file", format: EXTENSIONS[state.format],
    width: Number(ui.width.value), height: Number(ui.height.value), size: state.renderedBlob.size,
    downloadId
  });
  await chrome.storage.local.set({ imageDockHistory: imageDockHistory.slice(0, 200) });
}

async function importPendingUrl() {
  if (await consumePendingImage()) return;
  const { pendingImageUrl = "", pendingImageFormat = "", pendingCopyPng = false, pendingImageError = "" } = await chrome.storage.session.get(["pendingImageUrl", "pendingImageFormat", "pendingCopyPng", "pendingImageError"]);
  if (!pendingImageUrl) return;
  state.sourceUrl = pendingImageUrl;
  state.pendingCopy = pendingCopyPng;
  if (pendingImageFormat) {
    state.format = pendingImageFormat === "jpeg" ? "image/jpeg" : `image/${pendingImageFormat}`;
    updateFormatUi();
  }
  ui.urlImport.classList.remove("hidden");
  setStatus(pendingImageError || "Loading the selected image…");
}

async function consumePendingImage() {
  const pending = await chrome.storage.session.get(["pendingSelectionId", "pendingImageUrl", "pendingImageFormat", "pendingCopyPng", "pendingImageDataUrl"]);
  if (!pending.pendingImageDataUrl || !pending.pendingImageUrl) return false;
  if (state.consumingSelectionId === pending.pendingSelectionId) return true;
  state.consumingSelectionId = pending.pendingSelectionId;
  const importToken = ++state.importToken;
  try {
    state.sourceUrl = pending.pendingImageUrl;
    state.pendingCopy = pending.pendingCopyPng;
    if (pending.pendingImageFormat) {
      state.format = pending.pendingImageFormat === "jpeg" ? "image/jpeg" : `image/${pending.pendingImageFormat}`;
      updateFormatUi();
    }
    const url = new URL(pending.pendingImageUrl);
    const blob = await (await fetch(pending.pendingImageDataUrl)).blob();
    if (importToken !== state.importToken) return true;
    const pathName = decodeURIComponent(url.pathname.split("/").pop() || "web-image");
    state.batchFiles = [];
    state.activeBatchIndex = 0;
    state.cropX = state.cropY = .5;
    renderBatchList();
    await loadBlob(blob, pathName);
    const latest = await chrome.storage.session.get("pendingSelectionId");
    if (latest.pendingSelectionId === pending.pendingSelectionId) {
      await chrome.storage.session.remove(["pendingSelectionId", "pendingImageUrl", "pendingImageFormat", "pendingCopyPng", "pendingImageDataUrl", "pendingImageError"]);
    }
    ui.urlImport.classList.add("hidden");
    if (state.pendingCopy) {
      state.pendingCopy = false;
      await copyResultAsPng();
    }
    return true;
  } catch (error) {
    setStatus(error.message || "Unable to open the selected image.", true);
    return false;
  } finally {
    if (state.consumingSelectionId === pending.pendingSelectionId) state.consumingSelectionId = "";
  }
}

async function loadPendingUrl() {
  try {
    const url = new URL(state.sourceUrl);
    let blob;
    if (url.protocol === "data:") {
      blob = await (await fetch(state.sourceUrl)).blob();
    } else {
      if (url.protocol === "blob:") throw new Error("Chrome cannot reopen this temporary page image. Download it, drag it here, or paste it from the clipboard.");
      const originPattern = `${url.protocol}//${url.host}/*`;
      const granted = await chrome.permissions.request({ origins: [originPattern] });
      if (!granted) throw new Error("Website access was not granted.");
      const response = await chrome.runtime.sendMessage({ type: "formpix:fetch-image", url: state.sourceUrl });
      if (!response?.ok) throw new Error(response?.error || "Unable to load this image.");
      blob = await (await fetch(response.dataUrl)).blob();
    }
    const pathName = decodeURIComponent(url.pathname.split("/").pop() || "web-image");
    await loadBlob(blob, pathName);
    state.batchFiles = [];
    renderBatchList();
    await chrome.storage.session.remove(["pendingSelectionId", "pendingImageUrl", "pendingImageFormat", "pendingCopyPng", "pendingImageDataUrl", "pendingImageError"]);
    ui.urlImport.classList.add("hidden");
    if (state.pendingCopy) {
      state.pendingCopy = false;
      setTimeout(() => copyResultAsPng().catch((error) => setStatus(error.message, true)), 250);
    }
  } catch (error) { setStatus(error.message, true); }
}

function reset() {
  if (state.bitmap?.close) state.bitmap.close();
  Object.assign(state, { bitmap: null, file: null, renderedBlob: null });
  ui.workspace.classList.add("hidden");
  ui.emptyState.classList.remove("hidden");
  ui.fileInput.value = "";
  setStatus();
}

ui.chooseButton.addEventListener("click", () => ui.fileInput.click());
ui.replaceButton.addEventListener("click", () => ui.fileInput.click());
ui.fileInput.addEventListener("change", () => ui.fileInput.files.length && loadFiles(ui.fileInput.files));
ui.pasteButton.addEventListener("click", pasteImage);
ui.resetButton.addEventListener("click", reset);
ui.settingsButton.addEventListener("click", () => {
  const frame = $("settingsFrame");
  const opening = frame.classList.contains("hidden");
  frame.classList.toggle("hidden", !opening);
  ui.settingsButton.textContent = opening ? "←" : "⚙";
  ui.settingsButton.title = opening ? "Back to FormPix Studio" : "Settings";
  ui.settingsButton.setAttribute("aria-label", ui.settingsButton.title);
});
$("mainAuthorButton").addEventListener("click", () => chrome.tabs.create({ url: "https://github.com/SDINAHET/FormPix_Studio" }));
window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.data !== "formpix:close-settings") return;
  $("settingsFrame").classList.add("hidden");
  ui.settingsButton.textContent = "⚙";
  ui.settingsButton.title = "Settings";
  ui.settingsButton.setAttribute("aria-label", "Settings");
});
ui.loadUrlButton.addEventListener("click", loadPendingUrl);
ui.download.addEventListener("click", downloadResult);
ui.downloadAll.addEventListener("click", downloadAll);
ui.compareButton.addEventListener("click", () => {
  state.showOriginal = !state.showOriginal;
  ui.compareButton.textContent = state.showOriginal ? "Show output" : "Show original";
  if (state.showOriginal) drawOriginalPreview(); else scheduleRender(0);
});

for (const eventName of ["dragenter", "dragover"]) ui.emptyState.addEventListener(eventName, (event) => { event.preventDefault(); ui.emptyState.classList.add("dragover"); });
for (const eventName of ["dragleave", "drop"]) ui.emptyState.addEventListener(eventName, (event) => { event.preventDefault(); ui.emptyState.classList.remove("dragover"); });
ui.emptyState.addEventListener("drop", (event) => event.dataTransfer.files.length && loadFiles(event.dataTransfer.files));
document.addEventListener("paste", (event) => {
  const file = [...event.clipboardData.items].find((item) => item.type.startsWith("image/"))?.getAsFile();
  if (file) loadFile(file);
});

document.querySelectorAll(".format-button").forEach((button) => button.addEventListener("click", () => { state.format = button.dataset.format; updateFormatUi(); }));
document.querySelectorAll("[data-fit]").forEach((button) => button.addEventListener("click", () => {
  state.fit = button.dataset.fit;
  document.querySelectorAll("[data-fit]").forEach((item) => item.classList.toggle("active", item === button));
  ui.canvas.classList.toggle("crop-active", state.fit === "cover");
  ui.cropHelp.classList.toggle("hidden", state.fit !== "cover");
  scheduleRender();
}));
ui.preset.addEventListener("change", () => choosePreset(ui.preset.value));
ui.width.addEventListener("input", () => updateDimensions("width"));
ui.height.addEventListener("input", () => updateDimensions("height"));
ui.backgroundMode.addEventListener("change", () => { ui.customColorRow.classList.toggle("hidden", ui.backgroundMode.value !== "custom"); updateFormatUi(); });
ui.backgroundColor.addEventListener("input", () => { ui.backgroundColorValue.textContent = ui.backgroundColor.value.toUpperCase(); scheduleRender(); });
ui.removeSolid.addEventListener("change", () => { ui.toleranceRow.classList.toggle("hidden", !ui.removeSolid.checked); scheduleRender(); });
ui.tolerance.addEventListener("input", () => { ui.toleranceValue.textContent = ui.tolerance.value; scheduleRender(); });
ui.quality.addEventListener("input", () => { ui.qualityValue.textContent = `${ui.quality.value}%`; scheduleRender(); });
ui.maxSize.addEventListener("input", () => scheduleRender());
ui.strict.addEventListener("change", () => scheduleRender());
document.querySelectorAll("[data-limit]").forEach((button) => button.addEventListener("click", () => {
  ui.maxSize.value = Number(button.dataset.limit) || "";
  scheduleRender(0);
}));

ui.canvas.addEventListener("pointerdown", (event) => {
  if (state.fit !== "cover" || state.showOriginal) return;
  ui.canvas.setPointerCapture(event.pointerId);
  state.cropDrag = { x: event.clientX, y: event.clientY, cropX: state.cropX, cropY: state.cropY };
});
ui.canvas.addEventListener("pointermove", (event) => {
  if (!state.cropDrag) return;
  const rect = ui.canvas.getBoundingClientRect();
  state.cropX = Math.max(0, Math.min(1, state.cropDrag.cropX - (event.clientX - state.cropDrag.x) / rect.width));
  state.cropY = Math.max(0, Math.min(1, state.cropDrag.cropY - (event.clientY - state.cropDrag.y) / rect.height));
  scheduleRender(0);
});
for (const eventName of ["pointerup", "pointercancel"]) ui.canvas.addEventListener(eventName, () => { state.cropDrag = null; });

async function initialize() {
  state.settings = await chrome.storage.sync.get({
    defaultFormat: "none", qualities: { jpeg: 95, webp: 90, avif: 85 }, addTimestamp: true,
    keepHistory: false, showCopyPng: true, saveAs: true, subfolder: ""
  });
  if (state.settings.defaultFormat !== "none") {
    state.format = state.settings.defaultFormat === "jpeg" ? "image/jpeg" : `image/${state.settings.defaultFormat}`;
    updateFormatUi();
  }
  await importPendingUrl();
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    for (const [key, change] of Object.entries(changes)) state.settings[key] = change.newValue;
  }
  if (areaName === "session" && (changes.pendingImageUrl?.newValue || changes.pendingImageDataUrl?.newValue || changes.pendingImageError?.newValue)) {
    if (changes.pendingImageUrl?.newValue) {
      state.importToken++;
      state.consumingSelectionId = "";
    }
    importPendingUrl().catch((error) => setStatus(error.message, true));
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "formpix:image-ready") consumePendingImage().catch((error) => setStatus(error.message, true));
  if (message?.type === "formpix:image-error") setStatus(message.error || "Unable to load the selected image.", true);
});

initialize();
