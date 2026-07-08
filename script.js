/* ============================================================
   PHIM LẬU NÈ — script.js
   Dùng chung cho index.html / movie.html / watch.html
   ============================================================ */

const DATA_URL = "data.json";

/* ---------------- helpers ---------------- */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function getParam(name) { return new URLSearchParams(location.search).get(name); }

async function loadMovies() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error("Không tải được data.json");
  return res.json();
}

/* ---------------- donation modal (shared) ---------------- */
function initDonation() {
  const fab = qs("#donateFab");
  const overlay = qs("#donateOverlay");
  if (!fab || !overlay) return;
  const open = () => overlay.classList.add("open");
  const close = () => overlay.classList.remove("open");
  fab.addEventListener("click", open);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  qsa("[data-close-modal]", overlay).forEach(el => el.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

/* ============================================================
   TRANG CHỦ (index.html)
   ============================================================ */
async function initHome() {
  const grid = qs("#movieGrid");
  const searchInput = qs("#searchInput");
  const countrySelect = qs("#countrySelect");
  const gridBtn = qs("#viewGrid");
  const listBtn = qs("#viewList");
  if (!grid) return;

  let movies = [];
  try {
    movies = await loadMovies();
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Không tải được dữ liệu phim. Kiểm tra lại file data.json.</p>`;
    return;
  }

  /* build country filter options */
  const countries = [...new Set(movies.map(m => m.country).filter(Boolean))].sort();
  countries.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countrySelect.appendChild(opt);
  });

  function render() {
    const term = searchInput.value.trim().toLowerCase();
    const country = countrySelect.value;
    const filtered = movies.filter(m => {
      const matchTerm = !term || m.title.toLowerCase().includes(term);
      const matchCountry = !country || m.country === country;
      return matchTerm && matchCountry;
    });

    if (!filtered.length) {
      grid.innerHTML = `<p class="empty-state">Không tìm thấy phim nào phù hợp 🎬</p>`;
      return;
    }

    grid.innerHTML = filtered.map((m, i) => `
      <a class="ticket-card" href="movie.html?id=${m.id}" style="animation-delay:${Math.min(i,10) * 0.04}s">
        <div class="poster">
          <span class="country-tag">${m.country || "?"}</span>
          <img src="${m.thumbnail}" alt="Banner phim ${escapeHtml(m.title)}" loading="lazy">
        </div>
        <div class="perforation"></div>
        <div class="info">
          <h3>${escapeHtml(m.title)}</h3>
          <p class="ep-count">${m.episodes?.length || 0} tập</p>
        </div>
      </a>
    `).join("");
  }

  searchInput.addEventListener("input", render);
  countrySelect.addEventListener("change", render);

  gridBtn.addEventListener("click", () => {
    grid.classList.remove("list-view");
    gridBtn.classList.add("active");
    listBtn.classList.remove("active");
    localStorage.setItem("phimlaune_view", "grid");
  });
  listBtn.addEventListener("click", () => {
    grid.classList.add("list-view");
    listBtn.classList.add("active");
    gridBtn.classList.remove("active");
    localStorage.setItem("phimlaune_view", "list");
  });

  const savedView = localStorage.getItem("phimlaune_view");
  if (savedView === "list") listBtn.click(); else gridBtn.click();

  render();
}

/* ============================================================
   TRANG GIỚI THIỆU PHIM (movie.html)
   ============================================================ */
async function initMovieDetail() {
  const wrap = qs("#detailWrap");
  if (!wrap) return;
  const id = Number(getParam("id"));

  let movies = [];
  try {
    movies = await loadMovies();
  } catch (err) {
    wrap.innerHTML = `<p class="empty-state">Không tải được dữ liệu phim.</p>`;
    return;
  }

  const movie = movies.find(m => m.id === id);
  if (!movie) {
    wrap.innerHTML = `<p class="empty-state">Không tìm thấy phim này 🎬</p>`;
    return;
  }

  document.title = `${movie.title} — Phim Lậu Nè`;
  qs("#backdropImg").src = movie.thumbnail;
  qs("#backdropImg").alt = `Banner ${movie.title}`;
  qs("#posterImg").src = movie.thumbnail;
  qs("#posterImg").alt = `Poster ${movie.title}`;
  qs("#movieTitle").textContent = movie.title;
  qs("#movieCountry").textContent = movie.country || "";
  qs("#movieDesc").textContent = movie.description || "";
  qs("#movieEpTotal").textContent = `${movie.episodes?.length || 0} tập`;

  const epGrid = qs("#epGrid");
  epGrid.innerHTML = (movie.episodes || []).map(e => `
    <a class="ep-btn" href="watch.html?id=${movie.id}&ep=${e.ep}">Tập ${e.ep}</a>
  `).join("");
}

/* ============================================================
   TRANG XEM PHIM (watch.html)
   ============================================================ */
async function initWatch() {
  const player = qs("#videoPlayer");
  if (!player) return;
  const id = Number(getParam("id"));
  const epParam = Number(getParam("ep"));

  let movies = [];
  try {
    movies = await loadMovies();
  } catch (err) {
    qs("#watchTitle").textContent = "Không tải được dữ liệu phim.";
    return;
  }

  const movie = movies.find(m => m.id === id);
  if (!movie) {
    qs("#watchTitle").textContent = "Không tìm thấy phim này 🎬";
    return;
  }

  const episode = movie.episodes.find(e => e.ep === epParam) || movie.episodes[0];
  document.title = `${movie.title} - Tập ${episode.ep} — Phim Lậu Nè`;
  qs("#watchTitle").innerHTML = `${escapeHtml(movie.title)} <span>— Tập ${episode.ep}</span>`;

  setupPlayer(episode.url);

  const epGrid = qs("#watchEpGrid");
  epGrid.innerHTML = movie.episodes.map(e => `
    <a class="ep-btn ${e.ep === episode.ep ? "current" : ""}" href="watch.html?id=${movie.id}&ep=${e.ep}">Tập ${e.ep}</a>
  `).join("");
}

function setupPlayer(url) {
  const frame = qs("#playerFrame");
  const video = qs("#videoPlayer");
  let fellBack = false;

  function fallbackToEmbed() {
    if (fellBack) return;
    fellBack = true;
    const iframe = document.createElement("iframe");
    iframe.allow = "autoplay; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "no-referrer";
    iframe.loading = "lazy";
    iframe.src = `https://player.phimapi.com/player/?url=${encodeURIComponent(url)}`;
    frame.innerHTML = "";
    frame.appendChild(iframe);
  }

  // Link đã sẵn là trang player nhúng -> dùng iframe luôn, khỏi thử video.
  if (/player\.phimapi\.com\/player/i.test(url) || /\/embed/i.test(url)) {
    fallbackToEmbed();
    return;
  }

  // Bước 1: thử phát trực tiếp bằng <video> — hoạt động với các nguồn
  // không chặn hotlink (vd: namev1.top).
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.addEventListener("error", fallbackToEmbed, { once: true });
    return;
  }
  if (window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls();
    hls.on(window.Hls.Events.ERROR, (_evt, data) => {
      // Bước 2: nguồn bị lỗi (thường do chặn hotlink theo Referer, vd:
      // kkphimplayer) -> tự động chuyển sang nhúng qua player.phimapi.com.
      if (data.fatal) fallbackToEmbed();
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    return;
  }

  // Trình duyệt không hỗ trợ HLS kiểu nào cả -> dùng iframe cho chắc.
  fallbackToEmbed();
}

/* ---------------- utils ---------------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------- boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initDonation();
  initHome();
  initMovieDetail();
  initWatch();
});
