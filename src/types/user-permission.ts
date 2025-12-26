import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a document in the `user_permissions` collection.
 * It stores a complete list of permissions for an individual user,
 * which overrides their role-based permissions entirely.
 */
export type UserPermission = {
  /**
   * The document ID, which is the UID of the user.
   */
  id: string;
  /**
   * The UID of the user to whom these permissions apply.
   */
  userId: string;
  /**
   * An array of permission keys (e.g., 'video_management') that this user has.
   * If this document exists for a user, these are their *only* permissions,
   * and their role's permissions are ignored.
   */
  permissions: string[];
  /**
   * Timestamp of when these permissions were last updated.
   */
  updatedAt: Timestamp;
  /**
   * The UID of the administrator who last updated these permissions.
   */
  updatedBy: string;
};
