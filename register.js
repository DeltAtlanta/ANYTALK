import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { auth, db, FORMSPREE_FORM_ID } from './firebase-config.js';

const form = document.getElementById('register-form');
const errorEl = document.getElementById('error-message');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = form.querySelector('input[name="type"]')?.value || 'ecoutant';
    const pseudo = form.querySelector('#pseudo')?.value?.trim() || '';
    const email = form.querySelector('#email')?.value?.trim() || '';
    const telephone = form.querySelector('#telephone')?.value?.trim() || '';
    const password = form.querySelector('#password')?.value || '';
    const fileCI = form.querySelector('#carte_identite')?.files?.[0];
    const fileDiplome = form.querySelector('#diplome')?.files?.[0];
    const badgesChecked = form.querySelectorAll('input[name="badges"]:checked');
    const badges = Array.from(badgesChecked).map((el) => el.value);

    if (!email || !password) {
      errorEl.textContent = 'Email et mot de passe requis.';
      return;
    }
    if (type === 'ecoutant' && (!pseudo || !fileCI || !fileDiplome)) {
      errorEl.textContent = 'Pseudo, carte d\'identité et diplôme sont requis.';
      return;
    }

    errorEl.textContent = '';
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // En base : uniquement pseudo, date de demande, badges (affichés sur la page admin)
      const userData = {
        pseudo,
        role: type,
        badge: { type },
        inscritComme: type,
        badges: badges.length ? badges : ['Écoutant'],
        createdAt: new Date().toISOString(),
        validatedByAdmin: type === 'ecoutant' ? false : true
      };
      await setDoc(doc(db, 'users', user.uid), userData);

      // Envoi des données confidentielles par mail (Formspree → email configuré sur le formulaire)
      if (type === 'ecoutant' && FORMSPREE_FORM_ID) {
        const fd = new FormData();
        fd.append('_subject', 'Inscription écoutant — ' + pseudo);
        fd.append('email', email);
        fd.append('telephone', telephone);
        fd.append('pseudo', pseudo);
        fd.append('_replyto', email);
        if (fileCI) fd.append('carte_identite', fileCI);
        if (fileDiplome) fd.append('diplome', fileDiplome);
        try {
          await fetch('https://formspree.io/f/' + FORMSPREE_FORM_ID, {
            method: 'POST',
            body: fd,
            headers: { 'Accept': 'application/json' }
          });
        } catch (mailErr) {
          console.warn('Envoi email échoué (compte créé) :', mailErr);
        }
      }

      if (type === 'ecoutant') {
        sessionStorage.setItem('anytalk_just_registered_ecoutant', '1');
        window.location.replace('ecoutant.html');
      } else {
        window.location.replace('dashboard.html');
      }
    } catch (err) {
      errorEl.textContent = err.code === 'auth/email-already-in-use'
        ? 'Cet email est déjà utilisé.'
        : (err.message || 'Erreur lors de l\'inscription.');
    }
  });
}
