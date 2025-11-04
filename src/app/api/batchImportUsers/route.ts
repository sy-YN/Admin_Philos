
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
    const { users } = (await req.json()) as BatchImportUsersRequest;

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid request body. "users" array is required.' }, { status: 400 });
    }

    const results: UserImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    const importPromises = users.map(async (user: NewUserPayload) => {
      try {
        // --- Start: Added Validation ---
        if (!user.email || !user.password || !user.displayName) {
          throw new Error('必須項目（email, password, displayName）が不足しています。');
        }
        // --- End: Added Validation ---

        // Role validation
        if (!user.role || !VALID_ROLES.includes(user.role)) {
          throw new Error(`無効な権限が指定されました: "${user.role}"。有効な権限: ${VALID_ROLES.join(', ')}`);
        }

        // 1. Create user in Firebase Authentication
        const userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true, // Assuming email is verified for simplicity
        });

        // 2. Save user data to Firestore
        const userDocRef = db.collection('users').doc(userRecord.uid);
        const avatarUrl = `https://picsum.photos/seed/${userRecord.uid}/100/100`;

        await userDocRef.set({
          uid: userRecord.uid,
          email: user.email,
          displayName: user.displayName,
          employeeId: user.employeeId || null,
          company: user.company || null,
          department: user.department || null,
          role: user.role,
          avatarUrl: avatarUrl,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        results.push({ email: user.email, success: true });
        successCount++;
        console.log(`Successfully imported user: ${user.email}`);

      } catch (error: any) {
        results.push({ email: user.email, success: false, error: error.message });
        errorCount++;
        console.error(`Failed to import user: ${user.email}`, { error: error.message });
      }
    });

    await Promise.all(importPromises);

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
