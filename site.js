// Shared logic for every public page.
(function () {
  // Stamp current year in the footer.
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Wire up the podcast link. Edit PODCAST_URL below to point at your show.
  const PODCAST_URL = "https://example.com/podcast"; // TODO: replace with your podcast URL
  const podcastEl = document.getElementById("podcast-link");
  if (podcastEl) podcastEl.href = PODCAST_URL;
})();
