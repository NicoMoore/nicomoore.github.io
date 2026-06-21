// Local dev server for the personal website.
//
// What it does:
//   - Serves the static site (index.html, blog, etc.) at http://localhost:3000/
//   - Hosts a local-only admin UI at http://localhost:3000/admin/
//   - Exposes a small REST API the admin UI uses to add/remove book posts
//
// What ships to GitHub Pages: only the static files in this repo.
// The admin UI lives in `_local/` which is gitignored and never deployed.
//
// Zero dependencies — pure Node built-ins.

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const LOCAL_DIR = path.join(ROOT, "_local");
const POSTS_FILE = path.join(ROOT, "posts", "posts.json");
const IMAGES_DIR = path.join(ROOT, "posts", "images");
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

// ---------- helpers ----------
function send(res, status, body, headers = {}) {
  const isString = typeof body === "string" || Buffer.isBuffer(body);
  const data = isString ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type":
      headers["Content-Type"] ||
      (isString ? "text/plain; charset=utf-8" : "application/json; charset=utf-8"),
    "Content-Length": Buffer.byteLength(data),
    ...headers,
  });
  res.end(data);
}

async function readJsonBody(req, maxBytes = 25 * 1024 * 1024) {
  const chunks = [];
  let received = 0;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > maxBytes) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function safeResolve(baseDir, requestedPath) {
  const cleaned = path.normalize(requestedPath || "").replace(/^[\\/]+/, "");
  const abs = path.resolve(baseDir, cleaned);
  if (abs !== baseDir && !abs.startsWith(baseDir + path.sep)) {
    throw new Error("Path escapes allowed directory");
  }
  return abs;
}

async function serveFile(res, absPath) {
  try {
    const data = await fs.readFile(absPath);
    const ext = path.extname(absPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    send(res, 404, "Not found");
  }
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function readPosts() {
  try {
    const raw = await fs.readFile(POSTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.posts) ? parsed.posts : [];
  } catch {
    return [];
  }
}

async function writePosts(posts) {
  await fs.mkdir(path.dirname(POSTS_FILE), { recursive: true });
  await fs.writeFile(POSTS_FILE, JSON.stringify({ posts }, null, 2) + "\n", "utf8");
}

// dataUrl looks like: "data:image/jpeg;base64,/9j/4AAQ..."
function parseDataUrl(dataUrl) {
  const match = /^data:([\w./+-]+);base64,(.+)$/i.exec(dataUrl || "");
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = (
    {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
    }[mime] || ""
  );
  if (!ext) return null;
  return { ext, buffer: Buffer.from(match[2], "base64") };
}

// ---------- API ----------
async function handleApi(req, res, url) {
  const route = url.pathname;
  const method = req.method;

  try {
    if (route === "/api/posts" && method === "GET") {
      const posts = await readPosts();
      return send(res, 200, { posts });
    }

    if (route === "/api/posts" && method === "POST") {
      const body = await readJsonBody(req);
      const title = String(body.title || "").trim();
      const author = String(body.author || "").trim();
      const date = String(body.date || "").trim() || new Date().toISOString().slice(0, 10);
      const text = String(body.body || "").trim();

      if (!title) return send(res, 400, { error: "Title is required" });
      if (!text) return send(res, 400, { error: "Some thoughts are required" });

      const posts = await readPosts();
      const baseSlug = slugify(`${date}-${title}`) || `post-${Date.now()}`;
      let id = baseSlug;
      let n = 2;
      while (posts.some((p) => p.id === id)) {
        id = `${baseSlug}-${n++}`;
      }

      let imageRelPath = "";
      if (body.imageDataUrl) {
        const parsed = parseDataUrl(body.imageDataUrl);
        if (!parsed) return send(res, 400, { error: "Unsupported image type" });
        await fs.mkdir(IMAGES_DIR, { recursive: true });
        const filename = `${id}${parsed.ext}`;
        await fs.writeFile(path.join(IMAGES_DIR, filename), parsed.buffer);
        imageRelPath = `posts/images/${filename}`;
      }

      const newPost = { id, title, author, date, image: imageRelPath, body: text };
      posts.push(newPost);
      await writePosts(posts);
      return send(res, 200, { post: newPost });
    }

    if (route.startsWith("/api/posts/") && method === "DELETE") {
      const id = decodeURIComponent(route.slice("/api/posts/".length));
      const posts = await readPosts();
      const idx = posts.findIndex((p) => p.id === id);
      if (idx === -1) return send(res, 404, { error: "Post not found" });
      const [removed] = posts.splice(idx, 1);
      if (removed.image) {
        const abs = path.join(ROOT, removed.image);
        try {
          if (abs.startsWith(IMAGES_DIR + path.sep)) {
            await fs.rm(abs, { force: true });
          }
        } catch {
          /* ignore image-delete failures */
        }
      }
      await writePosts(posts);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: "Unknown endpoint" });
  } catch (err) {
    return send(res, 400, { error: err.message });
  }
}

// ---------- request router ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    return handleApi(req, res, url);
  }

  // Local-only admin UI, served from _local/ (gitignored).
  if (pathname === "/admin" || pathname === "/admin/") {
    return serveFile(res, path.join(LOCAL_DIR, "index.html"));
  }
  if (pathname.startsWith("/admin/")) {
    try {
      const abs = safeResolve(LOCAL_DIR, pathname.slice("/admin/".length));
      return serveFile(res, abs);
    } catch {
      return send(res, 403, "Forbidden");
    }
  }

  // Prevent the static handler from exposing _local via /<filename>.
  if (pathname.startsWith("/_local")) {
    return send(res, 404, "Not found");
  }

  // Static site files.
  const target = pathname === "/" ? "index.html" : pathname.slice(1);
  try {
    const abs = safeResolve(ROOT, target);
    return serveFile(res, abs);
  } catch {
    return send(res, 403, "Forbidden");
  }
});

server.listen(PORT, () => {
  console.log(`Site:  http://localhost:${PORT}/`);
  console.log(`Admin: http://localhost:${PORT}/admin/`);
});
