import type { Timestamp } from 'firebase/firestore';

/**
 * Defines the status of a specific permission override.
 * - 'granted': The permission is explicitly given to the user, regardless of their role.
 * - 'denied': The permission is explicitly taken away from the user, regardless of their role.
 */
export type PermissionOverrideStatus = 'granted' | 'denied';

/**
 * Represents a single permission override rule.
 */
export type PermissionOverride = {
  /**
   * The unique identifier of the permission key (e.g., 'video_management').
   */
  id: string;
  /**
   * The status of the override.
   */
  status: PermissionOverrideStatus;
};

/**
 * Represents a document in the `user_permissions` collection.
 * It stores a list of specific permission overrides for an individual user,
 * which take precedence over their role-based permissions.
 */
export type UserPermission = {
  /**
   * The document ID, which is the UID of the user.
   */
  id: string;
  /**
   * The UID of the user to whom these overrides apply.
   */
  userId: string;
  /**
   * An array of permission override objects.
   */
  overrides: PermissionOverride[];
  /**
   * Timestamp of when these overrides were last updated.
   */
  updatedAt: Timestamp;
  /**
   * The UID of the administrator who last updated these overrides.
   */
  updatedBy: string;
};
