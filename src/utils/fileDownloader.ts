/**
 * Safely downloads a file or triggers external download without corrupting binary data.
 * Works inside sandboxed iframes, handles Content-Disposition headers,
 * guards against HTML error fallbacks, and cleans up blob URLs.
 */
export async function downloadSoftwareFile(url: string, defaultFileName: string): Promise<void> {
  // If it's an external URL (http/https not pointing to our /api), open cleanly in a new tab without <a download> attribute
  // (which would cause Chromium to save redirect text)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // Fetch the binary file with same-origin headers
  const response = await fetch(url);
  if (!response.ok) {
    let errorDetail = `Download failed with HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorDetail = errJson.error;
    } catch {
      // non-json response
    }
    throw new Error(errorDetail);
  }

  // Guard against HTML error / SPA fallback
  const contentType = response.headers.get("content-type") || "";
  if (contentType.toLowerCase().includes("text/html")) {
    throw new Error("File not found on server or invalid response returned.");
  }

  // Extract clean filename from Content-Disposition if provided
  let filename = defaultFileName;
  const disposition = response.headers.get("content-disposition");
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
      try {
        filename = decodeURIComponent(utf8Match[1]);
      } catch {
        filename = utf8Match[1];
      }
    } else {
      const quotedMatch = disposition.match(/filename="([^"]+)"/i);
      if (quotedMatch && quotedMatch[1]) {
        filename = quotedMatch[1];
      } else {
        const simpleMatch = disposition.match(/filename=([^;]+)/i);
        if (simpleMatch && simpleMatch[1]) {
          filename = simpleMatch[1].trim();
        }
      }
    }
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("Downloaded file is empty (0 bytes).");
  }

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up
  setTimeout(() => {
    try {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(blobUrl);
    } catch {
      // ignore
    }
  }, 30000);
}
