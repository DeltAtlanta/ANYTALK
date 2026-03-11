const api = {
  async get(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Erreur');
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Erreur');
    }
    return res.json().catch(() => ({}));
  }
};

let currentUser = null;
let tracks = [];
let albums = [];
let spotifyItems = [];
let spotifyAlbumsItems = [];
let spotifyLibraryOffset = 0;
let spotifyLibraryTotal = 0;
let spotifyAlbumsOffset = 0;
let spotifyAlbumsTotal = 0;

const viewLanding = document.getElementById('viewLanding');
const viewApp = document.getElementById('viewApp');
const landingSpotifyBtn = document.getElementById('landingSpotifyBtn');
const navLinks = document.getElementById('navLinks');
const navRight = document.getElementById('navRight');
const userName = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');
const spotifyList = document.getElementById('spotifyList');
const spotifyLoadMoreBtn = document.getElementById('spotifyLoadMore');
const spotifyAlbumsList = document.getElementById('spotifyAlbumsList');
const spotifyAlbumsLoadMoreBtn = document.getElementById('spotifyAlbumsLoadMore');
const trackListEl = document.getElementById('trackList');
const albumListEl = document.getElementById('albumList');
const rateDialog = document.getElementById('rateDialog');
const rateForm = document.getElementById('rateForm');
const rateDialogTitle = document.getElementById('rateDialogTitle');
const rateDialogMeta = document.getElementById('rateDialogMeta');
const rateType = document.getElementById('rateType');
const rateTrackId = document.getElementById('rateTrackId');
const rateAlbumId = document.getElementById('rateAlbumId');
const rateScore = document.getElementById('rateScore');
const rateScoreValue = document.getElementById('rateScoreValue');
const myRatingsList = document.getElementById('myRatingsList');
const myRatingsIntro = document.getElementById('myRatingsIntro');

function showLanding(show) {
  viewLanding.classList.toggle('is-visible', show);
  viewApp.classList.toggle('is-visible', !show);
  navLinks.style.display = show ? 'none' : 'flex';
  navRight.style.display = show ? 'none' : 'flex';
}

function showView(viewId) {
  document.querySelectorAll('#viewApp .view').forEach((v) => v.classList.remove('is-visible'));
  const view = document.getElementById(viewId);
  if (view) view.classList.add('is-visible');
  document.querySelectorAll('.nav-link').forEach((b) => b.classList.toggle('is-active', b.dataset.view === viewId));
}

function ensureUser() {
  if (!currentUser) return false;
  return true;
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function openRateModal(type, item) {
  if (!ensureUser()) return;
  rateType.value = type;
  rateTrackId.value = type === 'track' ? item.id : '';
  rateAlbumId.value = type === 'album' ? item.id : '';
  rateDialogTitle.textContent = item.title || item.name;
  rateDialogMeta.textContent =
    type === 'track'
      ? [item.artist_name, item.genre].filter(Boolean).join(' · ') || 'Morceau'
      : [item.artist_name, item.release_year].filter(Boolean).join(' · ') || 'Album';
  rateScore.value = 7;
  rateScoreValue.textContent = '7';
  rateForm.querySelector('[name="comment"]').value = '';
  rateDialog.showModal();
}

function renderTrackItem(t) {
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="item-info">
      <p class="item-title">${escapeHtml(t.title)}</p>
      <p class="item-meta">${escapeHtml(t.artist_name || 'Artiste inconnu')}${t.genre ? ' · ' + escapeHtml(t.genre) : ''}</p>
    </div>
    <button type="button" class="btn btn-noter primary small">Noter</button>
  `;
  li.querySelector('.btn-noter').addEventListener('click', () => openRateModal('track', t));
  return li;
}

function renderAlbumItem(a) {
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="item-info">
      <p class="item-title">${escapeHtml(a.title)}</p>
      <p class="item-meta">${escapeHtml(a.artist_name || 'Artiste inconnu')}${a.release_year ? ' · ' + a.release_year : ''}</p>
    </div>
    <button type="button" class="btn btn-noter primary small">Noter</button>
  `;
  li.querySelector('.btn-noter').addEventListener('click', () => openRateModal('album', a));
  return li;
}

function renderSpotifyTracks() {
  spotifyList.innerHTML = '';
  spotifyItems.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${item.cover ? `<img class="spotify-cover" src="${escapeAttr(item.cover)}" alt="" loading="lazy" />` : '<div class="spotify-cover spotify-cover-placeholder"></div>'}
      <div class="spotify-info">
        <p class="spotify-title">${escapeHtml(item.name)}</p>
        <p class="spotify-artist">${escapeHtml(item.artists)}</p>
        <button type="button" class="btn btn-noter-spotify primary small">Noter</button>
      </div>
    `;
    li.querySelector('.btn-noter-spotify').addEventListener('click', () => noterSpotifyTrack(item));
    spotifyList.appendChild(li);
  });
  spotifyLoadMoreBtn.style.display = spotifyItems.length < spotifyLibraryTotal ? 'block' : 'none';
}

function renderSpotifyAlbums() {
  spotifyAlbumsList.innerHTML = '';
  spotifyAlbumsItems.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${item.cover ? `<img class="spotify-cover" src="${escapeAttr(item.cover)}" alt="" loading="lazy" />` : '<div class="spotify-cover spotify-cover-placeholder"></div>'}
      <div class="spotify-info">
        <p class="spotify-title">${escapeHtml(item.name)}</p>
        <p class="spotify-artist">${escapeHtml(item.artists)}${item.releaseYear ? ' · ' + item.releaseYear : ''}</p>
        <button type="button" class="btn btn-noter-spotify primary small">Noter</button>
      </div>
    `;
    li.querySelector('.btn-noter-spotify').addEventListener('click', () => noterSpotifyAlbum(item));
    spotifyAlbumsList.appendChild(li);
  });
  spotifyAlbumsLoadMoreBtn.style.display = spotifyAlbumsItems.length < spotifyAlbumsTotal ? 'block' : 'none';
}

