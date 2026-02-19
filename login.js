import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { auth } from './firebase-config.js';

const ADMIN_UID = 'FWrrl4ZGDhRLEjYkIw1H3AFIgtf2';

const form = document.getElementById('login-form');
const errorEl = document.getElementById('error-message');
const forgotLink = document.getElementById('forgot-password-link');
const resetBlock = document.getElementById('reset-password-block');
const resetEmailInput = document.getElementById('reset-email');
const sendResetBtn = document.getElementById('send-reset-btn');
const resetSuccessMsg = document.getElementById('reset-success-msg');

if (forgotLink && resetBlock) {
  forgotLink.addEventListener('click', function (e) {
    e.preventDefault();
    resetBlock.style.display = 'block';
    if (resetEmailInput) resetEmailInput.value = form.querySelector('#email').value.trim();
  });
}

if (sendResetBtn && resetEmailInput) {
  sendResetBtn.addEventListener('click', async function () {
    var email = resetEmailInput.value.trim();
    if (!email) return;
    sendResetBtn.disabled = true;
    sendResetBtn.textContent = 'Envoi…';
    if (errorEl) errorEl.textContent = '';
    if (resetSuccessMsg) resetSuccessMsg.style.display = 'none';
    try {
      await sendPasswordResetEmail(auth, email);
      if (resetSuccessMsg) {
        resetSuccessMsg.textContent = 'Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception (et les spams).';
        resetSuccessMsg.style.display = 'block';
      }
      sendResetBtn.textContent = 'Envoyer le lien';
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.code === 'auth/user-not-found'
          ? 'Aucun compte avec cet email.'
          : (err.message || 'Erreur lors de l\'envoi.');
      }
      sendResetBtn.textContent = 'Envoyer le lien';
    }
    sendResetBtn.disabled = false;
  });
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;
    if (!email || !password) return;
    errorEl.textContent = '';
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (user.uid === ADMIN_UID) {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } catch (err) {
      errorEl.textContent = err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
        ? 'Email ou mot de passe incorrect.'
        : (err.message || 'Erreur de connexion.');
    }
  });
}
