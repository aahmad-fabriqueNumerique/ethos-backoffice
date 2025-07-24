/**
 * Form Validation Schemas Library
 *
 * This module provides comprehensive Zod validation schemas for all forms
 * throughout the application. It ensures data integrity, security, and
 * consistent validation rules across the entire system.
 *
 * Key Features:
 * - Type-safe validation with Zod
 * - Internationalized error messages for better UX
 * - Consistent regex patterns for field validation
 * - Reusable schemas for different entity types
 * - Custom validation rules and refinements
 * - Integration with VeeValidate for form handling
 *
 * Security Benefits:
 * - Input sanitization through regex validation
 * - Prevention of malicious data injection
 * - Consistent data format enforcement
 * - Runtime type checking for API endpoints
 *
 * Usage Example:
 * ```typescript
 * import { eventFormSchema } from '@/libs/formValidationSchemas';
 * import { toTypedSchema } from '@vee-validate/zod';
 *
 * // In a Vue component
 * const validationSchema = toTypedSchema(eventFormSchema);
 * ```
 *
 * @module FormValidationSchemas
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-18
 */

import { z } from "zod";
import { regexGeneric, regexOptionalGeneric } from "@/libs/regex";

/**
 * Region Form Validation Schema
 *
 * Validates geographical region data for the application.
 * Used for creating and editing region entries in the system.
 *
 * Validation Rules:
 * - nom: Required region name with optional generic pattern validation
 * - region_geographique_libelle: Required geographical description
 *
 * Error Messages:
 * - All errors use internationalization keys for proper localization
 * - Keys are prefixed to indicate the validation type
 *
 * @schema regionFormSchema
 * @example
 * ```typescript
 * const regionData = {
 *   nom: "Nouvelle-Aquitaine",
 *   region_geographique_libelle: "Sud-Ouest de la France"
 * };
 * regionFormSchema.parse(regionData); // ✅ Valid
 * ```
 */
export const regionFormSchema = z.object({
  /**
   * Region name field
   *
   * Required field for the primary identifier of the region.
   * Uses optional generic regex for flexible naming conventions.
   *
   * @field nom
   * @type {string}
   * @required
   * @validation regexOptionalGeneric pattern
   */
  nom: z
    .string({ required_error: "required_region_name" })
    .regex(regexOptionalGeneric, { message: "invalid_region_name" }),

  /**
   * Geographical region description
   *
   * Required field providing a descriptive label for the region's
   * geographical characteristics or location context.
   *
   * @field region_geographique_libelle
   * @type {string}
   * @required
   * @validation regexOptionalGeneric pattern
   */
  region_geographique_libelle: z
    .string({ required_error: "required_geographical_region" })
    .regex(regexOptionalGeneric, { message: "invalid_geographical_region" }),
});

/**
 * Language Form Validation Schema
 *
 * Validates language data entries for the multilingual support system.
 * Ensures language names meet quality standards and length requirements.
 *
 * Validation Rules:
 * - nom: Required language name (2-50 characters)
 * - Pattern validation for security
 * - Length constraints for database optimization
 *
 * @schema languageFormSchema
 * @example
 * ```typescript
 * const languageData = {
 *   nom: "Français"
 * };
 * languageFormSchema.parse(languageData); // ✅ Valid
 *
 * const invalidData = {
 *   nom: "A" // Too short
 * };
 * languageFormSchema.parse(invalidData); // ❌ Throws validation error
 * ```
 */
export const languageFormSchema = z.object({
  /**
   * Language name field
   *
   * The primary identifier for a language in the system.
   * Must be between 2-50 characters for practical usage.
   *
   * Constraints:
   * - Minimum 2 characters (prevents single-letter entries)
   * - Maximum 50 characters (database field limit)
   * - Generic pattern validation for security
   *
   * @field nom
   * @type {string}
   * @required
   * @minLength 2
   * @maxLength 50
   * @validation regexOptionalGeneric pattern
   */
  nom: z
    .string({ required_error: "required_language_name" })
    .regex(regexOptionalGeneric, { message: "invalid_name" })
    .min(2, { message: "name_too_short" })
    .max(50, { message: "name_too_long" }),
});

/**
 * Theme Form Validation Schema
 *
 * Validates theme/category data for content organization.
 * Used for tagging and categorizing songs, events, and other content.
 *
 * Validation Rules:
 * - titre: Required theme title (2-50 characters)
 * - Security pattern validation
 * - Practical length limitations
 *
 * @schema themeFormSchema
 * @example
 * ```typescript
 * const themeData = {
 *   titre: "Musique Traditionnelle"
 * };
 * themeFormSchema.parse(themeData); // ✅ Valid
 * ```
 */