async function noterSpotifyTrack(item) {
  if (!ensureUser()) return;
  try {
    const { track } = await api.post('/api/spotify/track-from-spotify', {
      userId: currentUser.id,
      name: item.name,
      artists: item.artists,
      coverUrl: item.cover || null
    });
    openRateModal('track', track);
  } catch {
    alert('Erreur lors de l’ajout du titre.');
  }
}

async function noterSpotifyAlbum(item) {
  if (!ensureUser()) return;
  try {
    const { album } = await api.post('/api/spotify/album-from-spotify', {
      userId: currentUser.id,
      name: item.name,
      artists: item.artists,
      coverUrl: item.cover || null,
      releaseYear: item.releaseYear || null
    });
    openRateModal('album', album);
  } catch {
    alert('Erreur lors de l’ajout de l’album.');
  }
}

async function loadSpotifyLibrary(offset) {
  if (!currentUser) return;
  try {
    const data = await api.get(`/api/spotify/library?userId=${currentUser.id}&offset=${offset}&limit=50`);
    if (offset === 0) spotifyItems = [];
    spotifyItems = spotifyItems.concat(data.items || []);
    spotifyLibraryTotal = data.total ?? 0;
    spotifyLibraryOffset = spotifyItems.length;
    renderSpotifyTracks();
  } catch (e) {
    spotifyList.innerHTML = '<li class="empty-msg">Impossible de charger vos titres likés.</li>';
    spotifyLoadMoreBtn.style.display = 'none';
  }
}

async function loadSpotifyAlbums(offset) {
  if (!currentUser) return;
  try {
    const data = await api.get(`/api/spotify/albums?userId=${currentUser.id}&offset=${offset}&limit=50`);
    if (offset === 0) spotifyAlbumsItems = [];
    spotifyAlbumsItems = spotifyAlbumsItems.concat(data.items || []);
    spotifyAlbumsTotal = data.total ?? 0;
    spotifyAlbumsOffset = spotifyAlbumsItems.length;
    renderSpotifyAlbums();
  } catch (e) {
    spotifyAlbumsList.innerHTML = '<li class="empty-msg">Impossible de charger vos albums likés.</li>';
    spotifyAlbumsLoadMoreBtn.style.display = 'none';
  }
}

function renderCatalogueLists() {
  trackListEl.innerHTML = '';
  albumListEl.innerHTML = '';
  tracks.forEach((t) => trackListEl.appendChild(renderTrackItem(t)));
  albums.forEach((a) => albumListEl.appendChild(renderAlbumItem(a)));
  if (tracks.length === 0) trackListEl.innerHTML = '<li class="empty-msg">Aucun morceau dans le catalogue.</li>';
  if (albums.length === 0) albumListEl.innerHTML = '<li class="empty-msg">Aucun album dans le catalogue.</li>';
}

async function loadTracksAndAlbums() {
  try {
    const [tRes, aRes] = await Promise.all([
      api.get('/api/tracks?limit=100'),
      api.get('/api/albums?limit=100')
    ]);
    tracks = tRes.tracks || [];
    albums = aRes.albums || [];
    renderCatalogueLists();
  } catch {
    trackListEl.innerHTML = '<li class="empty-msg">Impossible de charger le catalogue.</li>';
    albumListEl.innerHTML = '<li class="empty-msg">Impossible de charger le catalogue.</li>';
  }
}

