(function () {
    'use strict';

    /* ─── STATE ─── */
    let moviesAll = [];
    let moviesFiltered = [];
    let currentMovie = null;
    let currentEpIdx = 0;
    let hls = null;
    let youtubeIframe = null;
    let currentView = 'list'; // 'list' | 'grid'

    /* ─── DOM REFS ─── */
    const homeScreen     = document.getElementById('homeScreen');
    const playerScreen   = document.getElementById('playerScreen');
    const movieContainer = document.getElementById('movieListContainer');
    const searchInput    = document.getElementById('searchInput');
    const searchBtn      = document.getElementById('searchButton');
    const clearSearch    = document.getElementById('clearSearch');
    const movieCount     = document.getElementById('movieCount');
    const filterBar      = document.getElementById('filterBar');
    const viewToggle     = document.getElementById('viewToggle');

    // Player
    const videoPlayer        = document.getElementById('videoPlayer');
    const videoContainer     = document.getElementById('videoContainer');
    const videoLoading       = document.getElementById('videoLoading');
    const episodeButtons     = document.getElementById('episodeButtons');
    const epPanelCount       = document.getElementById('epPanelCount');
    const errorMsg           = document.getElementById('errorMessage');
    const backBtn            = document.getElementById('backButton');
    const playerMovieTitle   = document.getElementById('playerMovieTitle');
    const mibTitle           = document.getElementById('mibTitle');
    const mibDesc            = document.getElementById('mibDesc');
    const mibPoster          = document.getElementById('mibPoster');
    const mibEpCount         = document.getElementById('mibEpCount');
    const mibYear            = document.getElementById('mibYear');
    const heroBanner         = document.getElementById('heroBanner');
    const toast              = document.getElementById('toast');

    /* ─── UTILS ─── */
    function escapeHtml(t) {
        t = String(t || '');
        const m = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
        return t.replace(/[&<>"']/g, c => m[c]);
    }

    let toastTimer;
    function showToast(msg, duration = 2800) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
    }

    function showError(msg) {
        errorMsg.textContent = '⚠️ ' + msg;
        errorMsg.style.display = 'block';
    }
    function hideError() { errorMsg.style.display = 'none'; }

    function showVideoLoading() { videoLoading.classList.add('show'); }
    function hideVideoLoading() { videoLoading.classList.remove('show'); }

    /* ─── RENDER MOVIES ─── */
    function renderMovies(list) {
        movieContainer.innerHTML = '';
        movieCount.textContent = list.length ? `${list.length} phim` : '';

        if (!Array.isArray(list) || !list.length) {
            movieContainer.innerHTML = `
                <div class="no-result">
                    <span class="no-result-icon">🎭</span>
                    <span class="no-result-text">Không tìm thấy phim bạn cần :(</span>
                </div>`;
            return;
        }

        const frag = document.createDocumentFragment();

        list.forEach((movie, i) => {
            const title   = escapeHtml(movie.title || 'Chưa có tên');
            const desc    = escapeHtml(movie.description || movie.desc || '');
            const year    = escapeHtml(movie.year || '');
            const epCount = Array.isArray(movie.episodes) ? movie.episodes.length : 0;
            const num     = String(i + 1).padStart(2, '0');
            const thumb   = movie.thumbnail || movie.thumb || movie.image || movie.poster || '';

            const card = document.createElement('div');
            card.className = 'movie-card';
            card.style.animationDelay = `${Math.min(i * 0.04, 0.4)}s`;
            card.style.animation = `fadeIn 0.35s var(--ease) both`;

            // poster
            const posterHtml = thumb
                ? `<img src="${escapeHtml(thumb)}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML=\`<div class='poster-fallback'><svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='m21 15-5-5L5 21'/></svg><span>${title.charAt(0)}</span></div>\`">`
                : `<div class="poster-fallback">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                        <span style="font-size:0.65rem;margin-top:4px;text-align:center;line-height:1.3;">${title.split(' ').slice(0,3).join(' ')}</span>
                   </div>`;

            const descHtml = desc
                ? `<p class="card-desc">${desc}</p>`
                : '';

            const yearBadge = year
                ? `<span class="meta-badge year">${year}</span>`
                : '';

            card.innerHTML = `
                <div class="card-poster">${posterHtml}</div>
                <div class="card-body">
                    <span class="card-index">${num}</span>
                    <p class="card-title">${title}</p>
                    ${descHtml}
                    <div class="card-footer">
                        <div class="card-meta">
                            <span class="meta-badge">${epCount} tập</span>
                            ${yearBadge}
                        </div>
                        <button class="watch-btn" aria-label="Xem ${title}">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            Xem ngay
                        </button>
                    </div>
                </div>`;

            card.querySelector('.watch-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openPlayer(movie);
            });
            card.addEventListener('click', () => openPlayer(movie));

            frag.appendChild(card);
        });

        movieContainer.appendChild(frag);
    }

    /* ─── SKELETONS ─── */
    function renderSkeletons(n = 6) {
        movieContainer.innerHTML = Array(n).fill(0).map(() =>
            `<div class="skeleton-card"></div>`
        ).join('');
    }

    /* ─── FILTER LOGIC ─── */
    function filterMovies() {
        const kw = searchInput.value.trim().toLowerCase();
        const clearVisible = kw.length > 0;
        clearSearch.classList.toggle('visible', clearVisible);

        moviesFiltered = kw
            ? moviesAll.filter(m => String(m.title || '').toLowerCase().includes(kw))
            : [...moviesAll];

        renderMovies(moviesFiltered);
    }

    searchInput.addEventListener('input', filterMovies);
    searchBtn.addEventListener('click', filterMovies);
    searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') filterMovies(); });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        filterMovies();
        searchInput.focus();
    });

    /* ─── VIEW TOGGLE ─── */
    viewToggle.querySelectorAll('.vt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view === currentView) return;
            currentView = view;
            viewToggle.querySelectorAll('.vt-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            movieContainer.className = `movie-container ${view}-view`;
            renderMovies(moviesFiltered);
        });
    });

    /* ─── VIDEO HELPERS ─── */
    function clearVideo() {
        if (hls) { hls.destroy(); hls = null; }
        videoPlayer.pause();
        videoPlayer.removeAttribute('src');
        videoPlayer.load();
        hideVideoLoading();
    }

    function clearIframe() {
        if (youtubeIframe) {
            youtubeIframe.src = '';
            youtubeIframe.remove();
            youtubeIframe = null;
        }
        videoPlayer.style.display = 'block';
    }

    function isYouTubeUrl(url) {
        url = String(url || '').toLowerCase();
        return !url.includes('drive.google.com') &&
               (url.includes('youtube.com') || url.includes('youtu.be'));
    }

    function isMp4Url(url) {
        return /\.mp4(\?|$)/i.test(String(url || ''));
    }

    function getYouTubeEmbedUrl(url) {
        let id = '';
        if (url.includes('youtu.be/'))
            id = url.split('youtu.be/')[1].split(/[?#]/)[0];
        else if (url.includes('youtube.com/watch')) {
            try { id = new URL(url).searchParams.get('v'); }
            catch { const m = url.match(/[?&]v=([^&]+)/); if (m) id = m[1]; }
        } else if (url.includes('youtube.com/embed/'))
            id = url.split('embed/')[1].split(/[?#]/)[0];
        return id
            ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
            : url;
    }

    function makeIframe(src, allow) {
        const f = document.createElement('iframe');
        f.src = src;
        f.allow = allow;
        f.allowFullscreen = true;
        Object.assign(f.style, {
            position: 'absolute', top: '0', left: '0',
            width: '100%', height: '100%', border: '0'
        });
        return f;
    }

    /* ─── EPISODE BUTTONS ─── */
    function renderEpisodeButtons() {
        episodeButtons.innerHTML = '';
        if (!currentMovie?.episodes) return;

        epPanelCount.textContent = `${currentMovie.episodes.length} tập`;

        currentMovie.episodes.forEach((ep, idx) => {
            const btn = document.createElement('button');
            btn.className = 'ep-btn' + (idx === currentEpIdx ? ' active' : '');
            btn.textContent = `Tập ${ep.ep}`;
            btn.setAttribute('aria-label', `Xem tập ${ep.ep}`);
            btn.addEventListener('click', () => {
                if (idx === currentEpIdx) return;
                episodeButtons.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentEpIdx = idx;
                loadEpisode(idx);
            });
            episodeButtons.appendChild(btn);
        });
    }

    /* ─── LOAD EPISODE ─── */
    function loadEpisode(index) {
        if (!currentMovie?.episodes?.[index]) {
            showError('Không tìm thấy tập phim.'); return;
        }
        hideError();
        clearVideo();
        clearIframe();
        showVideoLoading();

        const ep  = currentMovie.episodes[index];
        const url = String(ep.url || '').trim();

        if (!url) { hideVideoLoading(); showError('Link video không hợp lệ.'); return; }

        // GOOGLE DRIVE
        if (url.includes('drive.google.com')) {
            videoPlayer.style.display = 'none';
            let embedUrl = url;
            const m = url.match(/\/file\/d\/([^/]+)/);
            if (m?.[1]) embedUrl = `https://drive.google.com/file/d/${m[1]}/preview`;
            youtubeIframe = makeIframe(embedUrl, 'autoplay');
            videoContainer.appendChild(youtubeIframe);
            hideVideoLoading();
            return;
        }

        // YOUTUBE
        if (isYouTubeUrl(url)) {
            videoPlayer.style.display = 'none';
            youtubeIframe = makeIframe(
                getYouTubeEmbedUrl(url),
                'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            );
            videoContainer.appendChild(youtubeIframe);
            hideVideoLoading();
            return;
        }

        // MP4
        if (isMp4Url(url)) {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => {});
            hideVideoLoading();
            return;
        }

        // HLS NATIVE
        if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => {});
            hideVideoLoading();
            return;
        }

        // HLS.JS
        if (window.Hls && Hls.isSupported()) {
            hls = new Hls({ debug: false });
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                hideVideoLoading();
                videoPlayer.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (!data.fatal) return;
                hideVideoLoading();
                const msgs = {
                    [Hls.ErrorTypes.NETWORK_ERROR]: 'Lỗi mạng, không thể tải phim.',
                    [Hls.ErrorTypes.MEDIA_ERROR]:   'Lỗi dữ liệu video.'
                };
                showError(msgs[data.type] || 'Không thể phát video.');
                clearVideo();
            });
            return;
        }

        hideVideoLoading();
        showError('Trình duyệt không hỗ trợ phát video.');
    }

    /* ─── OPEN PLAYER ─── */
    function openPlayer(movie, epIdx = 0) {
        if (!movie) return;
        currentMovie  = movie;
        currentEpIdx  = epIdx;

        // Fill info banner
        playerMovieTitle.textContent = movie.title || 'Không tên';
        mibTitle.textContent         = movie.title || 'Không tên';
        mibDesc.textContent          = movie.description || movie.desc || '';
        mibDesc.style.display        = mibDesc.textContent ? '' : 'none';

        const epCount = Array.isArray(movie.episodes) ? movie.episodes.length : 0;
        mibEpCount.textContent = `${epCount} tập`;
        mibYear.textContent    = movie.year || '';
        mibYear.style.display  = movie.year ? '' : 'none';

        // Poster
        const thumb = movie.thumbnail || movie.thumb || movie.image || movie.poster || '';
        mibPoster.innerHTML = thumb
            ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(movie.title || '')}" loading="lazy">`
            : `<div class="poster-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>`;

        homeScreen.classList.remove('active');
        playerScreen.classList.add('active');

        renderEpisodeButtons();
        loadEpisode(epIdx);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ─── BACK ─── */
    backBtn.addEventListener('click', () => {
        clearVideo();
        clearIframe();
        hideError();

        playerScreen.classList.remove('active');
        homeScreen.classList.add('active');

        currentMovie = null;
        currentEpIdx = 0;

        filterMovies();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ─── VIDEO EVENTS ─── */
    videoPlayer.addEventListener('waiting', showVideoLoading);
    videoPlayer.addEventListener('canplay', hideVideoLoading);
    videoPlayer.addEventListener('playing', hideVideoLoading);
    videoPlayer.addEventListener('error',  () => {
        hideVideoLoading();
        if (videoPlayer.src) showError('Không thể phát video này.');
    });

    /* ─── FETCH MOVIES ─── */
    async function fetchMovies() {
        renderSkeletons(5);

        try {
            const res = await fetch('./movies.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('Sai định dạng JSON');

            moviesAll = data.filter(m => m && typeof m === 'object' && Array.isArray(m.episodes));
            moviesFiltered = [...moviesAll];

            // Hero banner
            if (moviesAll.length > 0) {
                heroBanner.textContent = `Kho phim với ${moviesAll.length} bộ phim đang chờ bạn khám phá!`;
            } else {
                heroBanner.textContent = 'Chưa có phim nào. Quay lại sau nhé!';
            }

            buildFilterTags();
            renderMovies(moviesAll);

        } catch (err) {
            console.error(err);
            heroBanner.textContent = 'Đang bảo trì, vui lòng thử lại sau.';
            movieContainer.innerHTML = `
                <div class="no-result">
                    <span class="no-result-icon">⚠️</span>
                    <span class="no-result-text">Không thể tải danh sách phim.</span>
                </div>`;
        }
    }

    /* ─── FILTER TAGS ─── */
    function buildFilterTags() {
        // Build tags from years or categories if available
        const years = [...new Set(
            moviesAll.map(m => m.year).filter(Boolean)
        )].sort((a,b) => b - a).slice(0, 6);

        if (!years.length) {
            filterBar.style.display = 'none';
            return;
        }

        filterBar.innerHTML = '<span style="font-size:0.72rem;color:var(--text-lo);padding:6px 2px;white-space:nowrap;">Năm:</span>';

        years.forEach(y => {
            const tag = document.createElement('button');
            tag.className = 'filter-tag';
            tag.textContent = y;
            tag.addEventListener('click', () => {
                const isActive = tag.classList.contains('active');
                filterBar.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                if (isActive) {
                    moviesFiltered = [...moviesAll];
                    renderMovies(moviesFiltered);
                } else {
                    tag.classList.add('active');
                    moviesFiltered = moviesAll.filter(m => String(m.year) === String(y));
                    renderMovies(moviesFiltered);
                }
                movieCount.textContent = moviesFiltered.length ? `${moviesFiltered.length} phim` : '';
            });
            filterBar.appendChild(tag);
        });
    }

    /* ─── KEYBOARD ─── */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && playerScreen.classList.contains('active')) {
            backBtn.click();
        }
    });

    /* ─── INIT ─── */
    fetchMovies();

})();
