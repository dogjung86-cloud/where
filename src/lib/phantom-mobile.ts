const PHANTOM_DOWNLOAD_URL = "https://phantom.app/download";

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function getPhantomBrowseUrl(targetUrl = window.location.href) {
  const encodedTarget = encodeURIComponent(targetUrl);
  const encodedRef = encodeURIComponent(window.location.origin);

  return `https://phantom.app/ul/browse/${encodedTarget}?ref=${encodedRef}`;
}

export function openPhantomForCurrentPage() {
  if (isMobileBrowser()) {
    window.location.assign(getPhantomBrowseUrl());
    return "mobile";
  }

  window.open(PHANTOM_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
  return "desktop";
}
