
import { https, logger } from 'firebase-functions';
import { auth, db } from '../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  NewUserPayload,
  UserImportResult,
  BatchImportUsersRequest,
  BatchImportUsersResponse,
} from '../types/functions';
import { Member } from '@/types/member';

const VALID_ROLES: Member['role'][] = ['admin', 'executive', 'manager', 'employee'];

// CORSを有効にするため、onCallではなくonRequestを使用
export const batchImportUsers = https.onRequest(async (req, res) => {
  // CORSヘッダーを設定
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-control-allow-methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // pre-flightリクエスト（OPTIONS）への対応
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { users } = req.body as BatchImportUsersRequest;
    if (!users || !Array.isArray(users)) {
      logger.error('Invalid request body', { body: req.body });
      res.status(400).json({ error: 'Invalid request body. "users" array is required.' });
      return;
    }

    const results: UserImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    const importPromises = users.map(async (user: NewUserPayload) => {
      try {
        // Role validation
        if (!user.role || !VALID_ROLES.includes(user.role)) {
            throw new Error(`Invalid role specified: "${user.role}". Must be one of: ${VALID_ROLES.join(', ')}`);
        }

        // 1. Firebase Authenticationにユーザーを作成
        const userRecord = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });

        // 2. Firestoreにユーザーデータを保存
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
        logger.info(`Successfully imported user: ${user.email}`);

      } catch (error: any) {
        results.push({ email: user.email, success: false, error: error.message });
        errorCount++;
        logger.error(`Failed to import user: ${user.email}`, { error: error.message, stack: error.stack });
      }
    });

    await Promise.all(importPromises);

    const response: BatchImportUsersResponse = {
      total: users.length,
      successCount,
      errorCount,
      results,
    };
    
    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Unhandled error in batchImportUsers function', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});
