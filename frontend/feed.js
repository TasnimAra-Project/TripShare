/* feed.js */
$(document).ready(function () {
  // ========= Config =========
  // If your API lives elsewhere, set it once and forget:
  // localStorage.setItem('apiBaseUrl', 'https://your-backend.example.com');
  const API_BASE = (localStorage.getItem('apiBaseUrl') || '').replace(/\/$/, '');
  const POSTS_ENDPOINT = API_BASE ? `${API_BASE}/api/posts` : '/api/posts';

  // ========= Auth gate =========
 // const userData = safeParse(localStorage.getItem('userData')) || null;
  //if (!userData) {
    //window.location.href = 'Login.html';
    //return;
  //}
  //$('#welcomeUser').text(`Welcome, ${userData.username}!`);

  // ========= UI bindings =========
  $('#logoutBtn').on('click', () => {
    localStorage.removeItem('userData');
    window.location.href = 'Login.html';
  });

  $('#shareExperienceBtn').on('click', () => {
    window.location.href = 'post-experience.html';
  });

  // Search box (from your HTML header)
  const $search = $('.search-box input[type="text"]');
  $search.on('input', debounce(handleSearch, 200));

  // ========= Initial load =========
  showSkeletons();
  loadPosts().then((posts) => {
    window.__ALL_POSTS__ = posts || [];
    renderPosts(window.__ALL_POSTS__);
  }).catch((err) => {
    console.error('Load posts failed:', err);
    showError('Failed to load posts from server. Showing demo data.');
    const demo = getMockPosts();
    window.__ALL_POSTS__ = demo;
    renderPosts(demo);
  });
});

/* ---------------- Core ---------------- */

async function loadPosts() {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: getPostsEndpoint(),
      method: 'GET',
      dataType: 'json',
      success: function (response) {
        // Expected shape: { success: true, posts: [...] }
        if (!response || response.success !== true || !Array.isArray(response.posts)) {
          return reject(new Error('Unexpected response shape'));
        }
        // Sort newest → oldest by timestamp if present
        const sorted = [...response.posts].sort((a, b) => {
          const ta = new Date(a?.timestamp || 0).getTime();
          const tb = new Date(b?.timestamp || 0).getTime();
          return tb - ta;
        });
        resolve(sorted);
      },
      error: function (xhr) {
        reject(new Error(xhr?.responseText || 'Network error'));
      }
    });
  });
}

function renderPosts(posts) {
  const $feed = $('#feedPosts');
  $feed.empty();

  if (!posts || posts.length === 0) {
    $feed.html('<p style="color:#888;text-align:center;">No travel experiences yet. Be the first to share yours!</p>');
    return;
  }

  const frag = document.createDocumentFragment();
  posts.forEach((post) => {
    const html = createPostHTML(post);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    frag.appendChild(wrapper.firstChild);
  });
  $feed.append(frag);
}

/* ---------------- Rendering helpers ---------------- */

function createPostHTML(post) {
  // Defensive parsing
  const author = escapeHtml(post?.author || 'Traveler');
  const ts = post?.timestamp ? formatTime(post.timestamp) : '—';
  const likes = Number(post?.likes || 0);
  const comments = Number(post?.comments || 0);

  // Two shapes supported:
  // 1) type === 'experience' with content = { placeName, country, safety, affordability, description, image }
  // 2) generic: content = { text, image }
  let contentHtml = '';

  if (post?.type === 'experience' && post?.content) {
    const c = post.content || {};
    const place = [c.placeName, c.country].filter(Boolean).map(escapeHtml).join(', ');
    const safety = isFinite(parseInt(c.safety)) ? getSafetyStars(parseInt(c.safety)) : '—';
    const affordability = isFinite(parseInt(c.affordability)) ? getAffordabilitySymbols(parseInt(c.affordability)) : '—';
    const desc = escapeHtml(c.description || '');
    const img = c.image ? `<img loading="lazy" src="${escapeAttr(c.image)}" alt="Travel photo" class="post-image">` : '';

    contentHtml = `
      <div class="post-text">
        <h4>${place || 'Untitled Experience'}</h4>
        <p><strong>Safety:</strong> ${safety}</p>
        <p><strong>Affordability:</strong> ${affordability}</p>
        ${desc ? `<p>${desc}</p>` : ''}
      </div>
      ${img}
    `;
  } else {
    const text = escapeHtml(post?.content?.text || '');
    const img = post?.content?.image ? `<img loading="lazy" src="${escapeAttr(post.content.image)}" alt="Post image" class="post-image">` : '';
    contentHtml = `
      <div class="post-text">${text || ''}</div>
      ${img}
    `;
  }

  return `
    <article class="post-card">
      <header class="post-header">
        <div class="user-avatar-small" aria-hidden="true"><i class="fas fa-user-circle"></i></div>
        <div>
          <div class="post-author">${author}</div>
          <time class="post-time" datetime="${escapeAttr(post?.timestamp || '')}">${ts}</time>
        </div>
      </header>

      <div class="post-content">
        ${contentHtml}
      </div>

      <footer class="post-stats">
        <span>${likes} likes</span>
        <span>${comments} comments</span>
      </footer>
    </article>
  `;
}

