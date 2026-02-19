# Stripe — Paiement des réservations

## Rôle

- L’appelant choisit un créneau → une **session Firestore** est créée (`status: pending_payment`).
- Le front appelle la Cloud Function **createCheckoutSession** → Stripe renvoie une URL de paiement.
- Redirection vers **Stripe Checkout** → l’utilisateur paie.
- Après paiement, Stripe redirige vers **reserver-success.html** avec `stripe_session_id`.
- La page appelle **confirmPaymentAndSession** → la session Firestore passe en `status: paid`.

## Configuration

### 1. Compte Stripe

- Créer un compte sur [stripe.com](https://stripe.com).
- Récupérer la **clé secrète** (Dashboard → Développeurs → Clés API) : `sk_test_...` (test) ou `sk_live_...` (production).

### 2. Clé dans Firebase

À la racine du projet :

```bash
firebase functions:config:set stripe.secret_key="sk_test_VOTRE_CLE"
```

Ou, avec Firebase Functions (2e gen), définir la variable d’environnement **STRIPE_SECRET_KEY** dans la config de déploiement.

### 3. Déployer les functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 4. URLs de succès / annulation

La Cloud Function utilise par défaut :

- **successUrl** : l’origine du site + `reserver-success.html` (passée par le front).
- **cancelUrl** : la page reserver actuelle (retour arrière).

En production, s’assurer que le site est servi en HTTPS et que l’origine est correcte (ex. `https://votredomaine.com`).

## Données Firestore

Les documents **sessions** peuvent contenir :

- `status` : `pending_payment` → `paid` (après paiement) ou `confirmed` (si Stripe non configuré).
- `amountCents`, `hourlyRate`, `stripeSessionId`, `paidAt` (après confirmation).

## Stripe Connect (optionnel)

Pour verser automatiquement l’écoutant (marketplace), il faudrait ensuite :

- Stripe Connect : onboarding des écoutants (comptes connectés).
- Lors du paiement, utiliser un **Transfer** ou **Destination Charge** vers le compte connecté de l’écoutant.

Cela implique une autre Cloud Function (création de compte connecté, transfert après `payment_intent.succeeded` ou après confirmation de la session).
