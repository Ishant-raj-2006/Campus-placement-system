const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let db;
let auth;

const connectFirebase = () => {
  try {
    // Already initialized check
    if (getApps().length > 0) {
      db = getFirestore();
      auth = getAuth();
      return { db, auth };
    }

    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    let appInstance = null;

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      appInstance = initializeApp({ credential: cert(serviceAccount) });
      console.log('Firebase: Loaded serviceAccountKey.json');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        appInstance = initializeApp({ credential: cert(serviceAccount) });
        console.log('Firebase: Loaded credentials from FIREBASE_SERVICE_ACCOUNT_KEY env var');
      } catch (err) {
        console.error('Firebase: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var', err);
      }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      appInstance = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
      console.log('Firebase: Loaded credentials from individual env vars');
    } else {
      appInstance = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'campus-placement-system-5795e'
      });
      console.warn('⚠️ Firebase Warning: No credentials found. Running in unauthenticated mode.');
    }

    if (appInstance) {
      console.log('🔥 Firebase Cloud Firestore Connected Successfully!');
    }

    db = getFirestore();
    auth = getAuth();
  } catch (error) {
    console.error('Firebase Initialization Error:', error.message);
  }

  return { db, auth };
};

const getDb = () => {
  if (!db) connectFirebase();
  return db;
};

const getAuthFromConfig = () => {
  if (!auth) connectFirebase();
  return auth;
};

module.exports = {
  connectFirebase,
  getDb,
  getAuth: getAuthFromConfig,
};