/* ---------------- UI helpers ---------------- */

function showSkeletons(count = 4) {
  const $feed = $('#feedPosts');
  const items = Array.from({ length: count }).map(() => `
    <div class="post-card skeleton">
      <div class="post-header">
        <div class="user-avatar-small skeleton-block"></div>
        <div style="flex:1;">
          <div class="skeleton-line" style="width:140px;"></div>
          <div class="skeleton-line" style="width:90px;"></div>
        </div>
      </div>
      <div class="post-content">
        <div class="skeleton-line" style="width:80%;"></div>
        <div class="skeleton-line" style="width:95%;"></div>
        <div class="skeleton-line" style="width:70%;"></div>
        <div class="skeleton-img"></div>
      </div>
      <div class="post-stats">
        <div class="skeleton-line" style="width:60px;"></div>
        <div class="skeleton-line" style="width:80px;"></div>
      </div>
    </div>
  `).join('');
  $feed.html(items);
}

function showError(msg) {
  $('#feedPosts').prepend(
    `<p style="color:#b00020;background:#ffecec;border:1px solid #ffb3b3;padding:.5rem 1rem;border-radius:8px;margin-bottom:1rem;">${escapeHtml(msg)}</p>`
  );
}

/* ---------------- Search ---------------- */

function handleSearch() {
  const q = ($('.search-box input[type="text"]').val() || '').trim().toLowerCase();
  const all = window.__ALL_POSTS__ || [];
  if (!q) return renderPosts(all);

  const filtered = all.filter((p) => {
    const author = (p?.author || '').toLowerCase();
    const text = (p?.content?.text || '').toLowerCase();
    const place = (p?.content?.placeName || '').toLowerCase();
    const country = (p?.content?.country || '').toLowerCase();
    const desc = (p?.content?.description || '').toLowerCase();

    return [author, text, place, country, desc].some((v) => v.includes(q));
  });

  renderPosts(filtered);
}

/* ---------------- Formatters & utils ---------------- */

function getSafetyStars(rating) {
  const r = clampInt(rating, 0, 5);
  const stars = '⭐'.repeat(r);
  const labels = ['—', 'Unsafe', 'Somewhat Unsafe', 'Moderate', 'Safe', 'Very Safe'];
  return `${stars} ${labels[r] || ''}`.trim();
}

function getAffordabilitySymbols(rating) {
  const r = clampInt(rating, 0, 5);
  const symbols = '💰'.repeat(r);
  const labels = ['—', 'Very Affordable', 'Affordable', 'Moderate', 'Expensive', 'Very Expensive'];
  return `${symbols} ${labels[r] || ''}`.trim();
}

function formatTime(timestamp) {
  const now = new Date();
  const postTime = new Date(timestamp);
  if (isNaN(postTime.getTime())) return '—';
  const diffMs = now - postTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return postTime.toLocaleDateString();
}

function clampInt(n, min, max) {
  const v = parseInt(n);
  if (isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(s) {
  // Conservative for attributes/URLs
  return escapeHtml(s).replace(/[\n\r\t]/g, '');
}

function debounce(fn, ms) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function getPostsEndpoint() {
  const API_BASE = (localStorage.getItem('apiBaseUrl') || '').replace(/\/$/, '');
  return API_BASE ? `${API_BASE}/api/posts` : '/api/posts';
}

/* ---------------- Mock (for front-end only dev) ---------------- */

function getMockPosts() {
  // If your backend is not reachable during front-end dev,
  // we’ll show these so you can style the feed.
  return [
    {
      id: 'p3',
      author: 'Aisha Khan',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      type: 'experience',
      content: {
        placeName: 'Kathmandu',
        country: 'Nepal',
        safety: 4,
        affordability: 3,
        description: 'Thamel’s streets are buzzing! Loved Swayambhunath at sunset.',
        image: 'https://picsum.photos/seed/kathmandu/800/450'
      },
      likes: 12,
      comments: 3
    },
    {
      id: 'p2',
      author: 'Diego Rivera',
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      type: 'experience',
      content: {
        placeName: 'Bali',
        country: 'Indonesia',
        safety: 5,
        affordability: 2,
        description: 'Canggu cafes + Uluwatu cliffs = perfection. Surf was mellow.',
        image: 'https://picsum.photos/seed/bali/800/450'
      },
      likes: 45,
      comments: 10
    },
    {
      id: 'p1',
      author: 'Jesse',
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
      content: {
        text: 'Quick tip: always carry a local eSIM backup.',
        image: ''
      },
      likes: 7,
      comments: 1
    }
  ];
}
