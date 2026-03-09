# Notes musicales – Choisir un titre et mettre une note

Site centré sur une seule idée : **choisir une musique ou un album et lui mettre une note**.  
Frontend **HTML/CSS/JS** et backend **Node.js / Express / sql.js**.

## Fonctionnalités

- **Page principale** : liste des morceaux et des albums. Chaque titre a un bouton « Noter ».
- **Notation** : en cliquant sur « Noter », une modale s’ouvre (note de 1 à 10 + commentaire optionnel). Il faut être connecté.
- **Connexion** : pseudo unique (sans mot de passe). Onglet « Mes notes » pour se connecter.
- **Mes notes** : liste de tout ce que vous avez noté (morceaux et albums), avec score et commentaire.
- **Recherche** : barre de recherche pour filtrer morceaux et albums par titre ou artiste.

## Prérequis

- Node.js (>= 18 recommandé)
- npm

## Installation

```bash
cd ANYTALK
npm install
```

## Lancement en développement

```bash
npm run dev
```

Le serveur sera disponible sur `http://localhost:3000`.

## Usage

1. Lancer le serveur : `npm run dev`, puis ouvrir http://localhost:3000
2. **Se connecter** : onglet « Mes notes » → saisir un pseudo → Entrer.
3. **Noter** : onglet « Noter » → choisir un morceau ou un album → cliquer sur « Noter » → indiquer une note (1–10) et éventuellement un commentaire → Enregistrer.
4. **Mes notes** : voir toutes vos notes (morceaux et albums) avec score et commentaire.
5. **Recherche** : taper dans la barre pour filtrer la liste des titres.

### Connexion Spotify (optionnelle)

Pour afficher votre **bibliothèque Spotify** (titres sauvegardés + pochettes) sur le site :

1. Créez une application sur [Spotify for Developers](https://developer.spotify.com/dashboard).
2. Dans les paramètres de l’app, ajoutez en **Redirect URI** : `http://localhost:3000/api/spotify/callback`
3. Créez un fichier `.env` à la racine du projet (voir `.env.example`) avec :
   - `SPOTIFY_CLIENT_ID` = l’ID client de votre app
   - `SPOTIFY_CLIENT_SECRET` = le secret client
4. Redémarrez le serveur. Une fois connecté avec votre pseudo, un bouton **« Connecter Spotify »** apparaît ; après autorisation, vos titres sauvegardés s’affichent avec les pochettes. Vous pouvez les noter comme les autres titres.

## Structure du projet

- `server.js` : Express + sql.js (base SQLite en mémoire, persistée dans `music.db`). Routes : auth, tracks, albums, ratings, search, users/:id/ratings.
- `public/index.html` : page unique avec vue « Noter » (listes morceaux/albums) et vue « Mes notes ».
- `public/styles.css` : thème sobre, accent rouge (type Radio-Canada).
- `public/app.js` : chargement listes, recherche, modale de notation, connexion, affichage des notes.

