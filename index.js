/**
 * AnyTalk — Cloud Functions (Stripe Checkout pour réservations)
 *
 * Configuration :
 * - Stripe : clé secrète dans Firebase Config (Secret Manager) ou variable d'environnement STRIPE_SECRET_KEY
 * - firebase functions:config:set stripe.secret_key="sk_live_..."
 * - Puis dans le code : functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Stripe = require('stripe');

admin.initializeApp();

/**
 * Crée une session Stripe Checkout pour une réservation.
 * Appelée depuis le front après création du document session en Firestore (status: pending_payment).
 *
 * Body (JSON) :
 * - sessionId: string (ID du document Firestore sessions/xxx)
 * - amountCents: number (montant en centimes, ex. 1800 pour 18€)
 * - ecoutantId: string
 * - appelantId: string
 * - pseudoAppelant: string
 * - pseudoEcoutant: string
 * - slotLabel: string (affichage créneau)
 * - successUrl: string (URL de retour après paiement)
 * - cancelUrl: string (URL si annulation)
 *
 * Returns: { url: string } (URL de redirection Stripe Checkout)
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Connexion requise.');
  }
  const uid = context.auth.uid;
  const {
    sessionId,
    amountCents,
    ecoutantId,
    appelantId,
    pseudoAppelant,
    pseudoEcoutant,
    slotLabel,
    successUrl,
    cancelUrl
  } = data || {};

  if (!sessionId || amountCents == null || !ecoutantId || appelantId !== uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Paramètres manquants ou invalides.');
  }

  const secretKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe non configuré (STRIPE_SECRET_KEY).');
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

  const baseUrl = successUrl ? successUrl.replace(/\?.*$/, '').replace(/#.*$/, '') : '';
  const success = baseUrl
    ? `${baseUrl}?stripe_session_id={CHECKOUT_SESSION_ID}&firestore_session_id=${sessionId}`
    : `${process.env.GCLOUD_PROJECT || 'anytalk'}-success?session_id=${sessionId}`;
  const cancel = cancelUrl || (baseUrl ? baseUrl.replace(/reserver-success\.html.*$/, 'reserver.html?id=' + ecoutantId) : '');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Séance d\'écoute — ' + (pseudoEcoutant || 'Écoutant'),
            description: slotLabel || 'Réservation créneau',
            images: []
          },
          unit_amount: Math.round(amountCents)
        },
        quantity: 1
      }
    ],
    mode: 'payment',
    success_url: success,
    cancel_url: cancel,
    client_reference_id: sessionId,
    metadata: {
      firestore_session_id: sessionId,
      ecoutant_id: ecoutantId,
      appelant_id: appelantId,
      caller_pseudo: pseudoAppelant || '',
      listener_pseudo: pseudoEcoutant || ''
    }
  });

  return { url: session.url };
});

/**
 * Après paiement Stripe, le front redirige vers success_url avec stripe_session_id.
 * Cette fonction permet de confirmer le paiement côté Stripe et de passer la session Firestore en "paid".
 * Appelée depuis reserver-success.html avec le stripe_session_id reçu dans l’URL.
 */
exports.confirmPaymentAndSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Connexion requise.');
  }
  const { stripeSessionId } = data || {};
  if (!stripeSessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'stripeSessionId manquant.');
  }

  const secretKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Stripe non configuré.');
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
  const checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
  if (!checkoutSession || checkoutSession.payment_status !== 'paid') {
    throw new functions.https.HttpsError('failed-precondition', 'Paiement non reçu.');
  }
  const firestoreSessionId = checkoutSession.metadata?.firestore_session_id || checkoutSession.client_reference_id;
  if (!firestoreSessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Session Firestore introuvable dans les métadonnées.');
  }
  if (checkoutSession.metadata?.appelant_id !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Cette session ne vous appartient pas.');
  }

  await admin.firestore().collection('sessions').doc(firestoreSessionId).update({
    status: 'paid',
    stripeSessionId: stripeSessionId,
    paidAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, sessionId: firestoreSessionId };
});
