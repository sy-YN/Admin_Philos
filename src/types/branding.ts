import type { Timestamp } from 'firebase/firestore';

/**
 * Stores application-wide branding settings.
 * This is stored as a single document at /settings/branding.
 */
export type BrandingSettings = {
  id: 'branding';
  appName: string;
  logoIcon: string;
  /**
   * The HSL value for the primary theme color (e.g., '142.1 76.2% 36.3%').
   */
  primaryColor: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
};
