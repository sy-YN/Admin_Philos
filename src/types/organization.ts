import type { Timestamp } from 'firebase/firestore';

/**
 * Represents a single organizational unit, which could be a
 * company, division, department, or team.
 */
export type Organization = {
  id: string;
  name: string;
  /**
   * The ID of the parent organization.
   * `null` indicates a top-level organization.
   */
  parentId: string | null;
  /**
   * An array of user UIDs who are designated as managers
   * for this organization's goals.
   */
  managerUids: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
