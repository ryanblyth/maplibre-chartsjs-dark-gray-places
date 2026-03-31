/**
 * Development server
 * 
 * Serves the map files with proper CORS headers and Range request support.
 * 
 * Usage: npm run serve
 * Optional: PORT=8081 npm run serve
 */

import { createServer } from "http";
import { statSync, createReadStream, existsSync } from "fs";
import { extname, relative, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname);
const PORT = Number(process.env.PORT) || 8080;

/**
 * Map request URL to a file under this project root (no path traversal).
 * @param {string} url
 * @returns {string | null}
 */
function urlToFilePath(url) {
  let pathname = url.split("?")[0] || "/";
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (pathname === "/") {
    pathname = "/preview.html";
  }
  if (pathname === "/favicon.ico") {
    const svgPath = resolve(ROOT, "favicon.svg");
    if (existsSync(svgPath)) {
      return svgPath;
    }
  }
  const withoutLead = pathname.replace(/^\/+/, "");
  if (!withoutLead || withoutLead.includes("\0")) {
    return null;
  }
  const abs = resolve(ROOT, withoutLead);
  const rel = relative(ROOT, abs);
  if (rel.startsWith("..") || rel === "") {
    return null;
  }
  return abs;
}

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pbf": "application/x-protobuf",
  ".pmtiles": "application/x-pmtiles",
};

const server = createServer((req, res) => {
  const filePath = urlToFilePath(req.url || "/");

  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const stat = statSync(filePath);
  const ext = extname(filePath);
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range");
  res.setHeader("Content-Type", mimeType);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

    if (Number.isNaN(start) || start < 0 || start >= stat.size || end < start) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }

    const clampedEnd = Math.min(end, stat.size - 1);
    const chunksize = clampedEnd - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${clampedEnd}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
    });

    const stream = createReadStream(filePath, { start, end: clampedEnd });
    stream.on("error", () => { res.destroy(); });
    stream.pipe(res);
  } else {
    res.writeHead(200, { "Content-Length": stat.size });
    const stream = createReadStream(filePath);
    stream.on("error", () => { res.destroy(); });
    stream.pipe(res);
  }
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use — another process (often an old dev server) is still listening.\n\n` +
        `Free it, then run again:\n` +
        `  lsof -nP -iTCP:${PORT} -sTCP:LISTEN\n` +
        `  kill <PID>     # or: kill $(lsof -ti :${PORT})\n\n` +
        `Or use a different port:\n` +
        `  PORT=8081 npm run serve\n`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`\n🌍 Development server running at http://localhost:${PORT}`);
  console.log(`   Serving files from: ${ROOT}`);
  console.log(`\n   Preview: http://localhost:${PORT}/preview.html\n`);
});
