/**
 * Events API Query Parameters Validation Schema
 *
 * This module defines Zod validation schemas for the events endpoint query parameters.
 * It ensures data integrity, type safety, and provides default values for optional parameters.
 *
 * @module EventsValidationSchema
 */

import { z } from "zod";
import { regexGeneric } from "~/libs/regex";

/**
 * Validation schema for latitude coordinates
 * Valid range: -90 to 90 degrees
 */
const latitudeSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true; // Optional field
      const num = parseFloat(val);
      return !isNaN(num) && num >= -90 && num <= 90;
    },
    {
      message: "Latitude must be a valid number between -90 and 90 degrees",
    }
  );

/**
 * Validation schema for longitude coordinates
 * Valid range: -180 to 180 degrees
 */
const longitudeSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true; // Optional field
      const num = parseFloat(val);
      return !isNaN(num) && num >= -180 && num <= 180;
    },
    {
      message: "Longitude must be a valid number between -180 and 180 degrees",
    }
  );

/**
 * Validation schema for search value
 * Accepts any non-empty string, trims whitespace
 */
const searchValueSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true; // Optional field
      return val.trim().length > 0;
    },
    {
      message: "Search value cannot be empty or contain only whitespace",
    }
  );

/**
 * Validation schema for search value type
 * Defines the type of search to perform on events
 */
const searchValueTypeSchema = z
  .enum(["name", "city", "country", "keywords"], {
    errorMap: () => ({
      message: "Search type must be one of: name, city, country, keywords",
    }),
  })
  .default("name");

/**
 * Validation schema for maximum items parameters
 * Accepts values between 1 and 300, with default of 20
 */
const maxItemsSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true; // Optional field
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1 && num <= 300;
    },
    {
      message: "Maximum items must be a number between 1 and 300",
    }
  )
  .transform((val) => {
    if (!val) return 20; // Default value
    return Math.min(300, Math.max(1, parseInt(val, 10)));
  });

/**
 * Main validation schema for events endpoint query parameters
 *
 * @example
 * ```typescript
 * import { eventsQuerySchema } from '@/server/schemas/events';
 *
 * // In your API endpoint
 * const validatedQuery = eventsQuerySchema.parse(query);
 * ```
 */
export const eventsQuerySchema = z.object({
  /**
   * Latitude coordinate for geographical filtering
   * @optional
   * @range -90 to 90 degrees
   * @example "48.8566"
   */
  lat: latitudeSchema,

  /**
   * Longitude coordinate for geographical filtering
   * @optional
   * @range -180 to 180 degrees
   * @example "2.3522"
   */
  long: longitudeSchema,

  /**
   * Search query text to filter events
   * @optional
   * @example "concert" or "music,festival" (for keywords search)
   */
  searchValue: searchValueSchema,

  /**
   * Type of search to perform
   * @default "name"
   * @options "name" | "city" | "country" | "keywords"
   */
  searchValueType: searchValueTypeSchema,

  /**
   * Maximum number of events to fetch from OpenAgenda API
   * @default 20
   * @range 1 to 100
   */
  maxOpenAgendaItems: maxItemsSchema,

  /**
   * Maximum number of events to fetch from Firestore
   * @default 20
   * @range 1 to 100
   */
  maxFirestoreItems: maxItemsSchema,

  isCalendar: z
    .union([z.boolean(), z.string()])
    .optional()
    .default(false)
    .transform((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        const lower = val.toLowerCase();
        return lower === "true" || lower === "1" || lower === "yes";
      }
      return false;
    })
    .describe(
      "Whether to fetch events for calendar display. Begin event date will be maxed to 4 months from now."
    ),
});

/**
 * Type definition for validated events query parameters
 * Useful for TypeScript type checking in your endpoints
 *
 * @example
 * ```typescript
 * function handleEventsQuery(params: EventsQueryParams) {
 *   // params is now type-safe with default values applied
 * }
 * ```
 */
export type EventsQueryParams = z.infer<typeof eventsQuerySchema>;

