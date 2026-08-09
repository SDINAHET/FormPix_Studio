const $ = (id) => document.getElementById(id);
const IS_EMBEDDED = new URLSearchParams(location.search).get("panel") === "embed";
document.body.classList.toggle("embedded", IS_EMBEDDED);
const DEFAULTS = {
  defaultFormat: "none", qualities: { jpeg: 95, webp: 90, avif: 85 }, showCopyPng: true,
  addTimestamp: true, keepHistory: false, saveAs: true, subfolder: "", uiLanguage: "browser", accessMode: "all"
};
const GITHUB_URL = "https://github.com/SDINAHET/FormPix_Studio";
const SUPPORT_URL = `${GITHUB_URL}/issues`;
const STORE_URL = `https://chromewebstore.google.com/detail/${chrome.runtime.id}`;
const IS_PUBLISHED = Boolean(chrome.runtime.getManifest().update_url);
const t = (value) => window.fpTranslate?.(value) || value;
let saveTimer;

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  document.querySelector(`input[name="defaultFormat"][value="${settings.defaultFormat}"]`).checked = true;
  $("jpegQuality").value = settings.qualities.jpeg;
  $("webpQuality").value = settings.qualities.webp;
  $("avifQuality").value = settings.qualities.avif;
  $("jpegQualityValue").textContent = `${settings.qualities.jpeg}%`;
  $("webpQualityValue").textContent = `${settings.qualities.webp}%`;
  $("avifQualityValue").textContent = `${settings.qualities.avif}%`;
  $("showCopyPng").checked = settings.showCopyPng;
  $("addTimestamp").checked = settings.addTimestamp;
  $("keepHistory").checked = settings.keepHistory;
  $("saveAs").checked = settings.saveAs;
  $("subfolder").value = settings.subfolder;
  $("uiLanguage").value = settings.uiLanguage;
  document.querySelector(`input[name="accessMode"][value="${settings.accessMode}"]`).checked = true;
  renderHistory();
}

function collectSettings() {
  return {
    defaultFormat: document.querySelector('input[name="defaultFormat"]:checked').value,
    qualities: { jpeg: Number($("jpegQuality").value), webp: Number($("webpQuality").value), avif: Number($("avifQuality").value) },
    showCopyPng: $("showCopyPng").checked,
    addTimestamp: $("addTimestamp").checked,
    keepHistory: $("keepHistory").checked,
    saveAs: $("saveAs").checked,
    subfolder: $("subfolder").value.trim(),
    uiLanguage: $("uiLanguage").value,
    accessMode: document.querySelector('input[name="accessMode"]:checked').value
  };
}

function scheduleSave() {
  $("jpegQualityValue").textContent = `${$("jpegQuality").value}%`;
  $("webpQualityValue").textContent = `${$("webpQuality").value}%`;
  $("avifQualityValue").textContent = `${$("avifQuality").value}%`;
  $("saveStatus").textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await chrome.storage.sync.set(collectSettings());
    if (!$("keepHistory").checked) await chrome.storage.local.remove("imageDockHistory");
    $("saveStatus").textContent = "Settings saved.";
    renderHistory();
  }, 180);
}

async function renderHistory() {
  const { imageDockHistory = [] } = await chrome.storage.local.get("imageDockHistory");
  const now = Date.now();
  $("totalCount").textContent = imageDockHistory.length;
  $("weekCount").textContent = imageDockHistory.filter((entry) => now - Date.parse(entry.createdAt) <= 7 * 86400000).length;
  $("monthCount").textContent = imageDockHistory.filter((entry) => now - Date.parse(entry.createdAt) <= 30 * 86400000).length;
  const list = $("historyList");
  list.replaceChildren();
  if (!imageDockHistory.length) {
    const p = document.createElement("p"); p.textContent = "No exports yet."; list.append(p); return;
  }
  for (const entry of imageDockHistory.slice(0, 30)) {
    const row = document.createElement("button"); row.type = "button"; row.className = "history-item";
    row.title = entry.downloadId ? "Open with the system image viewer" : "This older entry has no downloadable file reference";
    const details = document.createElement("div");
    const name = document.createElement("strong"); name.textContent = entry.filename;
    const meta = document.createElement("span"); meta.textContent = `${entry.width} × ${entry.height} · ${new Date(entry.createdAt).toLocaleString()}`;
    const size = document.createElement("b"); size.textContent = `${Math.round(entry.size / 1024)} KB`;
    const open = document.createElement("span"); open.className = "history-open"; open.textContent = t(entry.downloadId ? "Open ↗" : "Unavailable");
    details.append(name, meta); row.append(details, size, open); list.append(row);
    row.addEventListener("click", async () => {
      if (!entry.downloadId) return $("saveStatus").textContent = "This older history entry cannot be opened.";
      try { await chrome.downloads.open(entry.downloadId); }
      catch (_error) { $("saveStatus").textContent = "The downloaded file was moved, deleted, or is no longer accessible."; }
    });
  }
}

