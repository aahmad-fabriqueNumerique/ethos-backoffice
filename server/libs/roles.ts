/**
 * User Role Management System
 *
 * This module defines and manages all user roles within the Ethos backoffice application.
 * It provides role constants, validation functions, and type safety for role-based access control.
 *
 * The system implements a hierarchical role structure where:
 * - Admin: Full system access and management capabilities
 * - User: Basic authenticated user with limited permissions
 * - Organisateur: Event organizer with event management permissions
 * - Artiste: Artist with content creation and management permissions
 *
 * @module server/libs/roles
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-22
 */

/**
 * Complete list of all available user roles in the system
 *
 * This array serves as the single source of truth for all valid roles.
 * Used for validation, type checking, and ensuring consistency across the application.
 *
 * @constant {string[]} roles
 */
export const roles = ["admin", "user", "organisateur", "artiste"];

/**
 * Administrator role constant
 *
 * Administrators have full system access including:
 * - User management (create, update, delete users)
 * - System configuration and settings
 * - Data management and analytics
 * - Content moderation and approval
 *
 * @constant {string} ADMIN
 */
export const ADMIN = "admin";

/**
 * Basic user role constant
 *
 * Standard authenticated users with basic permissions:
 * - View public content
 * - Manage their own profile
 * - Submit content for approval
 * - Participate in events (where permitted)
 *
 * @constant {string} USER
 */
export const USER = "user";

/**
 * Event organizer role constant
 *
 * Organizers have permissions to:
 * - Create and manage events
 * - Invite participants
 * - Manage event content and schedules
 * - Access event analytics and reports
 *
 * @constant {string} ORGANISATEUR
 */
export const ORGANISATEUR = "organisateur";

/**
 * Artist role constant
 *
 * Artists have specialized permissions for:
 * - Managing their artistic portfolio
 * - Uploading and managing songs/content
 * - Participating in events as performers
 * - Accessing artist-specific features
 *
 * @constant {string} ARTISTE
 */
export const ARTISTE = "artiste";

/**
 * Validates if a given string is a valid user role
 *
 * This function provides type-safe role validation by checking if the provided
 * role string exists in the predefined roles array. It's used throughout the
 * application to ensure role integrity and prevent invalid role assignments.
 *
 * Security Note: Always use this function when processing role data from
 * external sources (user input, API requests, database queries) to prevent
 * role injection attacks.
 *
 * @function isValidRole
 * @param {string} role - The role string to validate
 * @returns {boolean} True if the role is valid, false otherwise
 *
 * @example
 * ```typescript
 * // Valid role checks
 * isValidRole("admin")        // returns true
 * isValidRole("user")         // returns true
 * isValidRole("organisateur") // returns true
 * isValidRole("artiste")      // returns true
 *
 * // Invalid role checks
 * isValidRole("hacker")       // returns false
 * isValidRole("")             // returns false
 * isValidRole("ADMIN")        // returns false (case sensitive)
 * isValidRole(null)           // returns false
 * ```
 *
 * @example
 * ```typescript
 * // Usage in user creation
 * const createUser = (userData: any) => {
 *   if (!isValidRole(userData.role)) {
 *     throw new Error(`Invalid role: ${userData.role}`);
 *   }
 *   // Proceed with user creation...
 * };
 *
 * // Usage in middleware
 * const requireRole = (requiredRole: string) => {
 *   return (req, res, next) => {
 *     if (!isValidRole(req.user.role)) {
 *       return res.status(403).json({ error: 'Invalid user role' });
 *     }
 *     next();
 *   };
 * };
 * ```
 */
export const isValidRole = (role: string): boolean => {
  return roles.includes(role);
};
