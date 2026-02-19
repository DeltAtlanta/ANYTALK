# p Plan étape par étape — AnyTalk (upload des fichiers et Firebase)

Suis ces étapes dans l’ordre.

---

## Étape 1 : Ouvrir la console Firebase

1. Va sur **https://console.firebase.google.com**
2. Clique sur ton projet **anytalk770** (ou le nom de ton projet)
3. Reste sur la page d’accueil du projet

---

## Étape 2 : Passer à un forfait qui permet Storage

Firebase affiche : *« Pour utiliser Storage, vous devez faire passer votre projet à un forfait supérieur »*.

1. Clique sur le bouton orange **« Changer le forfait du projet »**
2. Tu arrives sur la page **Tarification** : sélectionne le forfait **Blaze** (facturation à l’usage)
3. **Important** : Blaze a un **quota gratuit** (ex. 5 Go de stockage, 1 Go/jour de téléchargement). Pour un petit projet comme AnyTalk, tu restes souvent dans le gratuit.
4. Si demandé, ajoute un moyen de paiement (carte). Tu ne seras prélevé que si tu dépasses les seuils gratuits.
5. Une fois le forfait Blaze activé, reviens dans la console Firebase (menu **Build** → **Storage**).

---

## Étape 3 : Activer Storage (stockage des fichiers)

1. Dans le menu de gauche : **Build** (ou **Créer**) → **Storage**
2. Tu devrais maintenant voir **« Get started »** / **« Démarrer »** (plus le message de forfait) :
   - Clique dessus
   - Choisis un **emplacement** (ex. `europe-west1`) si demandé
   - Valide (les règles par défaut suffisent pour l’instant)
3. Une fois activé, tu vois l’onglet **Files** (Fichiers) : passe à l’étape 4

---

## Étape 4 : Noter le nom du bucket

1. Toujours dans **Storage**, va dans l’onglet **Files**
2. En haut, tu vois une URL du type : `gs://quelquechose.appspot.com` ou `gs://quelquechose.firebasestorage.app`
3. Note la partie **sans** `gs://` :
   - soit **`anytalk770.appspot.com`**
   - soit **`anytalk770.firebasestorage.app`**

---

## Étape 5 : Mettre le bon bucket dans le projet

1. Ouvre le fichier **`firebase-config.js`** dans ton éditeur
2. Repère la ligne :  
   `storageBucket: "anytalk770.firebasestorage.app",`
3. Remplace par le nom que tu as noté à l’étape 3 :
   - Si c’est l’ancien format :  
     `storageBucket: "anytalk770.appspot.com",`
   - Si c’est le nouveau format :  
     `storageBucket: "anytalk770.firebasestorage.app",`
4. Enregistre le fichier

---

## Étape 6 : Déployer les règles Storage

1. Ouvre un **terminal** (ou l’invite de commandes)
2. Va dans le dossier du projet AnyTalk (là où se trouvent `firebase.json`, `storage.rules`, etc.)  
   Exemple :  
   `cd /Volumes/UnionSine/AnyTalk.1`
3. Connecte-toi à Firebase si ce n’est pas déjà fait :  
   `firebase login`
4. Déploie **uniquement** les règles Storage :  
   `firebase deploy --only storage`
5. Attends le message du type : **« Deploy complete »**

---

## Étape 7 : Lancer le site en local (pas en fichier ouvert)

1. Dans le terminal, toujours à la racine du projet :
   - Si tu utilises npm :  
     `npm run serve`
   - Ou un autre serveur (ex. `npx serve .`, ou ton outil habituel)
2. Ouvre le site dans le navigateur avec l’URL indiquée (ex. **http://localhost:8000**)
3. **Ne pas** ouvrir le site en double-cliquant sur un fichier `.html` (pas d’URL en `file://`)

---

## Étape 8 : Tester l’upload (profil écoutant)

1. Connecte-toi au site avec un **compte écoutant**
2. Va sur la page **profil écoutant** (écoutant.html)
3. Remplis au moins : nom, prénom, téléphone, email, date de naissance (si demandés)
4. Dans **Carte d’identité** :
   - Clique sur le champ **fichier**
   - Choisis un fichier **PNG, JPG ou PDF**
   - Attends le message **« Document joint et enregistré. Voir »**
5. Si un message **d’erreur en rouge** s’affiche :
   - Lis-le : il indique quoi faire (règles, bucket, connexion)
   - Ouvre la **console du navigateur** (F12 → onglet **Console**) et regarde l’erreur détaillée

---

## Étape 9 : Vérifier côté admin (optionnel)

1. Connecte-toi avec le **compte admin** (UID configuré dans le code)
2. Va sur la page **admin**
3. Dans la liste des écoutants en attente, tu dois voir :
   - **Carte d’identité : Voir le document** (lien cliquable)
   - **CV : Voir le document** (si un CV a été joint)

---

## Récapitulatif

| Étape | Action |
|-------|--------|
| 1 | Ouvrir Firebase Console, projet anytalk770 |
| 2 | **Changer le forfait du projet** → forfait Blaze (obligatoire pour Storage) |
| 3 | Build → Storage → Get started |
| 4 | Noter le nom du bucket (Storage → Files) |
| 5 | Mettre ce nom dans `firebase-config.js` → `storageBucket` |
| 6 | Terminal : `firebase deploy --only storage` |
| 7 | Lancer le site (ex. `npm run serve`) et ouvrir en http://localhost:... |
| 8 | Tester l’upload sur le profil écoutant |
| 9 | Vérifier en admin que les documents s’affichent |

Si une étape bloque, le message d’erreur sous le champ fichier ou dans la console (F12) te dira quoi corriger. Le fichier **FIREBASE-STORAGE.md** contient aussi des précisions sur le dépannage.