function downloadJson(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.querySelectorAll("input").forEach((input) => {
  if (input.id !== "settingsFile") input.addEventListener("input", scheduleSave);
});
$("clearHistory").addEventListener("click", async () => { await chrome.storage.local.remove("imageDockHistory"); renderHistory(); });
$("exportSettings").addEventListener("click", () => downloadJson({ app: "FormPix Studio", version: 1, settings: collectSettings() }, "formpix-settings.json"));
$("importSettings").addEventListener("click", () => $("settingsFile").click());
$("settingsFile").addEventListener("change", async () => {
  try {
    const parsed = JSON.parse(await $("settingsFile").files[0].text());
    if (parsed.app !== "FormPix Studio" || !parsed.settings) throw new Error("Invalid FormPix Studio settings file.");
    await chrome.storage.sync.set({ ...DEFAULTS, ...parsed.settings });
    await loadSettings();
    $("saveStatus").textContent = "Settings imported.";
  } catch (error) { $("saveStatus").textContent = error.message; }
});
$("backButton").addEventListener("click", () => {
  if (IS_EMBEDDED) parent.postMessage("formpix:close-settings", location.origin);
  else chrome.tabs.getCurrent((tab) => tab?.id ? chrome.tabs.remove(tab.id) : window.close());
});
$("authorGithub").addEventListener("click", () => chrome.tabs.create({ url: GITHUB_URL }));
$("contactButton").addEventListener("click", () => chrome.tabs.create({ url: "mailto:contact@loto-tracker.fr" }));
$("feedbackButton").addEventListener("click", () => chrome.tabs.create({ url: SUPPORT_URL }));
$("supportButton").addEventListener("click", () => chrome.tabs.create({ url: SUPPORT_URL }));
$("rateButton").addEventListener("click", () => {
  if (!IS_PUBLISHED) return $("saveStatus").textContent = "Rating will be available after Chrome Web Store publication.";
  chrome.tabs.create({ url: `${STORE_URL}/reviews` });
});
$("shareButton").addEventListener("click", async () => {
  const shareUrl = IS_PUBLISHED ? STORE_URL : GITHUB_URL;
  const shareData = { title: "FormPix Studio", text: "Prepare, resize and optimize images locally in Chrome.", url: shareUrl };
  try {
    if (navigator.share) await navigator.share(shareData);
    else { await navigator.clipboard.writeText(shareUrl); $("saveStatus").textContent = "Extension link copied."; }
  } catch (error) {
    if (error.name !== "AbortError") $("saveStatus").textContent = "Unable to share the extension link.";
  }
});
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.imageDockHistory) renderHistory();
});
$("uiLanguage").addEventListener("change", async () => {
  await chrome.storage.sync.set(collectSettings());
  location.reload();
});
document.querySelectorAll('input[name="accessMode"]').forEach((input) => input.addEventListener("change", async () => {
  if (!input.checked) return;
  if (input.value === "all") {
    const granted = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
    if (!granted) document.querySelector('input[name="accessMode"][value="site"]').checked = true;
  } else {
    await chrome.permissions.remove({ origins: ["http://*/*", "https://*/*"] });
  }
  await chrome.storage.sync.set(collectSettings());
}));
loadSettings();
