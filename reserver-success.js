import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';
import { auth, app } from './firebase-config.js';

var params = new URLSearchParams(window.location.search);
var stripeSessionId = params.get('stripe_session_id');

onAuthStateChanged(auth, async function (user) {
  var loadingEl = document.getElementById('success-loading');
  var msgEl = document.getElementById('success-msg');
  var errorEl = document.getElementById('success-error');

  if (!user) {
    if (loadingEl) loadingEl.style.display = 'none';
    window.location.href = 'login.html';
    return;
  }

  if (!stripeSessionId) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (msgEl) { msgEl.style.display = 'block'; msgEl.querySelector('.form-hint').textContent = 'Aucune session de paiement à confirmer.'; }
    return;
  }

  try {
    var functions = getFunctions(app);
    var confirmPayment = httpsCallable(functions, 'confirmPaymentAndSession');
    await confirmPayment({ stripeSessionId: stripeSessionId });
    if (loadingEl) loadingEl.style.display = 'none';
    if (msgEl) msgEl.style.display = 'block';
    var ecoutantId = sessionStorage.getItem('anytalk_ecoutant_id');
    var sessionId = sessionStorage.getItem('anytalk_session_id');
    if (ecoutantId && msgEl) {
      var callUrl = 'call.html?ecoutantId=' + encodeURIComponent(ecoutantId) + (sessionId ? '&sessionId=' + encodeURIComponent(sessionId) : '');
      var callLink = '<a href="' + callUrl + '" class="btn btn-primary" style="margin-left:0.5rem">Démarrer l\'appel vidéo</a>';
      var wrap = msgEl.querySelector('.call-link-wrap');
      if (wrap) wrap.innerHTML = callLink;
      sessionStorage.removeItem('anytalk_ecoutant_id');
      if (sessionId) sessionStorage.removeItem('anytalk_session_id');
    }
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.textContent = err.message || 'Erreur lors de la confirmation du paiement.';
      errorEl.style.display = 'block';
    }
    if (msgEl) msgEl.style.display = 'block';
    if (msgEl && msgEl.querySelector('.form-hint')) msgEl.querySelector('.form-hint').textContent = 'Si vous avez bien payé, la réservation sera mise à jour sous peu. Sinon, réessayez ou contactez le support.';
  }

  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js').then(function (m) {
        m.signOut(auth).then(function () { window.location.href = 'index.html'; });
      });
    });
  }
});
