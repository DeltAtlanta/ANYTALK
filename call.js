import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';
import { wherebyConfig } from './firebase-config.js';

var roomUrl = null;
var room = null;
var isEcoutant = false;

function getParam(name) {
  var m = new URLSearchParams(window.location.search).get(name);
  return m;
}

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  var ecoutantId = getParam('ecoutantId');
  var sessionId = getParam('sessionId');
  var subdomain = (typeof wherebyConfig !== 'undefined' && wherebyConfig.subdomain) ? wherebyConfig.subdomain : 'votre-subdomain';
  var wherebyConfigured = subdomain && subdomain !== 'votre-subdomain';

  if (sessionId) {
    var sessionSnap = await getDoc(doc(db, 'sessions', sessionId));
    var session = sessionSnap.exists() ? sessionSnap.data() : null;
    if (!session) {
      document.getElementById('call-subtitle').textContent = 'Rendez-vous introuvable.';
      return;
    }
    isEcoutant = session.ecoutantId === user.uid;
    var otherId = isEcoutant ? session.appelantId : session.ecoutantId;
    var otherSnap = await getDoc(doc(db, 'users', otherId));
    var otherData = otherSnap.exists() ? otherSnap.data() : {};
    var otherPseudo = otherData.pseudo || (isEcoutant ? 'Appelant' : 'Écoutant');
    document.getElementById('call-name').textContent = otherPseudo;
    document.getElementById('call-details').textContent = isEcoutant ? 'Rendez-vous réservé — Rejoignez l\'appel.' : 'Appel avec ' + otherPseudo;
    document.getElementById('call-avatar').textContent = '👤';
    document.getElementById('call-avatar-large').textContent = '👤';
    var tagsEl = document.getElementById('call-tags');
    if (tagsEl) tagsEl.innerHTML = '';
    ecoutantId = session.ecoutantId;
  } else {
    if (!ecoutantId) {
      document.getElementById('call-subtitle').textContent = 'Paramètres manquants (ecoutantId ou sessionId).';
      return;
    }
    var snap = await getDoc(doc(db, 'users', ecoutantId));
    var data = snap.exists() ? snap.data() : {};
    document.getElementById('call-name').textContent = data.pseudo || 'Écoutant';
    var details = (data.experience_public || '').slice(0, 60) + (data.bio ? ' — ' + (data.bio || '').slice(0, 60) : '');
    document.getElementById('call-details').textContent = details || 'Écoutant AnyTalk';
    document.getElementById('call-avatar').textContent = '👤';
    document.getElementById('call-avatar-large').textContent = '👤';
    var tagsEl = document.getElementById('call-tags');
    if (tagsEl && data.experience_public) {
      tagsEl.innerHTML = '<span class="role-btn">' + (data.experience_public || '').slice(0, 50) + '</span>';
    }
  }

  var startBtn = document.getElementById('start-call-btn');
  if (sessionId) startBtn.textContent = 'Rejoindre l\'appel';

  if (!wherebyConfigured) {
    startBtn.disabled = true;
    startBtn.textContent = 'Whereby non configuré';
    var detailsEl = document.getElementById('call-details');
    if (detailsEl) detailsEl.textContent = 'Configurez le subdomain Whereby dans firebase-config.js (wherebyConfig.subdomain) pour activer les appels.';
  }

  startBtn.addEventListener('click', function () {
    if (!wherebyConfigured) return;
    var roomSlug = sessionId || (Math.random().toString(36).slice(2, 10));
    roomUrl = 'https://' + subdomain + '.whereby.com/' + roomSlug;
    document.getElementById('call-room-id').textContent = roomUrl;
    hide(document.getElementById('call-prepare'));
    show(document.getElementById('call-active'));
    var container = document.getElementById('whereby-container');
    if (container && typeof window.Whereby !== 'undefined') {
      room = window.Whereby.embed(roomUrl, container, { roomUrl: roomUrl });
    } else {
      var iframe = document.createElement('iframe');
      iframe.src = roomUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      container.innerHTML = '';
      container.appendChild(iframe);
    }
  });

  var backUrl = isEcoutant ? 'ecoutant.html' : 'appelant.html';
  document.getElementById('end-call-btn').addEventListener('click', function () {
    if (room && room.leave) room.leave();
    window.location.href = backUrl;
  });

  document.getElementById('close-btn').addEventListener('click', function () {
    window.location.href = backUrl;
  });
});
