
// The import of firebase-admin ensures that the SDK is initialized.
import '@/lib/firebase-admin';

import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  NewUserPayload,
  UserImportResult,
  BatchImportUsersRequest,
  BatchImportUsersResponse,
} from '@/types/functions';
import type { Member } from '@/types/member';

const VALID_ROLES: Member['role'][] = ['admin', 'executive', 'manager', 'employee'];

export async function POST(req: Request) {
  try {
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
          emailVerified: true, // Automatically verify email for imported users
        });

        // 3. Prepare user data for Firestore
        const userDocRef = db.collection('users').doc(userRecord.uid);
        const avatarUrl = `https://picsum.photos/seed/${userRecord.uid}/100/100`;

        const firestoreData: Omit<Member, 'updatedAt'|'createdAt'> & {createdAt: FieldValue, updatedAt: FieldValue} = {
          uid: userRecord.uid,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          employeeId: user.employeeId || '',
          company: user.company || '',
          department: user.department || '',
          avatarUrl: avatarUrl,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        // 4. Save user data to Firestore
        await userDocRef.set(firestoreData);
        
        return { email: user.email, success: true };

      } catch (error: any) {
        // Return a detailed error for this specific user
        return { 
          email: user.email || 'unknown', 
          success: false, 
          error: error.message || '不明なエラーが発生しました。' 
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
    
    // Determine status code based on whether any errors occurred
    const status = errorCount > 0 && successCount === 0 ? 400 : 200;
    
    return NextResponse.json(response, { status });

  } catch (error: any) {
    console.error('Unhandled error in batchImportUsers API route:', { 
      message: error.message, 
      stack: error.stack 
    });
    return NextResponse.json({ 
      total: 0,
      successCount: 0,
      errorCount: 0,
      results: [{ email: 'unknown', success: false, error: 'サーバーで予期せぬエラーが発生しました。' }]
    }, { status: 500 });
  }
}

    