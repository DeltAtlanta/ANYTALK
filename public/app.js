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

const trackListEl = document.getElementById('trackList');
const albumListEl = document.getElementById('albumList');
const searchInput = document.getElementById('searchInput');
const searchResult = document.getElementById('searchResult');
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
const loginBlock = document.getElementById('loginBlock');
const loginForm = document.getElementById('loginForm');
const userName = document.getElementById('userName');
const btnLogin = document.getElementById('btnLogin');
const sectionTracks = document.getElementById('sectionTracks');
const sectionAlbums = document.getElementById('sectionAlbums');
const spotifyConnectBlock = document.getElementById('spotifyConnectBlock');
const spotifyLibraryBlock = document.getElementById('spotifyLibraryBlock');
const spotifyList = document.getElementById('spotifyList');
const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');
const spotifyLoadMoreBtn = document.getElementById('spotifyLoadMore');

let spotifyLibraryOffset = 0;
let spotifyLibraryTotal = 0;
let spotifyItems = [];

function showView(viewId) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('is-visible'));
  const view = document.getElementById(viewId);
  if (view) view.classList.add('is-visible');
  document.querySelectorAll('.nav-link').forEach((b) => b.classList.toggle('is-active', b.dataset.view === viewId));
}

function ensureUser() {
  if (!currentUser) {
    alert('Connectez-vous pour noter un titre.');
    showView('viewMyRatings');
    return false;
  }
  return true;
}

function renderTrackItem(t, fromSearch = false) {
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="item-info">
      <p class="item-title">${escapeHtml(t.title)}</p>
      <p class="item-meta">${escapeHtml(t.artist_name || 'Artiste inconnu')}${t.genre ? ' · ' + escapeHtml(t.genre) : ''}</p>
    </div>
    <button type="button" class="btn btn-noter primary small" data-type="track" data-id="${t.id}" data-title="${escapeAttr(t.title)}" data-meta="${escapeAttr((t.artist_name || '') + (t.genre ? ' · ' + t.genre : ''))}">Noter</button>
  `;
  li.querySelector('.btn-noter').addEventListener('click', () => openRateModal('track', t));
  return li;
}

function renderAlbumItem(a, fromSearch = false) {
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="item-info">
      <p class="item-title">${escapeHtml(a.title)}</p>
      <p class="item-meta">${escapeHtml(a.artist_name || 'Artiste inconnu')}${a.release_year ? ' · ' + a.release_year : ''}${a.genre ? ' · ' + escapeHtml(a.genre) : ''}</p>
    </div>
    <button type="button" class="btn btn-noter primary small" data-type="album" data-id="${a.id}" data-title="${escapeAttr(a.title)}" data-meta="${escapeAttr((a.artist_name || '') + (a.release_year ? ' · ' + a.release_year : ''))}">Noter</button>
  `;
  li.querySelector('.btn-noter').addEventListener('click', () => openRateModal('album', a));
  return li;
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
  rateDialogTitle.textContent = item.title;
  rateDialogMeta.textContent =
    type === 'track'
      ? [item.artist_name, item.genre].filter(Boolean).join(' · ') || 'Morceau'
      : [item.artist_name, item.release_year].filter(Boolean).join(' · ') || 'Album';
  rateScore.value = 7;
  rateScoreValue.textContent = '7';
  rateForm.querySelector('[name="comment"]').value = '';
  rateDialog.showModal();
}

function renderLists() {
  trackListEl.innerHTML = '';
  albumListEl.innerHTML = '';
  tracks.forEach((t) => trackListEl.appendChild(renderTrackItem(t)));
  albums.forEach((a) => albumListEl.appendChild(renderAlbumItem(a)));
  if (tracks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-msg';
    empty.textContent = 'Aucun morceau pour le moment.';
    trackListEl.appendChild(empty);
  }
  if (albums.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-msg';
    empty.textContent = 'Aucun album pour le moment.';
    albumListEl.appendChild(empty);
  }
}

function filterLists(q) {
  const lower = q.toLowerCase().trim();
  if (!lower) {
    renderLists();
    searchResult.classList.remove('is-visible');
    sectionTracks.style.display = '';
    sectionAlbums.style.display = '';
    return;
  }
  const filteredTracks = tracks.filter(
    (t) =>
      (t.title && t.title.toLowerCase().includes(lower)) ||
      (t.artist_name && t.artist_name.toLowerCase().includes(lower))
  );
  const filteredAlbums = albums.filter(
    (a) =>
      (a.title && a.title.toLowerCase().includes(lower)) ||
      (a.artist_name && a.artist_name.toLowerCase().includes(lower))
  );
  searchResult.classList.add('is-visible');
  searchResult.innerHTML = '';
  if (filteredTracks.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'result-section';
    sec.innerHTML = '<h3>Morceaux</h3>';
    const ul = document.createElement('ul');
    ul.className = 'item-list';
    filteredTracks.forEach((t) => ul.appendChild(renderTrackItem(t)));
    sec.appendChild(ul);
    searchResult.appendChild(sec);
  }
  if (filteredAlbums.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'result-section';
    sec.innerHTML = '<h3>Albums</h3>';
    const ul = document.createElement('ul');
    ul.className = 'item-list';
    filteredAlbums.forEach((a) => ul.appendChild(renderAlbumItem(a)));
    sec.appendChild(ul);
    searchResult.appendChild(sec);
  }
  if (filteredTracks.length === 0 && filteredAlbums.length === 0) {
    searchResult.innerHTML = '<p class="empty-msg">Aucun résultat.</p>';
  }
  sectionTracks.style.display = lower ? 'none' : '';
  sectionAlbums.style.display = lower ? 'none' : '';
}

