import 'dotenv/config';
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    // When running in a GCP environment (like Cloud Functions, App Engine),
    // the SDK can automatically detect the service account credentials.
    admin.initializeApp();
  } catch (error: any) {
     console.warn('Firebase admin initialization failed with default credentials. Falling back to service account key.');
     try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
     } catch(e) {
        console.error('Firebase admin initialization error with service account key:', e);
     }
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
