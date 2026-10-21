// @flow

const TYPES /*: { [string]: string } */ = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};

export function mimeType(file /*: string */) /*: string */ {
  const lower = file.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) {
    return "application/octet-stream";
  }
  return TYPES[lower.slice(dot)] || "application/octet-stream";
}

export function isTextType(contentType /*: string */) /*: boolean */ {
  return (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("xml") ||
    contentType.includes("javascript") ||
    contentType.includes("svg")
  );
}

export function charsetOf(contentType /*: string */) /*: string */ {
  if (contentType.includes("charset=")) {
    return contentType;
  }
  if (isTextType(contentType)) {
    return contentType + "; charset=utf-8";
  }
  return contentType;
}
