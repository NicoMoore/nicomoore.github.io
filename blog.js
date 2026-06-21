// Renders the book-blog posts from posts/posts.json.
(async function () {
  const container = document.getElementById("posts");
  const loadingEl = document.getElementById("posts-loading");
  const emptyEl = document.getElementById("posts-empty");

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatBody(text) {
    // Split on blank lines into paragraphs; preserve single newlines as <br>.
    return text
      .split(/\n\s*\n/)
      .map((p) => "<p>" + escapeHtml(p).replace(/\n/g, "<br>") + "</p>")
      .join("");
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  try {
    const res = await fetch("posts/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load posts.json");
    const data = await res.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];

    loadingEl.hidden = true;

    if (posts.length === 0) {
      emptyEl.hidden = false;
      return;
    }

    // Newest first.
    posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const html = posts
      .map((p) => {
        const cover = p.image
          ? `<img class="cover" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)} cover">`
          : `<div class="cover"></div>`;
        const sub = [p.author && `by ${escapeHtml(p.author)}`, formatDate(p.date)]
          .filter(Boolean)
          .join(" &middot; ");
        return `
          <article class="post">
            ${cover}
            <div class="post-body">
              <h2>${escapeHtml(p.title || "Untitled")}</h2>
              <div class="post-meta">${sub}</div>
              <div class="post-text">${formatBody(p.body || "")}</div>
            </div>
          </article>
        `;
      })
      .join("");

    container.insertAdjacentHTML("beforeend", html);
  } catch (err) {
    loadingEl.hidden = true;
    container.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-state">Couldn't load posts: ${err.message}</p>`
    );
  }
})();
