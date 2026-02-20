// Configuration Firebase — projet anytalk770
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-analytics.js';

const firebaseConfig = {
  apiKey: "AIzaSyBfyX0zOiwdh8kXIAz9WNTRNwveD5UT2ns",
  authDomain: "anytalk770.firebaseapp.com",
  projectId: "anytalk770",
  // Bucket Storage : voir Firebase Console → Storage → Files (l’URL indique le bon nom).
  // Anciens projets = projectId.appspot.com ; nouveaux = projectId.firebasestorage.app
  storageBucket: "anytalk770.firebasestorage.app",
  messagingSenderId: "567731303400",
  appId: "1:567731303400:web:a35db3f33e49fd82492a5d",
  measurementId: "G-WPH9QC2853"
};

// Whereby — appels vidéo intégrés. Compte sur whereby.com → Embedded → votre subdomain (ex: "anytalk" → anytalk.whereby.com).
export const wherebyConfig = {
  subdomain: "any-talk",
  apiKey: "votre-api-key-whereby"
};

// Formspree — envoie les infos écoutant + pièces jointes par email à l'adresse configurée sur le formulaire.
export const FORMSPREE_FORM_ID = 'mqeddqpe';

const app = initializeApp(firebaseConfig);
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics (ne pas faire planter l'app si indisponible)
try {
  if (typeof window !== 'undefined') getAnalytics(app);
} catch (_) {}
