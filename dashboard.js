import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

const profileCard = document.getElementById('profile-card');
const roleChangeSection = document.getElementById('role-change-section');
const matchesGrid = document.getElementById('matches-grid');
const searchInput = document.getElementById('search-input');
const logoutBtn = document.getElementById('logout-btn');

function renderProfile(userData) {
  if (!profileCard) return;
  const name = userData?.pseudo || userData?.email || 'Utilisateur';
  profileCard.innerHTML = '<h3>' + (name || 'Mon profil') + '</h3><p class="form-hint">Appelant — Choisissez un écoutant ci-dessous.</p>';
}

function renderRoleChangeAppelant(userData) {
  if (!roleChangeSection) return;
  var inscritComme = userData?.inscritComme || userData?.role;
  if (inscritComme === 'ecoutant') {
    roleChangeSection.innerHTML = '<h3 class="section-title">Changement de rôle</h3><p class="form-hint">Vous êtes actuellement appelant.</p><button type="button" id="switch-ecoutant-btn" class="btn btn-secondary">Devenir écoutant</button>';
  } else {
    roleChangeSection.innerHTML = '';
  }
}

function renderEcoutantCard(d) {
  const data = d.data();
  const pseudo = data.pseudo || 'Écoutant';
  const experiencePublic = (data.experience_public || '').slice(0, 100);
  const bio = (data.bio || '').slice(0, 120);
  const url = 'reserver.html?id=' + encodeURIComponent(d.id);
  return '<a href="' + url + '" class="profile-card profile-card-link">' +
    '<strong>' + pseudo + '</strong><br>' +
    (experiencePublic ? '<span class="form-hint">' + experiencePublic + '</span><br>' : '') +
    (bio ? '<p class="form-hint" style="margin-top:0.5rem">' + bio + '</p>' : '') +
    '<span class="btn btn-primary" style="margin-top:0.75rem; display:inline-block">Réserver un créneau</span></a>';
}

function filterList(list, search) {
  return list.filter(function (d) {
    const data = d.data();
    return !search || (data.pseudo || '').toLowerCase().includes(search.toLowerCase());
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  const snap = await getDoc(doc(db, 'users', user.uid));
  const userData = snap.exists() ? snap.data() : {};
  const role = userData.badge?.type || userData.role;
  if (role !== 'appelant') {
    window.location.replace('ecoutant.html');
    return;
  }
  renderProfile(userData);
  renderRoleChangeAppelant(userData);

  var switchEcoutantBtn = document.getElementById('switch-ecoutant-btn');
  if (switchEcoutantBtn) {
    switchEcoutantBtn.addEventListener('click', async function () {
      switchEcoutantBtn.disabled = true;
      switchEcoutantBtn.textContent = 'Chargement…';
      try {
        await setDoc(doc(db, 'users', user.uid), {
          role: 'ecoutant',
          badge: { type: 'ecoutant' },
          validatedByAdmin: true
        }, { merge: true });
        window.location.replace('ecoutant.html');
      } catch (err) {
        switchEcoutantBtn.disabled = false;
        switchEcoutantBtn.textContent = 'Devenir écoutant';
        console.error(err);
      }
    });
  }

  let allEcoutants = [];
  try {
    const q = query(collection(db, 'users'), where('badge.type', '==', 'ecoutant'));
    const snapshot = await getDocs(q);
    allEcoutants = snapshot.docs.filter(function (d) {
      return d.data().validatedByAdmin === true;
    });
  } catch (_) {}

  function render() {
    const search = searchInput ? searchInput.value.trim() : '';
    const filtered = filterList(allEcoutants, search);
    if (matchesGrid) {
      matchesGrid.innerHTML = filtered.length
        ? filtered.map(renderEcoutantCard).join('')
        : '<p class="form-hint">Aucun écoutant trouvé.</p>';
    }
  }

  render();
  if (searchInput) searchInput.addEventListener('input', render);
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', function () {
    signOut(auth).then(function () { window.location.href = 'index.html'; });
  });
}