/**
 * Helper function to validate and parse events query parameters
 * Returns parsed parameters with defaults applied or throws validation errors
 *
 * @param query - Raw query parameters from the request
 * @returns Validated and parsed query parameters with defaults
 * @throws {ZodError} When validation fails
 *
 * @example
 * ```typescript
 * import { validateEventsQuery } from '@/server/schemas/events';
 *
 * export default defineEventHandler(async (event) => {
 *   try {
 *     const params = validateEventsQuery(getQuery(event));
 *     // Use validated params...
 *   } catch (error) {
 *     throw createError({
 *       statusCode: 400,
 *       statusMessage: 'Invalid query parameters',
 *       data: error.errors
 *     });
 *   }
 * });
 * ```
 */
export function validateEventsQuery(
  query: Record<string, unknown>
): EventsQueryParams {
  return eventsQuerySchema.parse(query);
}

/**
 * Safe validation function that returns either the parsed result or an error
 * Useful when you want to handle validation errors manually
 *
 * @param query - Raw query parameters from the request
 * @returns Object with either success and data, or error details
 *
 * @example
 * ```typescript
 * import { safeValidateEventsQuery } from '@/server/schemas/events';
 *
 * const result = safeValidateEventsQuery(getQuery(event));
 * if (result.success) {
 *   // Use result.data
 * } else {
 *   // Handle result.error
 * }
 * ```
 */
export function safeValidateEventsQuery(query: Record<string, unknown>) {
  return eventsQuerySchema.safeParse(query);
}

/**
 * User Update Validation Schema
 *
 * This schema validates data for updating user information in the system.
 * It ensures that user updates contain valid identifiers and optional fields
 * while maintaining data integrity and security standards.
 *
 * Use Cases:
 * - Admin user management operations
 * - User profile updates
 * - Role assignment and modifications
 * - Email address changes
 *
 * Security Features:
 * - UID validation with regex pattern matching
 * - Email format validation for username updates
 * - Restricted role enumeration to prevent privilege escalation
 * - Optional fields allow partial updates
 *
 * @schema userUpdateSchema
 * @example
 * ```typescript
 * import { userUpdateSchema } from '@/server/schemas/events';
 *
 * // Update user role
 * const updateData = {
 *   uid: "user123abc",
 *   role: "admin"
 * };
 * const validatedData = userUpdateSchema.parse(updateData);
 *
 * // Update user email
 * const emailUpdate = {
 *   uid: "user456def",
 *   username: "newemail@example.com"
 * };
 * const validatedEmailUpdate = userUpdateSchema.parse(emailUpdate);
 * ```
 */
export const userUpdateSchema = z.object({
  /**
   * User unique identifier
   *
   * The Firebase UID or system-generated unique identifier for the user.
   * Must match the generic regex pattern for security validation.
   *
   * Validation Rules:
   * - Required field for all user update operations
   * - Must pass regexGeneric pattern validation
   * - Used to identify the target user for updates
   *
   * Security Considerations:
   * - Validates against malicious input patterns
   * - Ensures UID format consistency
   * - Prevents injection attacks through input sanitization
   *
   * @field uid
   * @type {string}
   * @required
   * @validation regexGeneric pattern matching
   * @example "user_1674567890123", "firebase_uid_abc123"
   */
  uid: z.string().regex(regexGeneric, { message: "invalid_uid" }),

  /**
   * User email address (optional)
   *
   * The user's email address used as username in the system.
   * When provided, updates the user's primary email/username.
   *
   * Validation Rules:
   * - Optional field for partial user updates
   * - Must be a valid email format if provided
   * - Used for authentication and communication
   *
   * Use Cases:
   * - User requests email change
   * - Admin updates user contact information
   * - Profile management operations
   *
   * @field username
   * @type {string}
   * @optional
   * @validation Email format validation
   * @example "user@example.com", "admin@company.fr"
   */
  username: z
    .string({ required_error: "email_required" })
    .email({ message: "invalid_email" })
    .optional(),

  /**
   * User role assignment (optional)
   *
   * Defines the user's access level and permissions within the system.
   * When provided, updates the user's role and associated permissions.
   *
   * Available Roles:
   * - "admin": Full system access, can manage all users and content
   * - "user": Standard user access, limited to own content
   * - "organisateur": Event organizer access, can create and manage events
   * - "artiste": Artist access, can manage own performances and content
   *
   * Validation Rules:
   * - Optional field for partial user updates
   * - Must be one of the predefined role values
   * - Enum validation prevents invalid role assignment
   *
   * Security Considerations:
   * - Restricted to predefined roles only
   * - Prevents privilege escalation through invalid roles
   * - Role changes should be logged for audit purposes
   *
   * @field role
   * @type {enum}
   * @optional
   * @validation Enum validation with predefined values
   * @options ["admin", "user", "organisateur", "artiste"]
   * @example "admin", "user", "organisateur", "artiste"
   */
  role: z
    .enum(["admin", "user", "organisateur", "artiste"], {
      message: "invalid_role",
    })
    .optional(),
});

