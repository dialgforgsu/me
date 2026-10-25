'use strict';

// Hot Pot Comedy — YouTube video gallery
(async function () {
  const container  = document.getElementById('hpcVideos');
  let allEntries   = [];

  // Videos come from hotpot.json, refreshed by a GitHub Actions job (update-videos.js).
  async function fetchVideos() {
    const res = await fetch('hotpot.json?_=' + Date.now());
    if (!res.ok) throw new Error('hotpot.json');
    const data = await res.json();
    return (Array.isArray(data.videos) ? data.videos : [])
      .filter(v => v && /^[\w-]{5,20}$/.test(v.videoId));
  }

  // escHtml comes from utils.js, loaded before this script.

  function renderVideos(order) {
    const sorted = [...allEntries].sort((a, b) => {
      const diff = new Date(a.published) - new Date(b.published);
      return order === 'asc' ? diff : -diff;
    });
    container.innerHTML = sorted.map(v => {
      const date  = new Date(v.published).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      // Titles in hotpot.json are plain text; escape for HTML insertion.
      const title = escHtml(v.title || '');
      return `<div class="hpc-video">
        <div class="hpc-video__embed">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${v.videoId}?rel=0&modestbranding=1"
            title="${title}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            loading="lazy">
          </iframe>
        </div>
        <div class="hpc-video__info">
          <p class="hpc-video__title">${title}</p>
          <p class="hpc-video__date">${date}</p>
        </div>
      </div>`;
    }).join('');
  }

  document.querySelectorAll('.hpc-filter__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hpc-filter__btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (allEntries.length) renderVideos(btn.dataset.order);
    });
  });

  try {
    allEntries = await fetchVideos();
    if (!allEntries.length) {
      container.innerHTML = '<div class="hpc-error">No videos found.</div>';
      return;
    }
    renderVideos('desc');
  } catch {
    container.innerHTML = '<div class="hpc-error">Unable to load videos. Visit <a href="https://www.youtube.com/@hotpotcomedy" target="_blank" style="color:var(--accent)">@hotpotcomedy</a> on YouTube.</div>';
  }
})();
