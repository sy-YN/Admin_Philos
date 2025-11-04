
import 'dotenv/config';
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      // If service account key is provided in env, use it.
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Otherwise, try to initialize with default credentials.
      // This works in GCP environments like Cloud Functions, App Engine, etc.
      admin.initializeApp();
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
