'use strict';

// Hot Pot Comedy — YouTube RSS video gallery
(async function () {
  const container  = document.getElementById('hpcVideos');
  const CHANNEL_ID = 'UCFVYOfmUZd03OLl4oRBI5Yg';
  const RSS_URL    = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;
  let allEntries   = [];

  function parseRSS(text) {
    const entryRx     = /<entry>([\s\S]*?)<\/entry>/g;
    const videoIdRx   = /<yt:videoId>([^<]+)<\/yt:videoId>/;
    const titleRx     = /<title>([^<]+)<\/title>/;
    const publishedRx = /<published>([^<]+)<\/published>/;
    const results = [];
    let m;
    while ((m = entryRx.exec(text)) !== null) {
      const block     = m[1];
      const videoId   = (videoIdRx.exec(block)  || [])[1] || '';
      const title     = (titleRx.exec(block)     || [])[1] || '';
      const published = (publishedRx.exec(block) || [])[1] || '';
      if (videoId) results.push({ videoId, title, published });
    }
    return results;
  }

  async function fetchFeed() {
    try {
      const res = await fetch(RSS_URL);
      if (res.ok) return await res.text();
    } catch (_) {}
    const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(RSS_URL);
    const res = await fetch(proxy);
    if (!res.ok) throw new Error('proxy');
    return await res.text();
  }

  function renderVideos(order) {
    const sorted = [...allEntries].sort((a, b) => {
      const diff = new Date(a.published) - new Date(b.published);
      return order === 'asc' ? diff : -diff;
    });
    container.innerHTML = sorted.map(v => {
      const date  = new Date(v.published).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      const title = v.title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      return `<div class="hpc-video">
        <div class="hpc-video__embed">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${v.videoId}?rel=0&modestbranding=1"
            title="${title.replace(/"/g, '&quot;')}"
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
    const text = await fetchFeed();
    allEntries = parseRSS(text);
    if (!allEntries.length) {
      container.innerHTML = '<div class="hpc-error">No videos found.</div>';
      return;
    }
    renderVideos('desc');
  } catch {
    container.innerHTML = '<div class="hpc-error">Unable to load videos. Visit <a href="https://www.youtube.com/@hotpotcomedy" target="_blank" style="color:var(--accent)">@hotpotcomedy</a> on YouTube.</div>';
  }
})();
