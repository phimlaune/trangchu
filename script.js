(function() {
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

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
        }
    });

    function renderMovies(list) {
        movieContainer.innerHTML = '';
        if (!list.length) {
            movieContainer.innerHTML = '<div class="no-result">Không tìm thấy phim :<</div>';
            return;
        }
        list.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `
                <div class="movie-info">
                    <span class="movie-title">${escapeHtml(movie.title)}</span>
                    <div class="movie-meta">
                        <span>📺 ${movie.episodes.length} tập</span>
                    </div>
                </div>
                <button class="watch-btn" data-id="${movie.id}">▶ Xem</button>
            `;
            card.querySelector('.watch-btn').addEventListener('click', () => openPlayer(movie));
            movieContainer.appendChild(card);
        });
    }

    function escapeHtml(text) {
        const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function filterMovies() {
        const keyword = searchInput.value.trim().toLowerCase();
        if (!keyword) {
            renderMovies(moviesAll);
            return;
        }
        const filtered = moviesAll.filter(m => m.title.toLowerCase().includes(keyword));
        renderMovies(filtered);
    }

    searchInput.addEventListener('input', filterMovies);
    searchBtn.addEventListener('click', filterMovies);
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') filterMovies();
    });

    function openPlayer(movie, epIdx = 0) {
        currentMovie = movie;
        currentEpIdx = epIdx;
        homeScreen.classList.remove('active');
        playerScreen.classList.add('active');
        playerTitle.textContent = movie.title;
        renderEpisodeButtons();
        loadEpisode(epIdx);
        window.scrollTo({top: 0, behavior: 'smooth'});
    }

    function clearYouTubeIframe() {
        if (youtubeIframe) {
            youtubeIframe.remove();
            youtubeIframe = null;
        }
        videoPlayer.style.display = '';
    }

    function isYouTubeUrl(url) {
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    function getYouTubeEmbedUrl(url) {
        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
        } else if (url.includes('youtube.com/watch')) {
            const urlObj = new URL(url);
            videoId = urlObj.searchParams.get('v');
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1].split(/[?#]/)[0];
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        return url;
    }

    function loadEpisode(index) {
        if (!currentMovie || !currentMovie.episodes[index]) return;
        const url = currentMovie.episodes[index].url;
        errorMsg.style.display = 'none';
        clearYouTubeIframe();

        if (isYouTubeUrl(url)) {
            videoPlayer.style.display = 'none';
            const embedUrl = getYouTubeEmbedUrl(url);
            youtubeIframe = document.createElement('iframe');
            youtubeIframe.src = embedUrl;
            youtubeIframe.setAttribute('width', '100%');
            youtubeIframe.setAttribute('height', '100%');
            youtubeIframe.setAttribute('frameborder', '0');
            youtubeIframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            youtubeIframe.setAttribute('allowfullscreen', true);
            youtubeIframe.style.position = 'absolute';
            youtubeIframe.style.top = '0';
            youtubeIframe.style.left = '0';
            youtubeIframe.style.width = '100%';
            youtubeIframe.style.height = '100%';
            videoContainer.style.position = 'relative';
            videoContainer.appendChild(youtubeIframe);
            return;
        }

        videoPlayer.style.display = 'block';
        videoContainer.style.position = '';
        if (hls) {
            hls.destroy();
            hls = null;
        }

        if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.play().catch(() => {});
        } else if (window.Hls && Hls.isSupported()) {
            hls = new Hls({ debug: false });
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play().catch(() => {});
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            showError('Lỗi mạng, không thể tải phim.');
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            showError('Lỗi dữ liệu video, thử tập khác.');
                            break;
                        default:
                            showError('Không thể phát video.');
                            break;
                    }
                    if (hls) {
                        hls.destroy();
                        hls = null;
                    }
                }
            });
        } else {
            showError('Trình duyệt không hỗ trợ HLS. Vui lòng dùng Chrome, Edge hoặc Safari.');
        }
    }

    function showError(msg) {
        errorMsg.textContent = '⚠️ ' + msg;
        errorMsg.style.display = 'block';
    }

    function renderEpisodeButtons() {
        if (!currentMovie) return;
        episodeButtonsContainer.innerHTML = '';
        currentMovie.episodes.forEach((ep, idx) => {
            const btn = document.createElement('button');
            btn.className = 'ep-btn';
            if (idx === currentEpIdx) btn.classList.add('active');
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

    backBtn.addEventListener('click', () => {
        if (hls) {
            hls.destroy();
            hls = null;
        }
        clearYouTubeIframe();
        videoPlayer.style.display = 'block';
        videoPlayer.pause();
        videoPlayer.removeAttribute('src');
        videoPlayer.load();
        errorMsg.style.display = 'none';
        videoContainer.style.position = '';
        playerScreen.classList.remove('active');
        homeScreen.classList.add('active');
        currentMovie = null;
        currentEpIdx = 0;
        filterMovies();
        window.scrollTo({top: 0, behavior: 'smooth'});
    });

    async function fetchMovies() {
        try {
            const res = await fetch('movies.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('Sai định dạng JSON');
            moviesAll = data;
            renderMovies(moviesAll);
        } catch (err) {
            console.error(err);
            movieContainer.innerHTML = '<div class="no-result">⚠️ Không thể tải danh sách phim từ movies.json. Kiểm tra file hoặc thử lại sau.</div>';
        }
    }

    fetchMovies();
})();
