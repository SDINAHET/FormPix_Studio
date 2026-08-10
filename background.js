const MENU_ID = "formpix-open-image";
const FORMAT_MENU = "formpix-formats";
const FORMATS = [
  ["jpeg", "JPG"], ["png", "PNG"], ["webp", "WebP"], ["avif", "AVIF"]
];
const msg = (key, fallback, substitutions) => chrome.i18n.getMessage(key, substitutions) || fallback;
let cachedAccessMode = "all";
chrome.storage.sync.get({ accessMode: "all" }).then((settings) => { cachedAccessMode = settings.accessMode; });

chrome.runtime.onInstalled.addListener(() => {
  rebuildMenus();
});

chrome.runtime.onStartup.addListener(rebuildMenus);

async function rebuildMenus() {
  const { defaultFormat = "none", showCopyPng = true } = await chrome.storage.sync.get({ defaultFormat: "none", showCopyPng: true });
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: MENU_ID, title: msg("menuOpen", "Open in FormPix Studio"), contexts: ["image"] });
  if (defaultFormat !== "none") {
    const label = FORMATS.find(([value]) => value === defaultFormat)?.[1] || defaultFormat.toUpperCase();
    chrome.contextMenus.create({ id: "formpix-quick", title: msg("menuQuick", `Prepare quickly as ${label}`, [label]), contexts: ["image"] });
  }
  chrome.contextMenus.create({ id: FORMAT_MENU, title: msg("menuPrepare", "Prepare image as…"), contexts: ["image"] });
  for (const [value, label] of FORMATS) {
    chrome.contextMenus.create({ id: `formpix-format-${value}`, parentId: FORMAT_MENU, title: label, contexts: ["image"] });
  }
  if (showCopyPng) chrome.contextMenus.create({ id: "formpix-copy-png", title: msg("menuCopyPng", "Open and copy as PNG"), contexts: ["image"] });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.defaultFormat || changes.showCopyPng)) rebuildMenus();
  if (area === "sync" && changes.accessMode) cachedAccessMode = changes.accessMode.newValue || "all";
});

async function openExtensionPanel() {
  return chrome.sidebarAction.open();
}

chrome.action.onClicked.addListener(() => chrome.sidebarAction.open());

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!String(info.menuItemId).startsWith("formpix-") || !info.srcUrl || !tab?.id) return;
  const selectionId = crypto.randomUUID();
  const openPanelPromise = openExtensionPanel(tab.id);
  let permissionPromise = Promise.resolve(true);
  try {
    const selectedUrl = new URL(info.srcUrl);
    if (selectedUrl.protocol === "http:" || selectedUrl.protocol === "https:") {
      const origins = cachedAccessMode === "all"
        ? ["http://*/*", "https://*/*"]
        : [`${selectedUrl.protocol}//${selectedUrl.host}/*`];
      permissionPromise = chrome.permissions.request({ origins });
    }
  } catch (_error) {}
  const settings = await chrome.storage.sync.get({ defaultFormat: "none", accessMode: "all" });
  let requestedFormat = "";
  if (info.menuItemId === "formpix-quick") requestedFormat = settings.defaultFormat;
  else if (String(info.menuItemId).startsWith("formpix-format-")) requestedFormat = String(info.menuItemId).replace("formpix-format-", "");
  else if (info.menuItemId === "formpix-copy-png") requestedFormat = "png";
  await chrome.storage.session.remove(["pendingImageDataUrl", "pendingImageError"]);
  await chrome.storage.session.set({
    pendingSelectionId: selectionId,
    pendingImageUrl: info.srcUrl,
    pendingImageFormat: requestedFormat,
    pendingCopyPng: info.menuItemId === "formpix-copy-png"
  });
  await openPanelPromise;
  try {
    const granted = await permissionPromise;
    if (!granted) {
      await chrome.storage.session.set({ pendingImageError: "Website access was not granted. Use Allow and import in the panel." });
      return;
    }
    const data = await fetchImage(info.srcUrl);
    const current = await chrome.storage.session.get("pendingSelectionId");
    if (current.pendingSelectionId !== selectionId) return;
    await chrome.storage.session.set({ pendingImageDataUrl: data.dataUrl });
    chrome.runtime.sendMessage({ type: "formpix:image-ready", selectionId }).catch(() => {});
  } catch (error) {
    const current = await chrome.storage.session.get("pendingSelectionId");
    if (current.pendingSelectionId === selectionId) {
      await chrome.storage.session.set({ pendingImageError: error.message });
      chrome.runtime.sendMessage({ type: "formpix:image-error", error: error.message }).catch(() => {});
    }
  }
});

async function fetchImage(url) {
  const response = await fetch(url, { credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("The URL did not return an image");
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { dataUrl: `data:${blob.type};base64,${btoa(binary)}`, type: blob.type, size: blob.size };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "formpix:fetch-image") return false;
  (async () => {
    try {
      sendResponse({ ok: true, ...await fetchImage(message.url) });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();
  return true;
});