async function loadTracksAndAlbums() {
  try {
    const [tRes, aRes] = await Promise.all([
      api.get('/api/tracks?limit=100'),
      api.get('/api/albums?limit=100')
    ]);
    tracks = tRes.tracks || [];
    albums = aRes.albums || [];
    renderLists();
  } catch {
    trackListEl.innerHTML = '<li class="empty-msg">Impossible de charger les morceaux.</li>';
    albumListEl.innerHTML = '<li class="empty-msg">Impossible de charger les albums.</li>';
  }
}

function updateUserUI() {
  if (currentUser) {
    userName.textContent = currentUser.username;
    btnLogin.textContent = 'Changer';
    myRatingsIntro.textContent = 'Les titres que vous avez notés.';
    loginBlock.style.display = 'none';
  } else {
    userName.textContent = 'Non connecté';
    btnLogin.textContent = 'Entrer';
    myRatingsIntro.textContent = 'Connectez-vous pour voir les titres que vous avez notés.';
    loginBlock.style.display = 'block';
    myRatingsList.innerHTML = '';
  }
}

async function loadMyRatings() {
  myRatingsList.innerHTML = '';
  if (!currentUser) {
    updateUserUI();
    return;
  }
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
  updateUserUI();
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

async function checkSpotifyStatus() {
  if (!currentUser) {
    spotifyConnectBlock.style.display = 'block';
    spotifyLibraryBlock.style.display = 'none';
    spotifyConnectBtn.href = '#';
    spotifyConnectBtn.textContent = 'Connectez-vous d’abord (onglet Mes notes)';
    return;
  }
  spotifyConnectBtn.textContent = 'Connecter Spotify';
  spotifyConnectBtn.href = `/api/spotify/auth?userId=${currentUser.id}`;
  try {
    const { connected } = await api.get(`/api/spotify/status?userId=${currentUser.id}`);
    if (connected) {
      spotifyConnectBlock.style.display = 'none';
      spotifyLibraryBlock.style.display = 'block';
      spotifyItems = [];
      spotifyLibraryOffset = 0;
      await loadSpotifyLibrary(0);
    } else {
      spotifyConnectBlock.style.display = 'block';
      spotifyLibraryBlock.style.display = 'none';
    }
  } catch {
    spotifyConnectBlock.style.display = 'block';
    spotifyLibraryBlock.style.display = 'none';
  }
}

async function loadSpotifyLibrary(offset) {
  if (!currentUser) return;
  try {
    const data = await api.get(
      `/api/spotify/library?userId=${currentUser.id}&offset=${offset}&limit=50`
    );
    if (offset === 0) spotifyItems = [];
    spotifyItems = spotifyItems.concat(data.items || []);
    spotifyLibraryTotal = data.total ?? 0;
    spotifyLibraryOffset = spotifyItems.length;
    renderSpotifyList();
    spotifyLoadMoreBtn.style.display =
      spotifyItems.length < spotifyLibraryTotal ? 'block' : 'none';
  } catch (e) {
    spotifyList.innerHTML = '<li class="empty-msg">Impossible de charger la bibliothèque Spotify.</li>';
    spotifyLoadMoreBtn.style.display = 'none';
  }
}

function renderSpotifyList() {
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

function init() {
  restoreUser();
  loadTracksAndAlbums();

  const params = new URLSearchParams(window.location.search);
  if (params.get('spotify') === 'ok') {
    window.history.replaceState({}, '', window.location.pathname);
    if (currentUser) checkSpotifyStatus();
  } else if (params.get('spotify') === 'error') {
    window.history.replaceState({}, '', window.location.pathname);
    alert('Connexion Spotify annulée ou erreur.');
  }
  if (currentUser) checkSpotifyStatus();

  spotifyLoadMoreBtn.addEventListener('click', () => loadSpotifyLibrary(spotifyLibraryOffset));

  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'home') {
        showView('viewHome');
        if (currentUser) checkSpotifyStatus();
      }
      if (view === 'my-ratings') {
        showView('viewMyRatings');
        loadMyRatings();
      }
    });
  });

  searchInput.addEventListener('input', () => filterLists(searchInput.value));

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = new FormData(loginForm).get('username');
    if (!name || !name.trim()) return;
    try {
      const { user } = await api.post('/api/auth/login', { username: name.trim() });
      currentUser = user;
      localStorage.setItem('anytalk:user', JSON.stringify(user));
      updateUserUI();
      loadMyRatings();
      loginForm.reset();
    } catch {
      alert('Erreur de connexion.');
    }
  });

  btnLogin.addEventListener('click', () => {
    showView('viewMyRatings');
    loadMyRatings();
  });

  rateScore.addEventListener('input', () => {
    rateScoreValue.textContent = rateScore.value;
  });

  document.getElementById('rateCancel').addEventListener('click', () => rateDialog.close());

  rateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const fd = new FormData(rateForm);
    const type = fd.get('type');
    const score = parseInt(fd.get('score'), 10);
    const comment = fd.get('comment') || null;
    const payload = {
      userId: currentUser.id,
      score,
      comment
    };
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
