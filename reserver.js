import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';
import { auth, db, app } from './firebase-config.js';

var JOURS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

function getParam(name) {
  var p = new URLSearchParams(window.location.search).get(name);
  return p != null && p.trim() !== '' ? p.trim() : null;
}

function parseTimeHHMM(hhmm) {
  var parts = hhmm.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || 0, 10);
}

function slotOverlaps(slotStart, slotEnd, sessionStart, sessionEnd) {
  return slotStart < sessionEnd && slotEnd > sessionStart;
}

function isSlotTaken(slotStart, slotEnd, bookedSessions) {
  return bookedSessions.some(function (s) {
    var sStart = s.startAt && s.startAt.toDate ? s.startAt.toDate() : new Date(s.startAt);
    var sEnd = s.endAt && s.endAt.toDate ? s.endAt.toDate() : new Date(s.endAt);
    return slotOverlaps(slotStart, slotEnd, sStart, sEnd);
  });
}

function buildAvailableSlots(availability, bookedSessions, numDays) {
  var slots = [];
  var now = new Date();
  now.setMinutes(0, 0, 0);
  for (var d = 0; d < numDays; d++) {
    var date = new Date(now);
    date.setDate(date.getDate() + d);
    var dayOfWeek = date.getDay();
    var dayStart = date.getTime();
    (availability || []).forEach(function (block) {
      if (block.dayOfWeek !== dayOfWeek) return;
      var startM = parseTimeHHMM(block.start);
      var endM = parseTimeHHMM(block.end);
      for (var m = startM; m + 60 <= endM; m += 60) {
        var slotStart = new Date(dayStart + m * 60 * 1000);
        var slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
        if (slotStart < new Date()) continue;
        if (!isSlotTaken(slotStart, slotEnd, bookedSessions)) slots.push({ start: slotStart, end: slotEnd });
      }
    });
  }
  return slots;
}

function parseLocalDate(dateStr) {
  var parts = String(dateStr).split('-');
  if (parts.length !== 3) return null;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  var d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  var dayStart = new Date(y, m, d, 0, 0, 0, 0);
  return dayStart;
}

function buildSlotsFromDates(availabilityDates, bookedSessions) {
  var slots = [];
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  (availabilityDates || []).forEach(function (block) {
    var dateStr = block.date;
    if (!dateStr) return;
    var dayStart = parseLocalDate(dateStr);
    if (!dayStart || dayStart < today) return;
    var startM = parseTimeHHMM(block.start);
    var endM = parseTimeHHMM(block.end);
    for (var m = startM; m + 60 <= endM; m += 60) {
      var slotStart = new Date(dayStart.getTime() + m * 60 * 1000);
      var slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
      if (slotStart < new Date()) continue;
      if (!isSlotTaken(slotStart, slotEnd, bookedSessions)) slots.push({ start: slotStart, end: slotEnd });
    }
  });
  return slots;
}

var NUM_DAYS_RESERVATION = 90;

function formatSlot(slot) {
  var d = slot.start;
  var day = JOURS[d.getDay()];
  var date = d.getDate() + '/' + (d.getMonth() + 1);
  var time = ('0' + d.getHours()).slice(-2) + 'h' + ('0' + d.getMinutes()).slice(-2);
  return day + ' ' + date + ' ' + time;
}