export const themeFormSchema = z.object({
  /**
   * Theme title field
   *
   * The display name for a theme or category in the system.
   * Used for organizing and filtering content by subject matter.
   *
   * Constraints:
   * - Minimum 2 characters for meaningful themes
   * - Maximum 50 characters for UI display limits
   * - Pattern validation for security and consistency
   *
   * @field titre
   * @type {string}
   * @required
   * @minLength 2
   * @maxLength 50
   * @validation regexOptionalGeneric pattern
   */
  titre: z
    .string({ required_error: "required_name" })
    .regex(regexOptionalGeneric, { message: "invalid_name" })
    .min(2, { message: "name_too_short" })
    .max(50, { message: "name_too_long" }),
});

/**
 * Event Form Validation Schema
 *
 * Comprehensive validation schema for event creation and editing.
 * Handles all aspects of event data including dates, location, contact info,
 * and optional fields for social media and participants.
 *
 * Validation Categories:
 * 1. Basic Information: title, description, type
 * 2. Date/Time: start and end dates with temporal validation
 * 3. Location: address, postal code, city, country
 * 4. Contact: phone and email with format validation
 * 5. Optional: image, social networks, participants
 *
 * Special Features:
 * - Date validation to prevent past events (currently commented)
 * - French postal code format validation
 * - International phone number support
 * - URL validation for images
 * - Array validation for dynamic fields
 *
 * @schema eventFormSchema
 * @example
 * ```typescript
 * const eventData = {
 *   titre: "Concert de Jazz",
 *   description: "Une soirée musicale exceptionnelle",
 *   type: "Concert",
 *   dateDebut: new Date('2025-02-15T20:00:00'),
 *   dateFin: new Date('2025-02-15T23:00:00'),
 *   adresse: "123 Rue de la Musique",
 *   codePostal: "75001",
 *   ville: "Paris",
 *   pays: "France",
 *   telephone: "+33 1 23 45 67 89",
 *   email: "contact@concert.fr"
 * };
 * eventFormSchema.parse(eventData); // ✅ Valid
 * ```
 */
