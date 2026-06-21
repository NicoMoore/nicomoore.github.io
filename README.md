# My Website

A personal site with a home page, experiences, a book blog you can update from
a local admin form, and a podcast link. Built as a static site so it can be
hosted free on GitHub Pages.

Zero npm dependencies &mdash; everything is plain HTML, CSS, vanilla JS, and
Node built-ins.

## How it's organized

```
my-website/
├── index.html          # Home / intro
├── experiences.html    # Your background
├── blog.html           # Book blog (loads posts from posts/posts.json)
├── styles.css
├── site.js             # Shared logic (footer year, podcast link)
├── blog.js             # Renders the blog page from posts.json
├── posts/
│   ├── posts.json      # All book posts as JSON
│   └── images/         # Book cover images
├── server.js           # Local dev server (Node)
├── package.json
├── .nojekyll           # Tells GitHub Pages to serve files as-is
└── _local/             # GITIGNORED — admin form, never deployed
    ├── index.html
    └── admin.js
```

The folder `_local/` is in `.gitignore`. It contains the admin form and is
never pushed to GitHub, so it only exists on your PC.

## Running locally

```powershell
cd C:\Users\nmoore\projects\my-website
node server.js
```

Then open:

- **Site:** http://localhost:3000/
- **Admin:** http://localhost:3000/admin/

## Adding a book post

1. Start the server (`node server.js`).
2. Go to http://localhost:3000/admin/.
3. Fill in title, author, date, an optional cover image, and your thoughts.
4. Click **Save post**.
5. The post is written to `posts/posts.json` and the image to
   `posts/images/`. Reload `http://localhost:3000/blog.html` to see it.
6. To publish, push the new files to GitHub (see below).

## Editing other content

- **Home intro:** edit `index.html` (the `.hero` section).
- **Experiences:** edit `experiences.html`. Copy/paste `<article class="experience">`
  blocks to add more entries.
- **Podcast link:** open `site.js` and change the `PODCAST_URL` constant.
- **Your name:** the brand text in the header is hard-coded as "Nathan Moore"
  in each HTML file's header &mdash; change it there. The footer year auto-fills.

## Publishing to GitHub Pages

You don't have a GitHub repo yet. When you're ready:

1. Create a new repo on github.com (e.g. `nmoore.github.io` for a user site,
   or any name for a project site).
2. From this folder:
   ```powershell
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```
3. On github.com, go to **Settings → Pages** and set the source to the `main`
   branch, root folder.
4. Wait a minute. Your site is live.

After that, publishing a new post is:

```powershell
git add posts/
git commit -m "Add book post"
git push
```

GitHub Pages rebuilds within a minute.

## Notes

- The admin form only works while the local server is running. The public
  site is read-only.
- `_local/` (the admin UI) is gitignored. If you want to back it up or move
  it between machines, copy the folder manually.
- Images are saved with the post's slug as the filename, so `Test Book` on
  `2026-06-20` becomes `posts/images/2026-06-20-test-book.png`.
