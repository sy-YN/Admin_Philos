
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK
const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  // The GOOGLE_APPLICATION_CREDENTIALS env var points to the JSON key file.
  // The SDK automatically finds and uses this file.
  try {
    return admin.initializeApp();
  } catch (error: any) {
    console.error('Firebase Admin SDK Initialization Error:', error.stack);
    throw new Error('Failed to initialize Firebase Admin SDK.');
  }
};

export async function POST(req: Request) {
  try {
    const adminApp = initializeAdminApp();
    const auth = adminApp.auth();
    const db = adminApp.firestore();

    const body: { uid: string } = await req.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: 'UID is required.' }, { status: 400 });
    }

    // Use a batch to ensure atomicity
    const batch = db.batch();

    // 1. Delete from Firestore
    const userDocRef = db.collection('users').doc(uid);
    batch.delete(userDocRef);
    
    // 2. Delete from Firebase Authentication
    await auth.deleteUser(uid);
    
    // Commit the batch deletion from Firestore after successful auth deletion
    await batch.commit();

    return NextResponse.json({ message: 'User deleted successfully from Auth and Firestore.' }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    let errorMessage = 'An unknown error occurred.';
    let statusCode = 500;

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'The user to delete was not found in Firebase Authentication.';
      statusCode = 404;
    } else if (error.code === 'auth/insufficient-permission') {
        errorMessage = 'Firebase Admin SDK does not have permission to delete users.';
        statusCode = 403;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