export const eventFormSchema = z.object({
  /**
   * Event longitude coordinate
   *
   * Geographic longitude coordinate for precise event location.
   * Automatically converts string input to number for form compatibility.
   *
   * @field longitude
   * @type {number}
   * @required
   * @validation Numeric conversion with coercion
   */
  longitude: z.coerce.number({ required_error: "required_longitude" }),

  /**
   * Event latitude coordinate
   *
   * Geographic latitude coordinate for precise event location.
   * Automatically converts string input to number for form compatibility.
   *
   * @field latitude
   * @type {number}
   * @required
   * @validation Numeric conversion with coercion
   */
  latitude: z.coerce.number({ required_error: "required_latitude" }),

  /**
   * Event title field
   *
   * The primary name/title of the event. This is the main identifier
   * that users will see in listings and search results.
   *
   * @field titre
   * @type {string}
   * @required
   * @validation regexGeneric pattern for security
   */
  titre: z
    .string({ required_error: "required_title" })
    .regex(regexGeneric, { message: "invalid_title" }),

  /**
   * Event description field
   *
   * Detailed description of the event content, purpose, and expectations.
   * Provides users with comprehensive information about what to expect.
   *
   * @field description
   * @type {string}
   * @required
   * @validation regexGeneric pattern for security
   */
  description: z
    .string({ required_error: "required_description" })
    .regex(regexGeneric, { message: "invalid_description" }),

  /**
   * Event type/category field
   *
   * Categorizes the event for filtering and organization purposes.
   * Should match predefined event types in the system.
   *
   * @field type
   * @type {string}
   * @required
   * @validation regexGeneric pattern
   */
  type: z

    .string({ required_error: "required_type" })
    .regex(regexGeneric, { message: "invalid_type" }),

  /**
   * Event start date field
   *
   * The date and time when the event begins.
   * Currently accepts any future or past date.
   *
   * Note: Past date validation is commented out but available:
   * .refine((date) => date > new Date(), { message: "start_date_in_past" })
   *
   * @field dateDebut
   * @type {Date}
   * @required
   * @validation Date object validation
   */
  dateDebut: z.date({ required_error: "required_start_date" }),

  /**
   * Event end date field
   *
   * The date and time when the event concludes.
   * Must be a future date to prevent scheduling past events.
   *
   * Temporal Validation:
   * - Must be a future date (after current time)
   * - Should logically be after start date (handled in UI)
   *
   * @field dateFin
   * @type {Date}
   * @required
   * @validation Date object + future date refinement
   */
  dateFin: z
    .date({ required_error: "required_end_date" })
    .refine((date) => date > new Date(), { message: "end_date_in_past" }),

  /**
   * Event address field
   *
   * Street address where the event will take place.
   * Used for location services and navigation.
   *
   * @field adresse
   * @type {string}
   * @required
   * @validation regexGeneric pattern
   */
  adresse: z
    .string({ required_error: "required_address" })
    .regex(regexGeneric, { message: "invalid_address" }),

  /**
   * Postal code field
   *
   * French postal code validation with strict 5-digit format.
   * Ensures proper geographic identification and mail delivery.
   *
   * Format: NNNNN (exactly 5 digits)
   * Examples: "75001", "13001", "69001"
   *
   * @field codePostal
   * @type {string}
   * @required
   * @validation French postal code regex ^\d{5}$
   */
  codePostal: z
    .string({ required_error: "required_postal_code" })
    .regex(/^\d{5}$/, { message: "invalid_postal_code" }),

  /**
   * City name field
   *
   * The city where the event takes place.
   * Used for location display and geographic organization.
   *
   * @field ville
   * @type {string}
   * @required
   * @validation regexGeneric pattern
   */
  ville: z
    .string({ required_error: "required_city" })
    .regex(regexGeneric, { message: "invalid_city" }),

  /**
   * Country field
   *
   * The country where the event is located.
   * Should match country codes or names from the countries list.
   *
   * @field pays
   * @type {string}
   * @required
   * @validation regexGeneric pattern
   */
  pays: z
    .string({ required_error: "required_country" })
    .regex(regexGeneric, { message: "invalid_country" }),

  /**
   * Phone number field
   *
   * Contact phone number for event inquiries.
   * Supports international formats with flexible formatting.
   *
   * Supported Formats:
   * - International: +33 1 23 45 67 89
   * - National: 01 23 45 67 89
   * - With separators: 01-23-45-67-89
   * - With parentheses: (01) 23 45 67 89
   * - Minimum 7 digits for valid phone numbers
   *
   * @field telephone
   * @type {string}
   * @required
   * @validation Phone number regex ^\+?[0-9\s\-()]{7,}$
   */
  telephone: z
    .string({ required_error: "required_phone" })
    .regex(/^\+?[0-9\s\-()]{7,}$/, { message: "invalid_phone" }),

  /**
   * Email address field
   *
   * Contact email for event communication and registration.
   * Uses Zod's built-in email validation for RFC compliance.
   *
   * @field email
   * @type {string}
   * @required
   * @validation Email format validation
   */
  email: z
    .string({ required_error: "required_email" })
    .email({ message: "invalid_email" }),

  /**
   * Event image field (optional)
   *
   * Optional promotional image for the event.
   * Accepts either a valid URL or a filename for uploaded images.
   *
   * Supported Input Types:
   * 1. Full URLs: Must be HTTP/HTTPS with valid image extensions
   * 2. Filenames: Simple filenames with supported extensions (for uploaded files)
   *
   * Supported Image Formats:
   * - PNG: .png
   * - JPEG: .jpg, .jpeg
   * - GIF: .gif
   * - WebP: .webp
   *
   * URL Examples:
   * - https://example.com/image.jpg
   * - http://cdn.site.com/photos/event.png
   *
   * Filename Examples:
   * - event-123_1674567890123.jpg
   * - uploaded-image.png
   * - my-photo.webp
   *
   * Security Notes:
   * - URLs must use HTTP/HTTPS protocols only
   * - Filenames are validated for safe characters and extensions
   * - File size validation should be handled during upload process
   *
   * @field image
   * @type {string}
   * @optional
   * @validation Custom refine function for URL or filename validation
   */
  image: z
    .string()
    .refine(
      (value) => {
        // Empty string is allowed (optional field)
        if (!value || value.trim() === "") {
          return true;
        }

        // Check if it's a valid URL (starts with http:// or https://)
        if (value.startsWith("http://") || value.startsWith("https://")) {
          try {
            const url = new URL(value);
            // Validate that the URL ends with a supported image extension
            return /\.(png|jpg|jpeg|gif|webp)$/i.test(url.pathname);
          } catch {
            return false; // Invalid URL format
          }
        }

        // If not a URL, validate as filename
        // Allow alphanumeric characters, dots, hyphens, underscores, and spaces
        // Must end with supported image extension
        return /^[a-zA-Z0-9.\-_\s]+\.(png|jpg|jpeg|gif|webp)$/i.test(value);
      },
      {
        message: "invalid_image_format",
        path: ["image"], // Ensure error is associated with the image field
      }
    )
    .optional(),

  /**
   * Social networks array field (optional)
   *
   * Optional array of social media URLs related to the event.
   * Each URL must be a valid social media platform URL for security
   * and to ensure proper social media integration.
   *
   * Supported Platforms:
   * - Facebook: facebook.com, fb.com, m.facebook.com
   * - Instagram: instagram.com, instagr.am
   * - Twitter/X: twitter.com, x.com, mobile.twitter.com
   * - YouTube: youtube.com, youtu.be, m.youtube.com
   * - LinkedIn: linkedin.com
   * - TikTok: tiktok.com
   * - Snapchat: snapchat.com
   * - Pinterest: pinterest.com, pinterest.fr
   * - WhatsApp: wa.me, whatsapp.com
   * - Telegram: t.me, telegram.me
   *
   * URL Format Requirements:
   * - Must include protocol (http:// or https://)
   * - Must be from supported social media domains
   * - Case-insensitive validation
   *
   * Usage Examples:
   * - https://www.facebook.com/events/123456789
   * - https://www.instagram.com/username
   * - https://youtube.com/watch?v=abcd1234
   * - https://twitter.com/username
   * - https://www.linkedin.com/in/profile
   *
   * @field reseauxSociaux
   * @type {string[]}
   * @optional
   * @validation Social media URL regex pattern
   */
  reseauxSociaux: z
    .array(
      z
        .string()
        .url({ message: "invalid_url_format" })
        .regex(
          /^https?:\/\/(www\.)?(facebook\.com|fb\.com|m\.facebook\.com|instagram\.com|instagr\.am|twitter\.com|x\.com|mobile\.twitter\.com|youtube\.com|youtu\.be|m\.youtube\.com|linkedin\.com|tiktok\.com|snapchat\.com|pinterest\.com|pinterest\.fr|wa\.me|whatsapp\.com|t\.me|telegram\.me)/i,
          { message: "invalid_social_network_url" }
        )
        .optional()
    )
    .optional(),

  /**
   * Participants array field (optional)
   *
   * Optional array of participant names for the event.
   * Useful for listing performers, speakers, or special guests.
   *
   * Usage Examples:
   * - Musician names for concerts
   * - Speaker names for conferences
   * - Artist names for exhibitions
   *
   * @field participants
   * @type {string[]}
   * @optional
   * @validation Array of strings with regexGeneric pattern
   */
  participants: z
    .array(z.string().regex(regexGeneric, { message: "invalid_participant" }))
    .optional(),
});

