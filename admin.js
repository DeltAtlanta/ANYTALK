import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { collection, doc, getDocs, query, updateDoc, where } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

const ADMIN_UID = 'FWrrl4ZGDhRLEjYkIw1H3AFIgtf2';

const pendingList = document.getElementById('admin-pending-list');
const emptyEl = document.getElementById('admin-empty');
const profileEditList = document.getElementById('admin-profile-edit-list');
const profileEditEmpty = document.getElementById('admin-profile-edit-empty');
const logoutBtn = document.getElementById('logout-btn');

function isAdmin(user) {
  return user && user.uid === ADMIN_UID;
}

function renderPendingCard(d) {
  const data = d.data();
  const pseudo = data.pseudo || '–';
  const badges = Array.isArray(data.badges) ? data.badges.join(', ') : (data.badges || '–');
  const createdAt = data.createdAt ? new Date(data.createdAt).toLocaleDateString('fr-FR') : '–';
  const uid = d.id;
  return '<div class="profile-card" data-uid="' + uid + '">' +
    '<strong>' + pseudo + '</strong>' +
    '<br><span class="form-hint">Demande le ' + createdAt + '</span>' +
    '<br><span class="form-hint"><strong>Badges :</strong> ' + badges + '</span>' +
    '<br><span class="form-hint">Les infos confidentielles (email, tél, CI, diplôme) sont dans le mail reçu.</span>' +
    '<br><button type="button" class="btn btn-primary admin-validate-btn" data-uid="' + uid + '" style="margin-top:0.75rem">Approuver</button>' +
    '</div>';
}

function renderProfileEditCard(d) {
  var data = d.data();
  var uid = d.id;
  var email = data.email || '–';
  var pseudo = data.pseudo || '–';
  var requestedAt = data.profileChangeRequestedAt ? new Date(data.profileChangeRequestedAt).toLocaleDateString('fr-FR') : '–';
  return '<div class="profile-card" data-profile-edit-uid="' + uid + '">' +
    '<strong>' + (pseudo !== '–' ? pseudo : email) + '</strong>' +
    (pseudo !== '–' ? '<br><span class="form-hint">' + email + '</span>' : '') +
    '<br><span class="form-hint">Demande le ' + requestedAt + '</span>' +
    '<br><button type="button" class="btn btn-primary admin-allow-edit-btn" data-uid="' + uid + '" style="margin-top:0.75rem">Autoriser la modification</button>' +
    '</div>';
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  if (!isAdmin(user)) {
    window.location.href = 'dashboard.html';
    return;
  }

  let pending = [];
  try {
    const q = query(collection(db, 'users'), where('badge.type', '==', 'ecoutant'));
    const snapshot = await getDocs(q);
    pending = snapshot.docs.filter(function (d) {
      var d2 = d.data();
      return d2.validatedByAdmin !== true;
    });
  } catch (err) {
    if (pendingList) pendingList.innerHTML = '<p class="form-hint">Erreur : ' + (err.message || 'chargement impossible') + '</p>';
    return;
  }

  if (pendingList) {
    pendingList.innerHTML = pending.length ? pending.map(renderPendingCard).join('') : '';
  }
  if (emptyEl) {
    emptyEl.style.display = pending.length ? 'none' : 'block';
  }

  var profileEditRequests = [];
  try {
    var qEdit = query(collection(db, 'users'), where('profileChangeRequested', '==', true));
    var snapEdit = await getDocs(qEdit);
    profileEditRequests = snapEdit.docs;
  } catch (err) {}
  if (profileEditList) {
    profileEditList.innerHTML = profileEditRequests.length ? profileEditRequests.map(renderProfileEditCard).join('') : '';
  }
  if (profileEditEmpty) {
    profileEditEmpty.style.display = profileEditRequests.length ? 'none' : 'block';
  }

  pendingList.addEventListener('click', async function (e) {
    const btn = e.target.closest('.admin-validate-btn');
    if (!btn) return;
    const uid = btn.getAttribute('data-uid');
    if (!uid) return;
    btn.disabled = true;
    btn.textContent = 'Approbation…';
    try {
      await updateDoc(doc(db, 'users', uid), { validatedByAdmin: true });
      const card = pendingList.querySelector('[data-uid="' + uid + '"]');
      if (card) card.remove();
      if (pendingList.children.length === 0 && emptyEl) emptyEl.style.display = 'block';
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Approuver';
      alert('Erreur : ' + (err.message || 'validation impossible'));
    }
  });

  if (profileEditList) {
    profileEditList.addEventListener('click', async function (e) {
      var btn = e.target.closest('.admin-allow-edit-btn');
      if (!btn) return;
      var uid = btn.getAttribute('data-uid');
      if (!uid) return;
      btn.disabled = true;
      btn.textContent = 'En cours…';
      try {
        await updateDoc(doc(db, 'users', uid), { profileEditAllowed: true, profileChangeRequested: false });
        var card = profileEditList.querySelector('[data-profile-edit-uid="' + uid + '"]');
        if (card) card.remove();
        if (profileEditList.children.length === 0 && profileEditEmpty) profileEditEmpty.style.display = 'block';
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Autoriser la modification';
        alert('Erreur : ' + (err.message || 'impossible'));
      }
    });
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', function () {
    signOut(auth).then(function () { window.location.href = 'index.html'; });
  });
}
