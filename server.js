require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'music.db');

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db = null;
let persistTimer = null;

function persist() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (e) {
    console.error('Persist DB:', e.message);
  }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 800);
}

function getRow(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function getRows(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function runMigrations(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      genre TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist_id INTEGER,
      cover_url TEXT,
      release_year INTEGER,
      genre TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist_id INTEGER,
      album_id INTEGER,
      genre TEXT,
      audio_url TEXT,
      duration_seconds INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_id) REFERENCES artists(id),
      FOREIGN KEY (album_id) REFERENCES albums(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      track_id INTEGER,
      album_id INTEGER,
      artist_id INTEGER,
      score INTEGER NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (track_id) REFERENCES tracks(id),
      FOREIGN KEY (album_id) REFERENCES albums(id),
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (track_id) REFERENCES tracks(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS playlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      position INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id),
      FOREIGN KEY (track_id) REFERENCES tracks(id)
    )
  `);
  try {
    database.run('ALTER TABLE tracks ADD COLUMN cover_url TEXT');
  } catch (_) {}
  database.run(`
    CREATE TABLE IF NOT EXISTS spotify_tokens (
      user_id INTEGER PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

const SAMPLE_MP3 = 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3';

function seedDatabase(database) {
  database.run(
    `INSERT INTO artists (name, genre) VALUES 
     ('Frank Ocean', 'R&B'), ('Daft Punk', 'Electro'), ('Loyle Carner', 'Rap')`
  );
  database.run(
    `INSERT INTO albums (title, artist_id, release_year, genre) VALUES 
     ('Blonde', 1, 2016, 'R&B'), 
     ('Random Access Memories', 2, 2013, 'Electro'),
     ('Not Waving, But Drowning', 3, 2019, 'Rap')`
  );
  database.run(
    `INSERT INTO tracks (title, artist_id, album_id, genre, audio_url, duration_seconds) VALUES 
     ('Nikes', 1, 1, 'R&B', ?, 300),
     ('Pink + White', 1, 1, 'R&B', ?, 180),
     ('Get Lucky', 2, 2, 'Electro', ?, 369),
     ('Instant Crush', 2, 2, 'Electro', ?, 337),
     ('Loose Ends', 3, 3, 'Rap', ?, 240)`,
    [SAMPLE_MP3, SAMPLE_MP3, SAMPLE_MP3, SAMPLE_MP3, SAMPLE_MP3]
  );
  console.log('Base initialisée avec artistes, albums et morceaux.');
}

function handleDbError(res, err) {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
}

const GENRES = [
  'Rap',
  'Jazz',
  'Rock',
  'Soul',
  'Musique classique',
  'Pop',
  'Electro',
  'R&B'
];

// --- Spotify (optionnel : définir SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET + REDIRECT_URI) ---
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${PORT}/api/spotify/callback`;
const SPOTIFY_SCOPES = 'user-library-read';

async function spotifyTokenExchange(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) throw new Error('Spotify token error');
  return res.json();
}

async function spotifyRefreshToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) throw new Error('Spotify refresh error');
  return res.json();
}

async function spotifyGetAccessToken(userId) {
  const row = getRow('SELECT access_token, refresh_token, expires_at FROM spotify_tokens WHERE user_id = ?', [userId]);
  if (!row) return null;
  const now = Math.floor(Date.now() / 1000);
  if (row.expires_at > now + 60) return row.access_token;
  if (!row.refresh_token) return null;
  const data = await spotifyRefreshToken(row.refresh_token);
  const expiresAt = now + (data.expires_in || 3600);
  db.run(
    'UPDATE spotify_tokens SET access_token = ?, expires_at = ? WHERE user_id = ?',
    [data.access_token, expiresAt, userId]
  );
  if (data.refresh_token) {
    db.run('UPDATE spotify_tokens SET refresh_token = ? WHERE user_id = ?', [data.refresh_token, userId]);
  }
  schedulePersist();
  return data.access_token;
}

async function spotifyFetchSavedTracks(accessToken, offset = 0, limit = 50) {
  const res = await fetch(
    `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('Spotify API error');
  return res.json();
}

// --- Démarrage : charger ou créer la base ---
async function start() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  runMigrations(db);
  const row = getRow('SELECT COUNT(*) AS c FROM tracks');
  if (row && row.c === 0) {
    seedDatabase(db);
    persist();
  }

  // --- Routes API ---
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username } = req.body;
      if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Nom d’utilisateur requis' });
      }
      const clean = username.trim().toLowerCase();
      const row = getRow('SELECT * FROM users WHERE LOWER(username) = ?', [clean]);
      if (row) return res.json({ user: row });
      db.run('INSERT INTO users (username) VALUES (?)', [username.trim()]);
      const newUser = getRow('SELECT * FROM users WHERE id = last_insert_rowid()');
      schedulePersist();
      res.status(201).json({ user: newUser });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.get('/api/genres', (req, res) => {
    res.json({ genres: GENRES });
  });

  app.post('/api/artists', (req, res) => {
    try {
      const { name, genre } = req.body;
      if (!name) return res.status(400).json({ error: 'Nom requis' });
      db.run('INSERT INTO artists (name, genre) VALUES (?, ?)', [name, genre || null]);
      const row = getRow('SELECT * FROM artists WHERE id = last_insert_rowid()');
      schedulePersist();
      res.status(201).json({ artist: row });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.post('/api/albums', (req, res) => {
    try {
      const { title, artistId, coverUrl, releaseYear, genre } = req.body;
      if (!title) return res.status(400).json({ error: 'Titre requis' });
      db.run(
        'INSERT INTO albums (title, artist_id, cover_url, release_year, genre) VALUES (?, ?, ?, ?, ?)',
        [title, artistId || null, coverUrl || null, releaseYear || null, genre || null]
      );
      const row = getRow('SELECT * FROM albums WHERE id = last_insert_rowid()');
      schedulePersist();
      res.status(201).json({ album: row });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.post('/api/tracks', (req, res) => {
    try {
      const { title, artistId, albumId, genre, audioUrl, durationSeconds } = req.body;
      if (!title) return res.status(400).json({ error: 'Titre requis' });
      db.run(
        `INSERT INTO tracks (title, artist_id, album_id, genre, audio_url, duration_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          title,
          artistId || null,
          albumId || null,
          genre || null,
          audioUrl || null,
          durationSeconds || null
        ]
      );
      const row = getRow('SELECT * FROM tracks WHERE id = last_insert_rowid()');
      schedulePersist();
      res.status(201).json({ track: row });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.post('/api/ratings', (req, res) => {
    try {
      const { userId, score, comment, trackId, albumId, artistId } = req.body;
      if (!userId || !score) return res.status(400).json({ error: 'Utilisateur et note requis' });
      db.run(
        `INSERT INTO ratings (user_id, track_id, album_id, artist_id, score, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          trackId || null,
          albumId || null,
          artistId || null,
          score,
          comment || null
        ]
      );
      const row = getRow('SELECT * FROM ratings WHERE id = last_insert_rowid()');
      schedulePersist();
      res.status(201).json({ rating: row });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.post('/api/favorites', (req, res) => {
    try {
      const { userId, trackId } = req.body;
      if (!userId || !trackId) {
        return res.status(400).json({ error: 'Utilisateur et morceau requis' });
      }
      const existing = getRow(
        'SELECT id FROM favorites WHERE user_id = ? AND track_id = ?',
        [userId, trackId]
      );
      if (existing) return res.status(200).json({ id: existing.id, already: true });
      db.run('INSERT INTO favorites (user_id, track_id) VALUES (?, ?)', [userId, trackId]);
      const id = getRow('SELECT last_insert_rowid() as id').id;
      schedulePersist();
      res.status(201).json({ id });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.post('/api/playlists', (req, res) => {
    try {
      const { userId, name } = req.body;
      if (!userId || !name) {
        return res.status(400).json({ error: 'Utilisateur et nom requis' });
      }
      db.run('INSERT INTO playlists (user_id, name) VALUES (?, ?)', [userId, name]);
      const row = getRow('SELECT * FROM playlists WHERE id = last_insert_rowid()');
      schedulePersist();
      res.status(201).json({ playlist: row });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.post('/api/playlists/:playlistId/items', (req, res) => {
    try {
      const playlistId = req.params.playlistId;
      const { trackId } = req.body;
      if (!trackId) return res.status(400).json({ error: 'Morceau requis' });
      db.run(
        `INSERT INTO playlist_items (playlist_id, track_id, position)
         SELECT ?, ?, COALESCE(MAX(position), 0) + 1 FROM playlist_items WHERE playlist_id = ?`,
        [playlistId, trackId, playlistId]
      );
      const id = getRow('SELECT last_insert_rowid() as id').id;
      schedulePersist();
      res.status(201).json({ id });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.get('/api/search', (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      if (!q) return res.json({ artists: [], albums: [], tracks: [] });
      const like = `%${q}%`;
      const artists = getRows('SELECT * FROM artists WHERE name LIKE ? LIMIT 10', [like]);
      const albums = getRows('SELECT * FROM albums WHERE title LIKE ? LIMIT 10', [like]);
      const tracks = getRows(
        `SELECT t.*, a.name AS artist_name
         FROM tracks t LEFT JOIN artists a ON t.artist_id = a.id
         WHERE t.title LIKE ? LIMIT 15`,
        [like]
      );
      res.json({ artists, albums, tracks });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.get('/api/tracks', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const tracks = getRows(
        `SELECT t.*, a.name AS artist_name
         FROM tracks t LEFT JOIN artists a ON t.artist_id = a.id
         ORDER BY t.created_at DESC LIMIT ?`,
        [limit]
      );
      res.json({ tracks: tracks || [] });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.get('/api/albums', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const albums = getRows(
        `SELECT al.*, a.name AS artist_name
         FROM albums al LEFT JOIN artists a ON al.artist_id = a.id
         ORDER BY al.created_at DESC LIMIT ?`,
        [limit]
      );
      res.json({ albums: albums || [] });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.get('/api/trends', (req, res) => {
    try {
      const rows = getRows(
        `SELECT t.id, t.title, t.genre, t.audio_url, a.name AS artist_name,
                AVG(r.score) AS avg_score, COUNT(r.id) AS rating_count
         FROM tracks t
         LEFT JOIN artists a ON t.artist_id = a.id
         LEFT JOIN ratings r ON r.track_id = t.id
         GROUP BY t.id HAVING rating_count > 0
         ORDER BY avg_score DESC, rating_count DESC LIMIT 12`
      );
      if (rows && rows.length > 0) return res.json({ tracks: rows });
      const fallback = getRows(
        `SELECT t.id, t.title, t.genre, t.audio_url, a.name AS artist_name
         FROM tracks t LEFT JOIN artists a ON t.artist_id = a.id
         ORDER BY t.created_at DESC LIMIT 12`
      );
      const withScores = (fallback || []).map((r) => ({
        ...r,
        avg_score: null,
        rating_count: 0
      }));
      res.json({ tracks: withScores });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.get('/api/recommendations/:userId', (req, res) => {
    try {
      const userId = req.params.userId;
      const favoriteGenres = getRows(
        `SELECT t.genre, AVG(r.score) AS avg_score
         FROM ratings r JOIN tracks t ON r.track_id = t.id
         WHERE r.user_id = ? AND t.genre IS NOT NULL
         GROUP BY t.genre ORDER BY avg_score DESC LIMIT 3`,
        [userId]
      );
      if (!favoriteGenres || favoriteGenres.length === 0) {
        const tracks = getRows(
          `SELECT t.*, a.name AS artist_name
           FROM tracks t LEFT JOIN artists a ON t.artist_id = a.id
           ORDER BY t.created_at DESC LIMIT 12`
        );
        return res.json({ mode: 'recent', favoriteGenres: [], tracks: tracks || [] });
      }
      const genres = favoriteGenres.map((g) => g.genre);
      const placeholders = genres.map(() => '?').join(',');
      const tracks = getRows(
        `SELECT t.*, a.name AS artist_name
         FROM tracks t LEFT JOIN artists a ON t.artist_id = a.id
         WHERE t.genre IN (${placeholders}) ORDER BY RANDOM() LIMIT 16`,
        genres
      );
      res.json({ mode: 'personalized', favoriteGenres, tracks: tracks || [] });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.get('/api/users/:userId/ratings', (req, res) => {
    try {
      const userId = req.params.userId;
      const user = getRow('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
      const trackRatings = getRows(
        `SELECT r.id, r.score, r.comment, r.created_at, 'track' AS type,
                t.title AS item_title, a.name AS artist_name, r.track_id AS item_id
         FROM ratings r
         JOIN tracks t ON r.track_id = t.id
         LEFT JOIN artists a ON t.artist_id = a.id
         WHERE r.user_id = ? AND r.track_id IS NOT NULL`,
        [userId]
      );
      const albumRatings = getRows(
        `SELECT r.id, r.score, r.comment, r.created_at, 'album' AS type,
                al.title AS item_title, a.name AS artist_name, r.album_id AS item_id
         FROM ratings r
         JOIN albums al ON r.album_id = al.id
         LEFT JOIN artists a ON al.artist_id = a.id
         WHERE r.user_id = ? AND r.album_id IS NOT NULL`,
        [userId]
      );
      const ratings = [...(trackRatings || []), ...(albumRatings || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);
      res.json({ user, ratings });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  // --- Spotify ---
  app.get('/api/spotify/auth', (req, res) => {
    const userId = req.query.userId;
    if (!SPOTIFY_CLIENT_ID || !userId) {
      return res.redirect('/?spotify=error');
    }
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: SPOTIFY_REDIRECT_URI,
      scope: SPOTIFY_SCOPES,
      state: userId
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  });

  app.get('/api/spotify/callback', async (req, res) => {
    const { code, state: userId } = req.query;
    if (!code || !userId) return res.redirect('/?spotify=error');
    try {
      const data = await spotifyTokenExchange(code);
      const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
      const existing = getRow('SELECT user_id FROM spotify_tokens WHERE user_id = ?', [userId]);
      if (existing) {
        db.run(
          'UPDATE spotify_tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?',
          [data.access_token, data.refresh_token || null, expiresAt, userId]
        );
      } else {
        db.run(
          'INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
          [userId, data.access_token, data.refresh_token || null, expiresAt]
        );
      }
      schedulePersist();
      res.redirect('/?spotify=ok');
    } catch (e) {
      console.error('Spotify callback:', e);
      res.redirect('/?spotify=error');
    }
  });

  app.get('/api/spotify/status', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId requis' });
    const row = getRow('SELECT 1 FROM spotify_tokens WHERE user_id = ?', [userId]);
    res.json({ connected: !!row });
  });

  app.get('/api/spotify/library', async (req, res) => {
    const userId = req.query.userId;
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    if (!userId) return res.status(400).json({ error: 'userId requis' });
    try {
      const accessToken = await spotifyGetAccessToken(userId);
      if (!accessToken) return res.status(401).json({ error: 'Spotify non connecté' });
      const data = await spotifyFetchSavedTracks(accessToken, offset, limit);
      const items = (data.items || []).map((item) => {
        const t = item.track || {};
        const album = t.album || {};
        const cover = album.images && album.images.length > 0 ? album.images[0].url : null;
        const artists = (t.artists || []).map((a) => a.name).join(', ');
        return {
          id: t.id,
          name: t.name,
          artists,
          albumName: album.name,
          cover
        };
      });
      res.json({
        items,
        total: data.total ?? 0,
        offset: data.offset ?? offset,
        limit: data.limit ?? limit
      });
    } catch (e) {
      console.error('Spotify library:', e);
      res.status(500).json({ error: 'Impossible de charger la bibliothèque Spotify' });
    }
  });

  app.post('/api/spotify/track-from-spotify', (req, res) => {
    const { userId, name, artists, coverUrl } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'userId et name requis' });
    try {
      const artistName = artists || 'Artiste inconnu';
      let artist = getRow('SELECT id FROM artists WHERE LOWER(name) = ?', [artistName.toLowerCase().trim()]);
      if (!artist) {
        db.run('INSERT INTO artists (name) VALUES (?)', [artistName.trim()]);
        artist = getRow('SELECT id FROM artists WHERE id = last_insert_rowid()');
      }
      db.run(
        'INSERT INTO tracks (title, artist_id, genre, cover_url) VALUES (?, ?, ?, ?)',
        [name.trim(), artist.id, null, coverUrl || null]
      );
      const track = getRow('SELECT * FROM tracks WHERE id = last_insert_rowid()');
      const trackWithArtist = { ...track, artist_name: artistName };
      schedulePersist();
      res.status(201).json({ track: trackWithArtist });
    } catch (e) {
      handleDbError(res, e);
    }
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Serveur AnyTalk Music sur http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error('Démarrage impossible:', e);
  process.exit(1);
});
