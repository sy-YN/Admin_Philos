
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

import type {
  NewUserPayload,
  UserImportResult,
  BatchImportUsersRequest,
  BatchImportUsersResponse,
} from '@/types/functions';
import type { Member } from '@/types/member';

// Helper function to initialize Firebase Admin SDK using the recommended method
const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // The GOOGLE_APPLICATION_CREDENTIALS env var (set in .env) points to the JSON key file.
  // The SDK automatically finds and uses this file.
  try {
    return admin.initializeApp();
  } catch (error: any) {
    console.error('Firebase Admin SDK Initialization Error:', error.stack);
    throw new Error('Failed to initialize Firebase Admin SDK. Ensure GOOGLE_APPLICATION_CREDENTIALS in .env points to a valid service account key file.');
  }
};


const VALID_ROLES: Member['role'][] = ['admin', 'executive', 'manager', 'employee'];

export async function POST(req: Request) {
  try {
    // Initialize Firebase Admin on each request
    const adminApp = initializeAdminApp();
    const auth = adminApp.auth();
    const db = adminApp.firestore();

    const body: BatchImportUsersRequest = await req.json();
    const { users } = body;

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid request body. "users" array is required.' }, { status: 400 });
    }

    const importPromises = users.map(async (user: NewUserPayload): Promise<UserImportResult> => {
      try {
        // 1. Backend validation
        if (!user.email || !user.password || !user.displayName || !user.role) {
          throw new Error('必須項目（email, password, displayName, role）が不足しています。');
        }
        if (!VALID_ROLES.includes(user.role)) {
          throw new Error(`無効な権限が指定されました: "${user.role}"。有効な権限: ${VALID_ROLES.join(', ')}`);
        }

        // 2. Create user in Firebase Authentication
        const userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });

        // 3. Prepare user data for Firestore
        const userDocRef = db.collection('users').doc(userRecord.uid);
        const avatarUrl = `https://picsum.photos/seed/${userRecord.uid}/100/100`;

        const firestoreData = {
          uid: userRecord.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          employeeId: user.employeeId || '',
          company: user.company || '',
          department: user.department || '',
          avatarUrl: avatarUrl,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 4. Save user data to Firestore
        await userDocRef.set(firestoreData);
        
        return { email: user.email, success: true };

      } catch (error: any) {
        let errorMessage = error.message || '不明なエラーが発生しました。';
        if (error.code === 'auth/insufficient-permission') {
            errorMessage = 'Firebaseの操作権限が不足しています。サービスアカウントに必要なIAMロールが付与されているか確認してください。';
        }
        
        return { 
          email: user.email || 'unknown', 
          success: false, 
          error: errorMessage
        };
      }
    });

    const results = await Promise.all(importPromises);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    const response: BatchImportUsersResponse = {
      total: users.length,
      successCount,
      errorCount,
      results,
    };
    
    const status = errorCount > 0 && successCount === 0 ? 400 : 200;
    
    return NextResponse.json(response, { status });

  } catch (error: any) {
    console.error('Unhandled error in batchImportUsers API route:', { 
      message: error.message, 
      stack: error.stack 
    });
    // This is the crucial part: always return a JSON response, even on catastrophic failure
    return NextResponse.json({ 
      total: 0,
      successCount: 0,
      errorCount: (await req.json()).users.length || 1, // Attempt to get total from body
      results: [{ email: 'unknown', success: false, error: `サーバーで予期せぬエラーが発生しました: ${error.message}` }]
    }, { status: 500 });
  }
}
