/**
 * Dependency-free static file server for the accessibility e2e suite.
 *
 * Serves the repository root so the demo pages' relative references
 * (../build/ableplayer.dist.js, ../media/*.mp4, demos.css) resolve exactly
 * as they do on a real deployment. Supports single-range requests because
 * Chromium asks for ranges when loading <video> sources.
 *
 * No dependencies on purpose: this must not add anything to package.json
 * beyond the Playwright test tooling itself.
 */
import http from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.A11Y_PORT ?? 8901);
// Loopback only: a test fixture should never expose the repository to the
// local network.
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".vtt": "text/vtt",
  ".srt": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let filePath = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));

    // Never serve outside the repository root. The separator check keeps a
    // sibling directory (…/ableplayer-other) from matching the prefix.
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    let stat = await fs.stat(filePath).catch(() => null);
    if (stat?.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      stat = await fs.stat(filePath).catch(() => null);
    }
    if (!stat) {
      res.writeHead(404).end("Not found");
      return;
    }

    const type = MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
    const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);

    if (range && (range[1] || range[2])) {
      // A suffix range longer than the file (bytes=-N, N > size) clamps to 0
      // rather than producing a negative offset.
      const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
      const end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
      if (start >= stat.size || end >= stat.size || start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
        return;
      }
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
      });
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
    });
    createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`a11y demo server: http://${HOST}:${PORT}/demos/ (root: ${ROOT})`);
});
