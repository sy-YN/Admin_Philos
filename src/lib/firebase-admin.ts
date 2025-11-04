
import 'dotenv/config';
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      // Parse the service account key from the environment variable.
      const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully with service account.');

    } else {
      // Fallback for environments where default credentials are set up (e.g., GCP).
      // If this also fails, it will throw an error.
      console.log('No FIREBASE_SERVICE_ACCOUNT_KEY found, attempting to initialize with default credentials.');
      admin.initializeApp();
      console.log('Firebase Admin SDK initialized successfully with default credentials.');
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
    // Throwing an error here can help diagnose issues during deployment or startup.
    // In a serverless function, this might cause cold start failures if config is missing.
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
