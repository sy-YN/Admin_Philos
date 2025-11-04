
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
    const body = await req.json() as BatchImportUsersRequest;
    const { users } = body;

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid request body. "users" array is required.' }, { status: 400 });
    }

    const importPromises = users.map(async (user: NewUserPayload): Promise<UserImportResult> => {
      try {
        if (!user.email || !user.password || !user.displayName) {
          throw new Error('必須項目（email, password, displayName）が不足しています。');
        }
        // CRITICAL FIX: Add validation for the 'role' field.
        if (!user.role || !VALID_ROLES.includes(user.role)) {
          throw new Error(`無効な権限が指定されました: "${user.role}"。有効な権限: ${VALID_ROLES.join(', ')}`);
        }

        // 1. Create user in Firebase Authentication
        const userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });

        // 2. Prepare user data for Firestore
        const userDocRef = db.collection('users').doc(userRecord.uid);
        const avatarUrl = `https://picsum.photos/seed/${userRecord.uid}/100/100`;

        const firestoreData: Omit<Member, 'updatedAt'|'createdAt'> & {createdAt: FieldValue, updatedAt: FieldValue} = {
          uid: userRecord.uid,
          email: user.email,
          displayName: user.displayName,
          employeeId: user.employeeId || '',
          company: user.company || '',
          department: user.department || '',
          role: user.role,
          avatarUrl: avatarUrl,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        // 3. Save user data to Firestore
        await userDocRef.set(firestoreData);
        
        console.log(`Successfully imported user: ${user.email}`);
        return { email: user.email, success: true };

      } catch (error: any) {
        console.error(`Failed to import user: ${user.email || 'unknown'}`, { error: error.message });
        return { email: user.email || 'unknown', success: false, error: error.message };
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
    
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Unhandled error in batchImportUsers API route', { error: error.message, stack: error.stack });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