onAuthStateChanged(auth, async (user) => {
  var loadingEl = document.getElementById('reserver-loading');
  var errorEl = document.getElementById('reserver-error');
  var contentEl = document.getElementById('reserver-content');
  var cardEl = document.getElementById('reserver-card');
  var slotsEl = document.getElementById('reserver-slots');
  var confirmEl = document.getElementById('reserver-confirm');

  if (!user) {
    if (loadingEl) loadingEl.style.display = 'none';
    window.location.href = 'login.html';
    return;
  }

  var ecoutantId = getParam('id') || getParam('ecoutantId');
  if (!ecoutantId) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) { errorEl.textContent = 'Identifiant écoutant manquant.'; errorEl.style.display = 'block'; }
    return;
  }

  try {
    var callerSnap = await getDoc(doc(db, 'users', user.uid));
    var callerPseudo = (callerSnap.exists() && callerSnap.data().pseudo) ? callerSnap.data().pseudo : 'Parleur_' + user.uid.slice(-4);

    var userSnap = await getDoc(doc(db, 'users', ecoutantId));
    var data = userSnap.exists() ? userSnap.data() : {};
    if (!userSnap.exists()) throw new Error('Écoutant introuvable.');

    var sessionsSnap = await getDocs(query(collection(db, 'sessions'), where('ecoutantId', '==', ecoutantId)));
    var booked = sessionsSnap.docs.map(function (d) { return d.data(); }).filter(function (s) { return s.status !== 'cancelled'; });

    var availability = Array.isArray(data.availability) ? data.availability : [];
    var availabilityDates = Array.isArray(data.availabilityDates) ? data.availabilityDates : [];
    var slotsRecurring = buildAvailableSlots(availability, booked, NUM_DAYS_RESERVATION);
    var slotsFromDates = buildSlotsFromDates(availabilityDates, booked);
    var slots = slotsRecurring.concat(slotsFromDates).sort(function (a, b) { return a.start.getTime() - b.start.getTime(); });
    var seen = {};
    slots = slots.filter(function (s) {
      var key = s.start.getTime();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    if (cardEl) {
      cardEl.innerHTML = '<strong>' + (data.pseudo || 'Écoutant') + '</strong><br>' +
        (data.experience_public ? '<span class="form-hint">' + (data.experience_public || '').slice(0, 80) + '</span><br>' : '') +
        (data.bio ? '<p class="form-hint" style="margin-top:0.5rem">' + data.bio + '</p>' : '');
    }

    if (slots.length === 0) {
      if (slotsEl) slotsEl.innerHTML = '<p class="form-hint">Aucun créneau disponible sur les ' + NUM_DAYS_RESERVATION + ' prochains jours. L’écoutant peut ajouter des créneaux récurrents ou à date fixe dans son planning.</p>';
    } else {
      slotsEl.innerHTML = slots.map(function (slot, i) {
        return '<button type="button" class="slot-btn" data-i="' + i + '">' + formatSlot(slot) + '</button>';
      }).join('');
      slotsEl.querySelectorAll('.slot-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var i = parseInt(btn.getAttribute('data-i'), 10);
          var slot = slots[i];
          btn.disabled = true;
          var hourlyRate = data.hourly_rate != null ? parseFloat(data.hourly_rate, 10) : 0;
          if (hourlyRate < 0 || isNaN(hourlyRate)) hourlyRate = 0;
          var amountCents = Math.round(hourlyRate * 100);
          try {
            var ref = await addDoc(collection(db, 'sessions'), {
              appelantId: user.uid,
              ecoutantId: ecoutantId,
              startAt: Timestamp.fromDate(slot.start),
              endAt: Timestamp.fromDate(slot.end),
              status: 'pending_payment',
              amountCents: amountCents,
              hourlyRate: hourlyRate,
              createdAt: new Date().toISOString()
            });
            var sessionId = ref.id;
            var path = window.location.pathname.replace(/\/?reserver\.html.*$/, '') || '/';
            if (!path.endsWith('/')) path += '/';
            var successUrl = window.location.origin + path + 'reserver-success.html';
            var cancelUrl = window.location.href;
            var createCheckout = httpsCallable(getFunctions(app), 'createCheckoutSession');
            var result = await createCheckout({
              sessionId: sessionId,
              amountCents: amountCents,
              ecoutantId: ecoutantId,
              appelantId: user.uid,
              pseudoAppelant: callerPseudo,
              pseudoEcoutant: data.pseudo || 'Écoutant',
              slotLabel: formatSlot(slot) + ' (1 h)',
              successUrl: successUrl,
              cancelUrl: cancelUrl
            });
            if (result.data && result.data.url) {
              window.location.href = result.data.url;
              return;
            }
            await updateDoc(doc(db, 'sessions', sessionId), { status: 'confirmed' });
            if (confirmEl) {
              confirmEl.style.display = 'block';
              confirmEl.innerHTML = '<strong>Réservation enregistrée</strong><br>Créneau : ' + formatSlot(slot) + ' (1 h).<br><a href="appelant.html" class="btn btn-primary" style="margin-top:0.75rem">Retour aux écoutants</a>';
            }
          } catch (err) {
            if (errorEl) { errorEl.textContent = 'Erreur : ' + (err.message || 'réessayez'); errorEl.style.display = 'block'; }
            btn.disabled = false;
          }
        });
      });
    }
  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) { errorEl.textContent = err.message || 'Erreur.'; errorEl.style.display = 'block'; }
  }

  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      signOut(auth).then(function () { window.location.href = 'index.html'; });
    });
  }
});
