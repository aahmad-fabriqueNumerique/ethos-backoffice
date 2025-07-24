/**
 * Events API Query Parameters Validation Schema
 *
 * This module defines Zod validation schemas for the events endpoint query parameters.
 * It ensures data integrity, type safety, and provides default values for optional parameters.
 *
 * @module EventsValidationSchema
 */

import { z } from "zod";

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
 * Accepts values between 1 and 100, with default of 20
 */
const maxItemsSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true; // Optional field
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1 && num <= 100;
    },
    {
      message: "Maximum items must be a number between 1 and 100",
    }
  )
  .transform((val) => {
    if (!val) return 20; // Default value
    return Math.min(100, Math.max(1, parseInt(val, 10)));
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
