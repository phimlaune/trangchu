(function () {
    let moviesAll = [];
    let currentMovie = null;
    let currentEpIdx = 0;
    let hls = null;
    let youtubeIframe = null;

    const homeScreen = document.getElementById('homeScreen');
    const playerScreen = document.getElementById('playerScreen');
    const movieContainer = document.getElementById('movieListContainer');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchButton');
    const playerTitle = document.getElementById('playerMovieTitle');
    const videoPlayer = document.getElementById('videoPlayer');
    const episodeButtonsContainer = document.getElementById('episodeButtons');
    const errorMsg = document.getElementById('errorMessage');
    const backBtn = document.getElementById('backButton');
    const videoContainer = document.querySelector('.video-container');

    function escapeHtml(text) {
        text = String(text || '');
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function showError(msg) {
        errorMsg.textContent = '⚠️ ' + msg;
        errorMsg.style.display = 'block';
    }

    function hideError() {
        errorMsg.style.display = 'none';
    }

    function renderMovies(list) {
        movieContainer.innerHTML = '';

        if (!Array.isArray(list) || !list.length) {
            movieContainer.innerHTML = `
                <div class="no-result">
                    <span class="no-result-icon">🎭</span>
                    Không tìm thấy phim bạn cần :(
                </div>`;
            return;
        }

        list.forEach((movie, i) => {
            const title = escapeHtml(movie.title);
            const epCount = Array.isArray(movie.episodes) ? movie.episodes.length : 0;
            const num = String(i + 1).padStart(2, '0');

            const card = document.createElement('div');
            card.className = 'movie-card';
            card.style.animationDelay = `${i * 0.05}s`;
            card.style.animation = `fadeSlideIn 0.35s ease both`;

            card.innerHTML = `
                <div class="movie-info">
                    <span class="movie-index">${num}</span>
                    <span class="movie-title">${title}</span>
                    <div class="movie-meta">
                        <span>📺 ${epCount} tập</span>
                    </div>
                </div>
                <button class="watch-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    Xem ngay
                </button>
            `;

            card.querySelector('.watch-btn').addEventListener('click', () => openPlayer(movie));
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.watch-btn')) openPlayer(movie);
            });

            movieContainer.appendChild(card);
        });
    }

    function filterMovies() {
        const keyword = searchInput.value.trim().toLowerCase();
        if (!keyword) { renderMovies(moviesAll); return; }
        const filtered = moviesAll.filter(movie =>
            String(movie.title || '').toLowerCase().includes(keyword)
        );
        renderMovies(filtered);
    }

    searchInput.addEventListener('input', filterMovies);
    searchBtn.addEventListener('click', filterMovies);
    searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') filterMovies(); });

    function clearVideo() {
        if (hls) { hls.destroy(); hls = null; }
        videoPlayer.pause();
        videoPlayer.removeAttribute('src');
        videoPlayer.load();
    }

    function clearYouTubeIframe() {
        if (youtubeIframe) {
            youtubeIframe.src = '';
            youtubeIframe.remove();
            youtubeIframe = null;
        }
        videoPlayer.style.display = 'block';
    }

    function isYouTubeUrl(url) {
        url = String(url || '');
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
            catch (e) { const m = url.match(/[?&]v=([^&]+)/); if (m) videoId = m[1]; }
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1].split(/[?#]/)[0];
        }
        if (!videoId) return url;
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    function renderEpisodeButtons() {
        if (!currentMovie || !Array.isArray(currentMovie.episodes)) return;
        episodeButtonsContainer.innerHTML = '';
        currentMovie.episodes.forEach((ep, idx) => {
            const btn = document.createElement('button');
            btn.className = 'ep-btn' + (idx === currentEpIdx ? ' active' : '');
            btn.textContent = `Tập ${ep.ep}`;
            btn.addEventListener('click', () => {
                if (idx === currentEpIdx) return;
                document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentEpIdx = idx;
                loadEpisode(idx);
            });
            episodeButtonsContainer.appendChild(btn);
        });
    }

    function loadEpisode(index) {
        if (!currentMovie || !Array.isArray(currentMovie.episodes) || !currentMovie.episodes[index]) {
            showError('Không tìm thấy tập phim.');
            return;
        }
        hideError();
        clearVideo();
        clearYouTubeIframe();

        const episode = currentMovie.episodes[index];
        const url = String(episode.url || '').trim();
        if (!url) { showError('Link video không hợp lệ.'); return; }

        if (isYouTubeUrl(url)) {
            videoPlayer.style.display = 'none';
            const embedUrl = getYouTubeEmbedUrl(url);
            youtubeIframe = document.createElement('iframe');
            youtubeIframe.src = embedUrl;
            youtubeIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            youtubeIframe.allowFullscreen = true;
            Object.assign(youtubeIframe.style, {
                position: 'absolute', top: '0', left: '0',
                width: '100%', height: '100%', border: '0'
            });
            videoContainer.style.position = 'relative';
            videoContainer.appendChild(youtubeIframe);
            return;
        }

        if (isMp4Url(url)) {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => {});
            return;
        }

        if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => {});
            return;
        }

        if (window.Hls && Hls.isSupported()) {
            hls = new Hls({ debug: false });
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play().catch(() => {}));
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (!data.fatal) return;
                const msgs = {
                    [Hls.ErrorTypes.NETWORK_ERROR]: 'Lỗi mạng, không thể tải phim.',
                    [Hls.ErrorTypes.MEDIA_ERROR]: 'Lỗi dữ liệu video.'
                };
                showError(msgs[data.type] || 'Không thể phát video.');
                clearVideo();
            });
            return;
        }

        showError('Trình duyệt không hỗ trợ phát video.');
    }

    function openPlayer(movie, epIdx = 0) {
        if (!movie) return;
        currentMovie = movie;
        currentEpIdx = epIdx;
        homeScreen.classList.remove('active');
        playerScreen.classList.add('active');
        playerTitle.textContent = movie.title || 'Không tên';
        renderEpisodeButtons();
        loadEpisode(epIdx);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    backBtn.addEventListener('click', () => {
        clearVideo();
        clearYouTubeIframe();
        hideError();
        videoContainer.style.position = '';
        playerScreen.classList.remove('active');
        homeScreen.classList.add('active');
        currentMovie = null;
        currentEpIdx = 0;
        filterMovies();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    async function fetchMovies() {
        movieContainer.innerHTML = '<div class="no-result"><span class="no-result-icon">🎬</span>Đang tải phim...</div>';
        try {
            const res = await fetch('./movies.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('Sai định dạng JSON');
            moviesAll = data.filter(m => m && typeof m === 'object' && Array.isArray(m.episodes));
            renderMovies(moviesAll);
        } catch (err) {
            console.error(err);
            movieContainer.innerHTML = '<div class="no-result"><span class="no-result-icon">⚠️</span>Không thể tải danh sách phim.</div>';
        }
    }

    fetchMovies();
})();
