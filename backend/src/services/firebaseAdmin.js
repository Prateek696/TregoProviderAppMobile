const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Dev fallback — Firebase features won't work but app won't crash
    console.warn('[Firebase] FIREBASE_SERVICE_ACCOUNT_JSON not set — auth verification disabled');
    admin.initializeApp({ projectId: 'trego-dev-placeholder' });
  }
}

module.exports = admin;
