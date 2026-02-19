import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { auth, db, FORMSPREE_FORM_ID } from './firebase-config.js';

var ADMIN_UID = 'FWrrl4ZGDhRLEjYkIw1H3AFIgtf2';
var DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const logoutBtn = document.getElementById('logout-btn');
const form = document.getElementById('ecoutant-profile-form');
const statHours = document.getElementById('stat-hours');
const statRating = document.getElementById('stat-rating');
const statReviews = document.getElementById('stat-reviews');
const profileSavedMsg = document.getElementById('profile-saved-msg');
const planningList = document.getElementById('planning-list');
const planningAddBtn = document.getElementById('planning-add-btn');
const planningDay = document.getElementById('planning-day');
const planningStart = document.getElementById('planning-start');
const planningEnd = document.getElementById('planning-end');
const planningDatesList = document.getElementById('planning-dates-list');
const planningDateAddBtn = document.getElementById('planning-date-add-btn');
const planningDateInput = document.getElementById('planning-date');
const planningDateStart = document.getElementById('planning-date-start');
const planningDateEnd = document.getElementById('planning-date-end');
const roleChangeSection = document.getElementById('role-change-section');
const planningCard = document.getElementById('planning-card');
const profileFormCard = document.getElementById('profile-form-card');
const profileLockedUi = document.getElementById('profile-locked-ui');
const profileSubmitBtn = document.getElementById('profile-submit-btn');

function renderPlanningList(availability, onRemove) {
  if (!planningList) return;
  availability = availability || [];
  planningList.innerHTML = availability.map(function (slot, i) {
    var day = DAYS[slot.dayOfWeek] || slot.dayOfWeek;
    return '<li><span>' + day + ' ' + slot.start + ' – ' + slot.end + '</span><button type="button" class="planning-remove" data-i="' + i + '">Supprimer</button></li>';
  }).join('');
  planningList.querySelectorAll('.planning-remove').forEach(function (btn) {
    btn.addEventListener('click', function () { onRemove(parseInt(btn.getAttribute('data-i'), 10)); });
  });
}

function renderRoleChangeEcoutant(validated) {
  if (!roleChangeSection) return;
  if (validated) {
    roleChangeSection.innerHTML = '<h3 class="section-title">Changement de rôle</h3><p class="form-hint">Vous êtes actuellement écoutant.</p><button type="button" id="switch-appelant-btn" class="btn btn-secondary">Devenir appelant</button>';
  } else {
    roleChangeSection.innerHTML = '<h3 class="section-title">Changement de rôle</h3><p class="form-hint">Vous pourrez basculer en appelant une fois votre profil écoutant validé par l\'équipe.</p>';
  }
}

