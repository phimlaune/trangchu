(function () {
    'use strict';

    /* =====================================================
       STATE
       ===================================================== */
    let moviesAll = [];
    let currentMovie = null;
    let currentEpIdx = 0;
    let currentFilter = 'all';
    let hls = null;
    let youtubeIframe = null;

    /* =====================================================
       DOM REFS
       ===================================================== */
    const homeScreen          = document.getElementById('homeScreen');
    const playerScreen        = document.getElementById('playerScreen');
    const movieContainer      = document.getElementById('movieListContainer');
    const searchInput         = document.getElementById('searchInput');
    const searchBtn           = document.getElementById('searchButton');
    const searchClear         = document.getElementById('searchClear');
    const playerTitle         = document.getElementById('playerMovieTitle');
    const playerBreadcrumb    = document.getElementById('playerBreadcrumb');
    const videoPlayer         = document.getElementById('videoPlayer');
    const videoContainer      = document.getElementById('videoContainer');
    const episodeButtons      = document.getElementById('episodeButtons');
    const errorMessage        = document.getElementById('errorMessage');
    const errorText           = document.getElementById('errorText');
    const backBtn             = document.getElementById('backButton');
    const scrollProgress      = document.getElementById('scrollProgress');
    const toastContainer      = document.getElementById('toastContainer');
    const movieCount          = document.getElementById('movieCount');
    const statMovies          = document.getElementById('statMovies');
    const statEpisodes        = document.getElementById('statEpisodes');
    const epCurrentBadge      = document.getElementById('epCurrentBadge');
    const epCurrentTitle      = document.getElementById('epCurrentTitle');
    const epTotalBadge        = document.getElementById('epTotalBadge');
    const prevEpBtn           = document.getElementById('prevEpBtn');
    const nextEpBtn           = document.getElementById('nextEpBtn');
    const filterRow           = document.getElementById('filterRow');

    /* =====================================================
       SCROLL PROGRESS
       ===================================================== */
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const pct = total > 0 ? (scrolled / total) * 100 : 0;
        scrollProgress.style.width = pct + '%';
    }, { passive: true });

    /* =====================================================
       TOAST
       ===================================================== */
    function showToast(msg, duration = 2500) {
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        toastContainer.appendChild(t);
        setTimeout(() => {
            t.classList.add('out');
            t.addEventListener('animationend', () => t.remove());
        }, duration);
    }

    /* =====================================================
       ERROR
       ===================================================== */
    function showError(msg) {
        errorText.textContent = msg;
        errorMessage.classList.add('visible');
    }

    function hideError() {
        errorMessage.classList.remove('visible');
    }

    /* =====================================================
       UTILS
       ===================================================== */
    function escapeHtml(text) {
        text = String(text || '');
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function getFirstLetter(title) {
        const t = String(title || '').trim();
        return t.length > 0 ? t[0].toUpperCase() : '?';
    }

    function formatCount(n) {
        if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
        return String(n);
    }

    /* =====================================================
       FILTER PILLS
       ===================================================== */
    filterRow.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        filterRow.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.filter || 'all';
        filterMovies();
    });

    /* =====================================================
       SEARCH CLEAR
       ===================================================== */
    searchInput.addEventListener('input', () => {
        const hasVal = searchInput.value.length > 0;
        searchClear.classList.toggle('visible', hasVal);
        filterMovies();
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.classList.remove('visible');
        filterMovies();
        searchInput.focus();
    });

    searchBtn.addEventListener('click', filterMovies);
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') filterMovies();
    });

    /* =====================================================
       SKELETON LOADING
       ===================================================== */
    function renderSkeletons(count = 6) {
        movieContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const s = document.createElement('div');
            s.className = 'skeleton-card';
            s.style.animationDelay = `${i * 0.06}s`;
            s.innerHTML = `
                <div class="skeleton-thumb"></div>
                <div class="skeleton-info">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line meta"></div>
                </div>
                <div class="skeleton-btn"></div>
            `;
            movieContainer.appendChild(s);
        }
    }

    /* =====================================================
       RENDER MOVIES
       ===================================================== */
    function renderMovies(list) {
        movieContainer.innerHTML = '';
        movieCount.textContent = list.length;

        if (!Array.isArray(list) || !list.length) {
            movieContainer.innerHTML = `
                <div class="no-result">
                    <span class="no-result-icon">🎭</span>
                    <div class="no-result-text">Không tìm thấy phim bạn cần</div>
                    <div class="no-result-sub">Thử từ khóa khác hoặc bỏ bộ lọc</div>
                </div>
            `;
            return;
        }

        const frag = document.createDocumentFragment();

        list.forEach((movie, i) => {
            const title   = escapeHtml(movie.title);
            const letter  = escapeHtml(getFirstLetter(movie.title));
            const epCount = Array.isArray(movie.episodes) ? movie.episodes.length : 0;
            const num     = String(i + 1).padStart(2, '0');

            const card = document.createElement('div');
            card.className = 'movie-card';
            card.setAttribute('role', 'listitem');
            card.style.animationDelay = `${i * 0.045}s`;

            card.innerHTML = `
                <div class="movie-thumb" aria-hidden="true">
                    <div class="movie-thumb-inner">
                        <span class="movie-thumb-letter">${letter}</span>
                    </div>
                </div>
                <div class="movie-info">
                    <span class="movie-index">${num}</span>
                    <span class="movie-title" title="${title}">${title}</span>
                    <div class="movie-meta">
                        <span class="meta-badge">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <path d="m9 8 6 4-6 4Z"/>
                            </svg>
                            ${epCount} tập
                        </span>
                    </div>
                </div>
                <div class="movie-actions">
                    <button class="watch-btn" aria-label="Xem ${title}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Xem ngay</span>
                    </button>
                </div>
            `;

            const openFn = () => openPlayer(movie);
            card.querySelector('.watch-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openFn();
            });
            card.addEventListener('click', openFn);

            frag.appendChild(card);
        });

        movieContainer.appendChild(frag);
    }

    /* =====================================================
       FILTER
       ===================================================== */
    function filterMovies() {
        const keyword = searchInput.value.trim().toLowerCase();

        let list = moviesAll;

        // Keyword filter
        if (keyword) {
            list = list.filter(m =>
                String(m.title || '').toLowerCase().includes(keyword)
            );
        }

        // Filter pills
        if (currentFilter === 'multi') {
            list = list.filter(m => (m.episodes || []).length > 1);
        } else if (currentFilter === 'single') {
            list = list.filter(m => (m.episodes || []).length === 1);
        }

        renderMovies(list);
    }

    /* =====================================================
       VIDEO HELPERS
       ===================================================== */
    function clearVideo() {
        if (hls) { hls.destroy(); hls = null; }
        videoPlayer.pause();
        videoPlayer.removeAttribute('src');
        videoPlayer.load();
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
        if (url.includes('drive.google.com')) return false;
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    function isMp4Url(url) {
        return String(url || '').toLowerCase().includes('.mp4');
    }

    function getYouTubeEmbedUrl(url) {
        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
        } else if (url.includes('youtube.com/watch')) {
            try { videoId = new URL(url).searchParams.get('v'); }
            catch { const m = url.match(/[?&]v=([^&]+)/); if (m) videoId = m[1]; }
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1].split(/[?#]/)[0];
        }
        if (!videoId) return url;
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    function createIframe(src, allowStr) {
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.allow = allowStr;
        iframe.allowFullscreen = true;
        Object.assign(iframe.style, {
            position: 'absolute', top: '0', left: '0',
            width: '100%', height: '100%', border: '0'
        });
        videoContainer.style.position = 'relative';
        videoContainer.appendChild(iframe);
        return iframe;
    }

    /* =====================================================
       UPDATE EP INFO BAR
       ===================================================== */
    function updateEpInfoBar() {
        if (!currentMovie || !Array.isArray(currentMovie.episodes)) return;

        const eps = currentMovie.episodes;
        const ep  = eps[currentEpIdx];

        epCurrentBadge.textContent = ep ? `Tập ${ep.ep}` : `Tập ${currentEpIdx + 1}`;
        epCurrentTitle.textContent = ep?.title ? ep.title : '';
        epTotalBadge.textContent   = `${currentEpIdx + 1} / ${eps.length} tập`;

        prevEpBtn.disabled = currentEpIdx <= 0;
        nextEpBtn.disabled = currentEpIdx >= eps.length - 1;
    }

    /* =====================================================
       EPISODE BUTTONS
       ===================================================== */
    function renderEpisodeButtons() {
        if (!currentMovie || !Array.isArray(currentMovie.episodes)) return;
        episodeButtons.innerHTML = '';

        const frag = document.createDocumentFragment();
        currentMovie.episodes.forEach((ep, idx) => {
            const btn = document.createElement('button');
            btn.className = 'ep-btn' + (idx === currentEpIdx ? ' active' : '');
            btn.textContent = `Tập ${ep.ep}`;
            btn.setAttribute('role', 'listitem');
            btn.setAttribute('aria-label', `Xem tập ${ep.ep}`);
            if (idx === currentEpIdx) btn.setAttribute('aria-current', 'true');

            btn.addEventListener('click', () => {
                if (idx === currentEpIdx) return;
                document.querySelectorAll('.ep-btn').forEach(b => {
                    b.classList.remove('active');
                    b.removeAttribute('aria-current');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-current', 'true');
                currentEpIdx = idx;
                loadEpisode(idx);
                updateEpInfoBar();
            });

            frag.appendChild(btn);
        });

        episodeButtons.appendChild(frag);
    }

    /* =====================================================
       LOAD EPISODE
       ===================================================== */
    function loadEpisode(index) {
        if (
            !currentMovie ||
            !Array.isArray(currentMovie.episodes) ||
            !currentMovie.episodes[index]
        ) {
            showError('Không tìm thấy tập phim.');
            return;
        }

        hideError();
        clearVideo();
        clearIframe();

        const episode = currentMovie.episodes[index];
        const url     = String(episode.url || '').trim();

        if (!url) { showError('Link video không hợp lệ.'); return; }

        // GOOGLE DRIVE
        if (url.includes('drive.google.com')) {
            videoPlayer.style.display = 'none';
            let embedUrl = url;
            const match = url.match(/\/file\/d\/([^/]+)/);
            if (match && match[1]) embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
            youtubeIframe = createIframe(embedUrl, 'autoplay');
            return;
        }

        // YOUTUBE
        if (isYouTubeUrl(url)) {
            videoPlayer.style.display = 'none';
            youtubeIframe = createIframe(
                getYouTubeEmbedUrl(url),
                'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            );
            return;
        }

        // MP4
        if (isMp4Url(url)) {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => {});
            return;
        }

        // HLS NATIVE
        if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => {});
            return;
        }

        // HLS.JS
        if (window.Hls && Hls.isSupported()) {
            hls = new Hls({ debug: false });
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play().catch(() => {}));
            hls.on(Hls.Events.ERROR, (_, data) => {
                if (!data.fatal) return;
                const msgs = {
                    [Hls.ErrorTypes.NETWORK_ERROR]: 'Lỗi mạng, không thể tải phim.',
                    [Hls.ErrorTypes.MEDIA_ERROR]:   'Lỗi dữ liệu video.'
                };
                showError(msgs[data.type] || 'Không thể phát video.');
                clearVideo();
            });
            return;
        }

        showError('Trình duyệt không hỗ trợ phát video.');
    }

    /* =====================================================
       PREV / NEXT EP NAV
       ===================================================== */
    prevEpBtn.addEventListener('click', () => {
        if (currentEpIdx > 0) {
            currentEpIdx--;
            loadEpisode(currentEpIdx);
            updateEpInfoBar();
            syncActiveEpBtn();
            showToast('⬅ Tập trước');
        }
    });

    nextEpBtn.addEventListener('click', () => {
        const eps = currentMovie?.episodes || [];
        if (currentEpIdx < eps.length - 1) {
            currentEpIdx++;
            loadEpisode(currentEpIdx);
            updateEpInfoBar();
            syncActiveEpBtn();
            showToast('Tập tiếp theo ➡');
        }
    });

    function syncActiveEpBtn() {
        document.querySelectorAll('.ep-btn').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === currentEpIdx);
            if (idx === currentEpIdx) {
                btn.setAttribute('aria-current', 'true');
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            } else {
                btn.removeAttribute('aria-current');
            }
        });
    }

    /* =====================================================
       OPEN PLAYER
       ===================================================== */
    function openPlayer(movie, epIdx = 0) {
        if (!movie) return;

        currentMovie = movie;
        currentEpIdx = epIdx;

        homeScreen.classList.remove('active');
        playerScreen.classList.add('active');

        playerTitle.textContent      = movie.title || 'Không tên';
        playerBreadcrumb.textContent = movie.title || 'Đang xem';

        renderEpisodeButtons();
        updateEpInfoBar();
        loadEpisode(epIdx);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* =====================================================
       BACK BUTTON
       ===================================================== */
    backBtn.addEventListener('click', () => {
        clearVideo();
        clearIframe();
        hideError();

        videoContainer.style.position = '';

        playerScreen.classList.remove('active');
        homeScreen.classList.add('active');

        currentMovie  = null;
        currentEpIdx  = 0;

        filterMovies();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* =====================================================
       KEYBOARD SHORTCUTS
       ===================================================== */
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;

        // Player shortcuts
        if (playerScreen.classList.contains('active')) {
            if (e.key === 'ArrowLeft'  && !prevEpBtn.disabled) prevEpBtn.click();
            if (e.key === 'ArrowRight' && !nextEpBtn.disabled) nextEpBtn.click();
            if (e.key === 'Escape')   backBtn.click();
        }

        // Home shortcut
        if (homeScreen.classList.contains('active')) {
            if (e.key === '/' || e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        }
    });

    /* =====================================================
       FETCH MOVIES
       ===================================================== */
    async function fetchMovies() {
        renderSkeletons(7);

        try {
            const res = await fetch('./movies.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('Sai định dạng JSON');

            moviesAll = data.filter(m =>
                m && typeof m === 'object' && Array.isArray(m.episodes)
            );

            // Update stats
            const totalEps = moviesAll.reduce((s, m) => s + (m.episodes || []).length, 0);
            statMovies.textContent   = formatCount(moviesAll.length);
            statEpisodes.textContent = formatCount(totalEps);

            renderMovies(moviesAll);

        } catch (err) {
            console.error(err);
            statMovies.textContent   = '—';
            statEpisodes.textContent = '—';
            movieContainer.innerHTML = `
                <div class="no-result">
                    <span class="no-result-icon">⚠️</span>
                    <div class="no-result-text">Không thể tải danh sách phim</div>
                    <div class="no-result-sub">Kiểm tra kết nối mạng và thử lại</div>
                </div>
            `;
        }
    }

    fetchMovies();
})();