function updateUserUI() {
  if (currentUser) {
    userName.textContent = currentUser.username;
    showLanding(false);
  } else {
    showLanding(true);
  }
}

async function loadMyRatings() {
  myRatingsList.innerHTML = '';
  if (!currentUser) return;
  try {
    const data = await api.get(`/api/users/${currentUser.id}/ratings`);
    const list = data.ratings || [];
    if (list.length === 0) {
      myRatingsList.innerHTML = '<li class="empty-msg">Vous n’avez pas encore noté de titre.</li>';
    } else {
      list.forEach((r) => {
        const li = document.createElement('li');
        const typeLabel = r.type === 'album' ? 'Album' : 'Morceau';
        li.innerHTML = `
          <div class="rating-item-title">${escapeHtml(r.item_title)}</div>
          <div class="rating-item-meta">${escapeHtml(r.artist_name || '')} · ${typeLabel}</div>
          <div class="rating-score">${r.score}/10</div>
          ${r.comment ? `<div class="rating-comment">${escapeHtml(r.comment)}</div>` : ''}
        `;
        myRatingsList.appendChild(li);
      });
    }
  } catch {
    myRatingsList.innerHTML = '<li class="empty-msg">Impossible de charger vos notes.</li>';
  }
}

function restoreUser() {
  try {
    const raw = localStorage.getItem('anytalk:user');
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.id) currentUser = user;
    }
  } catch {}
  updateUserUI();
}

async function initFromSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('userId');
  if (params.get('spotify') === 'ok' && userId) {
    window.history.replaceState({}, '', window.location.pathname);
    try {
      const data = await api.get(`/api/users/${userId}`);
      currentUser = data.user;
      localStorage.setItem('anytalk:user', JSON.stringify(currentUser));
      updateUserUI();
      spotifyItems = [];
      spotifyAlbumsItems = [];
      await loadSpotifyLibrary(0);
      await loadSpotifyAlbums(0);
      loadTracksAndAlbums();
    } catch (_) {}
    return true;
  }
  if (params.get('spotify') === 'error') {
    window.history.replaceState({}, '', window.location.pathname);
    alert('Connexion Spotify annulée ou erreur.');
  }
  return false;
}

function init() {
  restoreUser();

  const spotifyAuthPath = '/api/spotify/auth';
  if (window.location.protocol !== 'file:') {
    landingSpotifyBtn.href = window.location.origin + spotifyAuthPath;
  }
  landingSpotifyBtn.addEventListener('click', (e) => {
    if (window.location.protocol === 'file:') {
      e.preventDefault();
      alert('Ouvrez le site via le serveur pour vous connecter à Spotify.\n\nDans le terminal :\nnpm run dev\n\nPuis allez sur : http://localhost:3000');
      return;
    }
  });

  (async () => {
    const handled = await initFromSpotifyCallback();
    if (handled) return;
    if (currentUser) {
      const connected = await api.get(`/api/spotify/status?userId=${currentUser.id}`).then((r) => r.connected).catch(() => false);
      if (connected) {
        spotifyItems = [];
        spotifyAlbumsItems = [];
        await loadSpotifyLibrary(0);
        await loadSpotifyAlbums(0);
      }
      loadTracksAndAlbums();
    }
  })();

  btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    currentUser = null;
    localStorage.removeItem('anytalk:user');
    updateUserUI();
  });

  spotifyLoadMoreBtn.addEventListener('click', () => loadSpotifyLibrary(spotifyLibraryOffset));
  spotifyAlbumsLoadMoreBtn.addEventListener('click', () => loadSpotifyAlbums(spotifyAlbumsOffset));

  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'home') showView('viewHome');
      if (view === 'my-ratings') {
        showView('viewMyRatings');
        loadMyRatings();
      }
    });
  });

  rateScore.addEventListener('input', () => { rateScoreValue.textContent = rateScore.value; });
  document.getElementById('rateCancel').addEventListener('click', () => rateDialog.close());

  rateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const fd = new FormData(rateForm);
    const type = fd.get('type');
    const score = parseInt(fd.get('score'), 10);
    const comment = fd.get('comment') || null;
    const payload = { userId: currentUser.id, score, comment };
    if (type === 'track') payload.trackId = parseInt(rateTrackId.value, 10);
    else payload.albumId = parseInt(rateAlbumId.value, 10);
    try {
      await api.post('/api/ratings', payload);
      rateDialog.close();
      loadMyRatings();
    } catch {
      alert('Erreur lors de l’enregistrement de la note.');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