function formatDateFr(dateStr) {
  if (!dateStr) return '';
  var parts = dateStr.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function renderPlanningDatesList(availabilityDates, onRemove) {
  if (!planningDatesList) return;
  availabilityDates = availabilityDates || [];
  planningDatesList.innerHTML = availabilityDates.map(function (slot, i) {
    return '<li><span>' + formatDateFr(slot.date) + ' — ' + slot.start + ' – ' + slot.end + '</span><button type="button" class="planning-remove" data-i="' + i + '">Supprimer</button></li>';
  }).join('');
  planningDatesList.querySelectorAll('.planning-remove').forEach(function (btn) {
    btn.addEventListener('click', function () { onRemove(parseInt(btn.getAttribute('data-i'), 10)); });
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  if (user.uid === ADMIN_UID) {
    window.location.replace('admin.html');
    return;
  }
  var justRegisteredEcoutant = sessionStorage.getItem('anytalk_just_registered_ecoutant') === '1';
  if (justRegisteredEcoutant) sessionStorage.removeItem('anytalk_just_registered_ecoutant');

  var snap = await getDoc(doc(db, 'users', user.uid));
  var data = snap.exists() ? snap.data() : {};
  var role = data.badge?.type || data.role || data.inscritComme;
  if (role !== 'ecoutant' && !justRegisteredEcoutant) {
    window.location.replace('dashboard.html');
    return;
  }

  var validated = data.validatedByAdmin === true;
  renderRoleChangeEcoutant(validated);
  var switchAppelantBtn = document.getElementById('switch-appelant-btn');
  if (switchAppelantBtn && validated) {
    switchAppelantBtn.addEventListener('click', async function () {
      switchAppelantBtn.disabled = true;
      switchAppelantBtn.textContent = 'Chargement…';
      try {
        await setDoc(doc(db, 'users', user.uid), {
          role: 'appelant',
          badge: { type: 'appelant' }
        }, { merge: true });
        window.location.replace('appelant.html');
      } catch (err) {
        switchAppelantBtn.disabled = false;
        switchAppelantBtn.textContent = 'Devenir appelant';
        console.error(err);
      }
    });
  }

  if (statHours) statHours.textContent = data.hoursComptabilisees != null ? data.hoursComptabilisees : '0';
  if (statRating) statRating.textContent = data.rating != null ? data.rating.toFixed(1) : '–';
  if (statReviews) statReviews.textContent = data.reviewsCount != null ? data.reviewsCount : '0';

  var availability = Array.isArray(data.availability) ? data.availability : [];
  var availabilityDates = Array.isArray(data.availabilityDates) ? data.availabilityDates : [];

  function savePlanning() {
    setDoc(doc(db, 'users', user.uid), { availability: availability, availabilityDates: availabilityDates, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
  }

  function removeSlot(i) {
    availability.splice(i, 1);
    renderPlanningList(availability, removeSlot);
    savePlanning();
  }

  function removeDateSlot(i) {
    availabilityDates.splice(i, 1);
    renderPlanningDatesList(availabilityDates, removeDateSlot);
    savePlanning();
  }

  renderPlanningList(availability, removeSlot);
  renderPlanningDatesList(availabilityDates, removeDateSlot);

  if (planningAddBtn && planningDay && planningStart && planningEnd) {
    planningAddBtn.addEventListener('click', function () {
      var start = planningStart.value;
      var end = planningEnd.value;
      if (!start || !end) return;
      var dayOfWeek = parseInt(planningDay.value, 10);
      availability.push({ dayOfWeek: dayOfWeek, start: start, end: end });
      renderPlanningList(availability, removeSlot);
      savePlanning();
    });
  }

  if (planningDateInput) {
    var today = new Date();
    planningDateInput.min = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  }
  if (planningDateAddBtn && planningDateInput && planningDateStart && planningDateEnd) {
    planningDateAddBtn.addEventListener('click', function () {
      var date = planningDateInput.value;
      var start = planningDateStart.value;
      var end = planningDateEnd.value;
      if (!date || !start || !end) return;
      availabilityDates.push({ date: date, start: start, end: end });
      renderPlanningDatesList(availabilityDates, removeDateSlot);
      savePlanning();
    });
  }

  if (form) {
    var nomEl = form.querySelector('#nom');
    if (nomEl) nomEl.value = data.nom || '';
    var prenomEl = form.querySelector('#prenom');
    if (prenomEl) prenomEl.value = data.prenom || '';
    var telEl = form.querySelector('#telephone');
    if (telEl) telEl.value = data.telephone || '';
    var emailContactEl = form.querySelector('#email_contact');
    if (emailContactEl) emailContactEl.value = data.email_contact || data.email || '';
    var dateNaissEl = form.querySelector('#date_naissance');
    if (dateNaissEl) dateNaissEl.value = data.date_naissance || '';
    form.querySelector('#pseudo').value = data.pseudo || '';
    if (data.gender) {
      var g = form.querySelector('input[name="gender"][value="' + data.gender + '"]');
      if (g) g.checked = true;
    }
    var expPub = form.querySelector('#experience_public');
    if (expPub) expPub.value = data.experience_public || '';
    form.querySelector('#bio').value = data.bio || '';
    form.querySelector('#is_available_now').checked = data.is_available_now !== false;
  }

  var profileEditAllowed = data.profileEditAllowed === true;
  var profileChangeRequested = data.profileChangeRequested === true;
  var profileLocked = validated && !profileEditAllowed;

  var carteStatusEl = document.getElementById('carte_identite_upload_status');
  var cvStatusEl = document.getElementById('cv_upload_status');
  function setProfileLockState(locked) {
    var req = locked && profileChangeRequested;
    if (planningCard) planningCard.style.display = locked ? 'none' : 'block';
    var fieldsToLock = form ? form.querySelectorAll('#nom, #prenom, #telephone, #email_contact, #date_naissance, #pseudo, #experience_public, #bio, input[name="gender"], #carte_identite_file, #cv_file') : [];
    fieldsToLock.forEach(function (el) { el.disabled = locked; });
    if (profileSubmitBtn) profileSubmitBtn.style.display = locked ? 'none' : 'inline-block';
    var carteInput = document.getElementById('carte_identite_file');
    var cvInput = document.getElementById('cv_file');
    if (carteInput) carteInput.disabled = locked;
    if (cvInput) cvInput.disabled = locked;
    if (profileLockedUi) {
      if (!locked) {
        profileLockedUi.innerHTML = '';
      } else {
        profileLockedUi.innerHTML = '<p class="form-hint" style="margin-bottom:0.75rem">Profil verrouillé après validation. Seule la <strong>disponibilité pour prendre un appel</strong> peut être modifiée.</p>' +
          (req ? '<p class="form-hint">Demande de modification envoyée. L’équipe vous autorisera à modifier votre profil prochainement.</p>' : '<button type="button" id="request-profile-edit-btn" class="btn btn-secondary">Demander une modification de profil</button>');
      }
    }
  }
  setProfileLockState(profileLocked);

  if (profileLocked) {
    var isAvailableEl = form && form.querySelector('#is_available_now');
    if (isAvailableEl) {
      isAvailableEl.addEventListener('change', function () {
        setDoc(doc(db, 'users', user.uid), { is_available_now: isAvailableEl.checked, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
      });
    }
    var requestProfileEditBtn = document.getElementById('request-profile-edit-btn');
    if (requestProfileEditBtn) {
      requestProfileEditBtn.addEventListener('click', async function () {
        requestProfileEditBtn.disabled = true;
        requestProfileEditBtn.textContent = 'Demande envoyée…';
        try {
          await setDoc(doc(db, 'users', user.uid), { profileChangeRequested: true, profileChangeRequestedAt: new Date().toISOString() }, { merge: true });
          profileChangeRequested = true;
          setProfileLockState(true);
        } catch (err) {
          requestProfileEditBtn.disabled = false;
          requestProfileEditBtn.textContent = 'Demander une modification de profil';
        }
      });
    }
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (profileLocked) return;
      var carteFileInput = document.getElementById('carte_identite_file');
      var cvFileInput = document.getElementById('cv_file');
      var fileCI = carteFileInput && carteFileInput.files && carteFileInput.files[0];
      var fileDiplome = cvFileInput && cvFileInput.files && cvFileInput.files[0];
      if (!fileCI) {
        if (carteStatusEl) carteStatusEl.textContent = 'Veuillez joindre votre carte d\'identité (image ou PDF).';
        return;
      }
      if (!fileDiplome) {
        if (cvStatusEl) cvStatusEl.textContent = 'Veuillez joindre votre diplôme ou CV (image ou PDF).';
        return;
      }
      if (carteStatusEl) carteStatusEl.textContent = '';
      if (cvStatusEl) cvStatusEl.textContent = '';
      var nom = (form.querySelector('#nom') && form.querySelector('#nom').value) ? form.querySelector('#nom').value.trim() : '';
      var prenom = (form.querySelector('#prenom') && form.querySelector('#prenom').value) ? form.querySelector('#prenom').value.trim() : '';
      var telephone = (form.querySelector('#telephone') && form.querySelector('#telephone').value) ? form.querySelector('#telephone').value.trim() : '';
      var email_contact = (form.querySelector('#email_contact') && form.querySelector('#email_contact').value) ? form.querySelector('#email_contact').value.trim() : '';
      var date_naissance = (form.querySelector('#date_naissance') && form.querySelector('#date_naissance').value) ? form.querySelector('#date_naissance').value : '';
      var pseudo = (form.querySelector('#pseudo') && form.querySelector('#pseudo').value) ? form.querySelector('#pseudo').value.trim() : '';
      var gender = (form.querySelector('input[name="gender"]:checked') && form.querySelector('input[name="gender"]:checked').value) ? form.querySelector('input[name="gender"]:checked').value : '';
      var experience_public = (form.querySelector('#experience_public') && form.querySelector('#experience_public').value) ? form.querySelector('#experience_public').value.trim() : '';
      var bio = (form.querySelector('#bio') && form.querySelector('#bio').value) ? form.querySelector('#bio').value.trim() : '';
      var is_available_now = form.querySelector('#is_available_now') ? form.querySelector('#is_available_now').checked : true;
      var payload = {
        pseudo,
        bio,
        gender,
        experience_public,
        is_available_now,
        availability: availability,
        availabilityDates: availabilityDates,
        badge: { type: 'ecoutant' },
        updatedAt: new Date().toISOString()
      };
      if (profileEditAllowed) {
        payload.profileEditAllowed = false;
        payload.profileChangeRequested = false;
      }
      try {
        var formspreeOk = true;
        if (FORMSPREE_FORM_ID) {
          var fd = new FormData();
          fd.append('_subject', 'Profil écoutant — ' + pseudo);
          fd.append('nom', nom);
          fd.append('prenom', prenom);
          fd.append('telephone', telephone);
          fd.append('email_contact', email_contact);
          fd.append('date_naissance', date_naissance);
          fd.append('pseudo', pseudo);
          fd.append('genre', gender);
          fd.append('experience_public', experience_public);
          fd.append('bio', bio);
          fd.append('_replyto', email_contact);
          fd.append('carte_identite', fileCI);
          fd.append('diplome_cv', fileDiplome);
          try {
            var resp = await fetch('https://formspree.io/f/' + FORMSPREE_FORM_ID, {
              method: 'POST',
              body: fd,
              headers: { 'Accept': 'application/json' }
            });
            if (!resp.ok) {
              formspreeOk = false;
              var errData = await resp.json().catch(function () { return {}; });
              console.warn('Formspree erreur:', resp.status, errData);
            }
          } catch (mailErr) {
            formspreeOk = false;
            console.warn('Envoi email échoué:', mailErr);
          }
        }
        await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
        if (profileSavedMsg) {
          profileSavedMsg.style.display = 'block';
          profileSavedMsg.textContent = formspreeOk
            ? 'Profil enregistré. Les pièces ont été envoyées par mail à l\'équipe.'
            : 'Profil enregistré. L\'envoi des pièces par mail a échoué. Vérifie la console (F12).';
          profileSavedMsg.style.color = formspreeOk ? '' : '#c00';
          setTimeout(function () { profileSavedMsg.style.display = 'none'; }, 6000);
        }
        if (profileEditAllowed) window.location.reload();
      } catch (err) {
        console.error(err);
        if (carteStatusEl) carteStatusEl.textContent = 'Erreur lors de l\'enregistrement. Réessayez.';
      }
    });
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', function () {
    signOut(auth).then(function () { window.location.href = 'index.html'; });
  });
}