/**
 * Custom Notification Form Validation Schema
 *
 * Validates data for creating custom push notifications.
 * Used by administrators to send targeted messages to users.
 *
 * Validation Rules:
 * - title: Required notification title
 * - message: Required notification content
 * - Both fields use security pattern validation
 *
 * Security Considerations:
 * - Prevents malicious content injection
 * - Ensures proper formatting for notification systems
 * - Validates against harmful scripts or markup
 *
 * @schema customNotifSchema
 * @example
 * ```typescript
 * const notificationData = {
 *   title: "Nouvel Événement",
 *   message: "Un nouveau concert vient d'être ajouté!"
 * };
 * customNotifSchema.parse(notificationData); // ✅ Valid
 * ```
 */
export const customNotifSchema = z.object({
  /**
   * Notification title field
   *
   * The headline or subject of the notification.
   * Displayed prominently in push notification interfaces.
   *
   * Best Practices:
   * - Keep concise (under 50 characters for mobile display)
   * - Use clear, actionable language
   * - Avoid special characters that might break notification systems
   *
   * @field title
   * @type {string}
   * @required
   * @validation regexGeneric pattern for security
   */
  title: z
    .string({ required_error: "required_title" })
    .regex(regexGeneric, { message: "invalid_title" }),

  /**
   * Notification message field
   *
   * The main content body of the notification.
   * Contains detailed information for the user.
   *
   * Best Practices:
   * - Provide clear, actionable information
   * - Keep under 150 characters for optimal mobile display
   * - Include relevant context for user decision-making
   *
   * @field message
   * @type {string}
   * @required
   * @validation regexGeneric pattern for security
   */
  message: z
    .string({
      required_error: "required_message",
    })
    .regex(regexGeneric, { message: "invalid_message" }),
});

/**
 * Schema Export Notes:
 *
 * All schemas are exported as named exports for:
 * 1. Tree-shaking optimization in build process
 * 2. Clear import statements in consuming modules
 * 3. Individual schema testing and validation
 * 4. Flexible composition in complex forms
 *
 * Integration with VeeValidate:
 * ```typescript
 * import { toTypedSchema } from '@vee-validate/zod';
 * import { eventFormSchema } from '@/libs/formValidationSchemas';
 *
 * const validationSchema = toTypedSchema(eventFormSchema);
 * ```
 *
 * Error Message Internationalization:
 * - All error messages use i18n keys
 * - Define translations in locale files
 * - Provides consistent multilingual error handling
 *
 * Future Enhancements:
 * 1. Add conditional validation based on field values
 * 2. Implement cross-field validation (e.g., end date after start date)
 * 3. Add dynamic schema composition for complex forms
 * 4. Include metadata for auto-generating form documentation
 */