/**
 * User Validation Schema
 *
 * This schema validates user data for authentication and role verification operations.
 * It ensures that user identification and role assignment meet security requirements
 * with strict validation for both required fields.
 *
 * Use Cases:
 * - User authentication validation
 * - Role-based access control verification
 * - Admin privilege checks
 * - API endpoint authorization
 * - User identity confirmation
 *
 * Security Features:
 * - Mandatory UID validation with regex pattern
 * - Strict role enumeration for access control
 * - No optional fields to ensure complete user data
 * - Input sanitization against malicious patterns
 *
 * Differences from userUpdateSchema:
 * - All fields are required (no optional fields)
 * - Used for validation rather than updates
 * - Focuses on identity and role verification
 * - Stricter validation for security operations
 *
 * @schema validateUserSchema
 * @example
 * ```typescript
 * import { validateUserSchema } from '@/server/schemas/events';
 *
 * // Validate user for admin operation
 * const userData = {
 *   uid: "firebase_user_abc123",
 *   role: "admin"
 * };
 * const validatedUser = validateUserSchema.parse(userData);
 *
 * // Validate organizer for event management
 * const organizerData = {
 *   uid: "org_user_456def",
 *   role: "organisateur"
 * };
 * const validatedOrganizer = validateUserSchema.parse(organizerData);
 * ```
 */
export const validateUserSchema = z.object({
  /**
   * User unique identifier (required)
   *
   * The Firebase UID or system-generated unique identifier for the user.
   * Must match the generic regex pattern for security validation.
   * This field is mandatory for all user validation operations.
   *
   * Validation Rules:
   * - Required field for all user validation operations
   * - Must pass regexGeneric pattern validation
   * - Used to uniquely identify users in the system
   * - No empty or null values allowed
   *
   * Security Considerations:
   * - Validates against malicious input patterns
   * - Ensures UID format consistency across the system
   * - Prevents injection attacks through input sanitization
   * - Required for audit trail and user tracking
   *
   * @field uid
   * @type {string}
   * @required
   * @validation regexGeneric pattern matching
   * @example "firebase_user_123abc", "system_user_456def"
   */
  uids: z.array(z.string().regex(regexGeneric, { message: "invalid_uid" })),

  /**
   * User role (required)
   *
   * Defines the user's access level and permissions within the system.
   * This field is mandatory for proper access control and authorization.
   * Must be one of the predefined role values for security.
   *
   * Available Roles:
   * - "admin": Full system access, can manage all users and content
   * - "user": Standard user access, limited to own content and basic operations
   * - "organisateur": Event organizer access, can create and manage events
   * - "artiste": Artist access, can manage own performances and artistic content
   *
   * Validation Rules:
   * - Required field for all user validation operations
   * - Must be one of the predefined role values
   * - Enum validation prevents invalid role assignment
   * - No custom or undefined roles allowed
   *
   * Security Considerations:
   * - Restricted to predefined roles only
   * - Prevents privilege escalation through invalid roles
   * - Used for access control decisions
   * - Role verification for sensitive operations
   *
   * Access Control Matrix:
   * - Admin: Full CRUD on all resources
   * - Organisateur: CRUD on events, read on users
   * - Artiste: CRUD on own content, read on events
   * - User: Read access, limited personal data updates
   *
   * @field role
   * @type {enum}
   * @required
   * @validation Enum validation with predefined values
   * @options ["admin", "user", "organisateur", "artiste"]
   * @example "admin", "user", "organisateur", "artiste"
   */
  role: z.enum(["admin", "user", "organisateur", "artiste"], {
    message: "invalid_role",
  }),
});
