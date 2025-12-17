
import type { Member } from './member';

/**
 * The data required to create a new user, typically from a CSV row.
 * Includes the password which is only used for creation and not stored in Firestore.
 */
export type NewUserPayload = Pick<Member, 'email' | 'displayName' | 'employeeId' | 'organizationId' | 'role'> & {
  password?: string;
};

/**
 * The shape of the data sent to the batchImportUsers Firebase Function.
 */
export interface BatchImportUsersRequest {
  users: NewUserPayload[];
}

/**
 * The result of a single user import attempt within a batch.
 */
export interface UserImportResult {
  email: string;
  success: boolean;
  uid?: string;
  error?: string;
}

/**
 * The overall result of the batch import operation.
 */
export interface BatchImportUsersResponse {
  total: number;
  successCount: number;
  errorCount: number;
  results: UserImportResult[];
}
