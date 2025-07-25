/**
 * Event Model Types
 *
 * This module defines the TypeScript interfaces for event data throughout
 * the application. It provides type safety for event objects in different
 * contexts and ensures consistent data structure across the system.
 *
 * Key Features:
 * - Firebase Firestore integration with Timestamp support
 * - Flexible date handling for different data sources
 * - UI-specific model for form handling
 * - Optional fields for extended event information
 * - Type safety for all event properties
 *
 * Usage Contexts:
 * 1. EventModel: Database storage and API responses
 * 2. EventUIModel: Form handling and UI components
 *
 * @module EventModel
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-18
 */

import type { Timestamp } from "firebase/firestore";

/**
 * Event Model Interface
 *
 * Primary interface for event data stored in Firebase Firestore.
 * Handles different date formats that can come from various sources:
 * - Firestore Timestamp objects from database queries
 * - Date objects from form inputs
 * - String representations from API calls or serialization
 *
 * This flexible approach allows the same interface to work with:
 * - Fresh data from Firestore (Timestamp)
 * - Form submissions (Date)
 * - JSON serialized data (string)
 *
 * @interface EventModel
 * @example
 * ```typescript
 * // From Firestore
 * const firestoreEvent: EventModel = {
 *   id: "event123",
 *   titre: "Concert de Jazz",
 *   dateDebut: Timestamp.fromDate(new Date()),
 *   // ... other fields
 * };
 *
 * // From form submission
 * const formEvent: EventModel = {
 *   id: "event456",
 *   titre: "Théâtre Musical",
 *   dateDebut: new Date('2025-02-15T20:00:00'),
 *   // ... other fields
 * };
 * ```
 */
export default interface EventModel {
  /**
   * Unique event identifier
   *
   * Primary key for the event in the database.
   * Generated automatically by Firestore or provided by the system.
   *
   * @field id
   * @type {string}
   * @required
   * @example "event_1674567890123" or Firestore document ID
   */
  id: string;

  /**
   * Event title
   *
   * The main display name for the event.
   * Used in listings, search results, and event details.
   *
   * @field titre
   * @type {string}
   * @required
   * @example "Concert de Jazz au Parc", "Festival de Musique Traditionnelle"
   */
  titre: string;

  /**
   * Event description
   *
   * Detailed description of the event content, purpose, and what
   * attendees can expect. Used for promotional materials and listings.
   *
   * @field description
   * @type {string}
   * @required
   * @example "Une soirée exceptionnelle de jazz avec des artistes locaux..."
   */
  description: string;

  /**
   * Event start date and time
   *
   * Flexible date field that accepts multiple formats:
   * - Timestamp: From Firestore database queries
   * - Date: From form inputs and JavaScript operations
   * - string: From API responses or JSON serialization
   *
   * @field dateDebut
   * @type {string | Timestamp | Date}
   * @required
   * @example
   * - Timestamp.fromDate(new Date('2025-02-15T20:00:00'))
   * - new Date('2025-02-15T20:00:00')
   * - "2025-02-15T20:00:00.000Z"
   */
  dateDebut: string | Timestamp | Date;

  /**
   * Event end date and time
   *
   * Flexible date field that accepts multiple formats.
   * Should be chronologically after dateDebut.
   *
   * @field dateFin
   * @type {string | Timestamp | Date}
   * @required
   * @example
   * - Timestamp.fromDate(new Date('2025-02-15T23:00:00'))
   * - new Date('2025-02-15T23:00:00')
   * - "2025-02-15T23:00:00.000Z"
   */
  dateFin: string | Timestamp | Date;

  /**
   * Event street address
   *
   * Physical location where the event takes place.
   * Used for navigation and location services.
   *
   * @field adresse
   * @type {string}
   * @required
   * @example "123 Rue de la Musique", "Place du Théâtre"
   */
  adresse: string;

  /**
   * Postal code
   *
   * French postal code for the event location.
   * Validates as 5-digit format (NNNNN).
   *
   * @field codePostal
   * @type {string}
   * @required
   * @format French postal code (5 digits)
   * @example "75001", "13001", "69001"
   */
  codePostal: string;

  /**
   * City name
   *
   * City where the event is located.
   * Used for geographic organization and display.
   *
   * @field ville
   * @type {string}
   * @required
   * @example "Paris", "Marseille", "Lyon"
   */
  ville: string;

  /**
   * Country name
   *
   * Country where the event takes place.
   * Should match entries from the countries data list.
   *
   * @field pays
   * @type {string}
   * @required
   * @example "France", "Belgique", "Suisse"
   */
  pays: string;

  /**
   * Event promotional image
   *
   * Image URL or filename for event promotion.
   * Can be empty string if no image is provided.
   *
   * Supported formats:
   * - Full URLs: https://example.com/image.jpg
   * - Filenames: event-image.jpg (for uploaded files)
   * - Empty string: No image available
   *
   * @field image
   * @type {string}
   * @required
   * @example
   * - "https://cdn.example.com/events/concert.jpg"
   * - "event_1674567890123.jpg"
   * - "" (no image)
   */
  image: string;

  /**
   * Event type/category
   *
   * Categorizes the event for filtering and organization.
   * Should match predefined event types in the system.
   *
   * @field type
   * @type {string}
   * @required
   * @example "Concert", "Théâtre", "Festival", "Conférence"
   */
  type: string;

  /**
   * Event participants (optional)
   *
   * Array of participant names such as performers, speakers,
   * or special guests. Optional field for events that have
   * specific named participants.
   *
   * @field participants
   * @type {string[]}
   * @optional
   * @example ["Jean Dupont", "Marie Martin", "Orchestre Local"]
   */
  participants?: string[];

  /**
   * Contact phone number
   *
   * Phone number for event inquiries and contact.
   * Supports international and national formats.
   *
   * @field telephone
   * @type {string}
   * @required
   * @format International or national phone number
   * @example "+33 1 23 45 67 89", "01 23 45 67 89"
   */
  telephone: string;

  /**
   * Contact email address
   *
   * Email address for event communication and inquiries.
   * Must be a valid email format.
   *
   * @field email
   * @type {string}
   * @required
   * @format Valid email address
   * @example "contact@event.fr", "info@festival.org"
   */
  email: string;

  /**
   * Social media links (optional)
   *
   * Array of social media URLs related to the event.
   * Each URL must be from supported social media platforms.
   *
   * Supported platforms:
   * - Facebook, Instagram, Twitter/X, YouTube
   * - LinkedIn, TikTok, WhatsApp, Telegram
   *
   * @field reseauxSociaux
   * @type {string[]}
   * @optional
   * @example [
   *   "https://www.facebook.com/events/123456789",
   *   "https://www.instagram.com/username",
   *   "https://twitter.com/username"
   * ]
   */
  reseauxSociaux?: string[];
}

/**
 * Event UI Model Interface
 *
 * Specialized interface for UI components and form handling.
 * Extends EventModel but ensures dates are always Date objects,
 * which is optimal for form inputs and UI components.
 *
 * This model is used when:
 * - Rendering forms for event creation/editing
 * - Processing form submissions
 * - Working with date pickers and UI components
 * - Converting between different date formats
 *
 * The key difference from EventModel is that dates are strictly
 * typed as Date objects, eliminating ambiguity in UI contexts.
 *
 * @interface EventUIModel
 * @extends {Omit<EventModel, "dateDebut" | "dateFin">}
 * @example
 * ```typescript
 * // Converting from EventModel to EventUIModel
 * const convertToUIModel = (event: EventModel): EventUIModel => {
 *   return {
 *     ...event,
 *     dateDebut: event.dateDebut instanceof Date
 *       ? event.dateDebut
 *       : new Date(event.dateDebut),
 *     dateFin: event.dateFin instanceof Date
 *       ? event.dateFin
 *       : new Date(event.dateFin)
 *   };
 * };
 *
 * // Using in a form component
 * const formData: EventUIModel = {
 *   id: "new-event",
 *   titre: "",
 *   description: "",
 *   dateDebut: new Date(),
 *   dateFin: new Date(),
 *   // ... other fields
 * };
 * ```
 */
export interface EventUIModel
  extends Omit<EventModel, "dateDebut" | "dateFin"> {
  /**
   * Event start date (UI format)
   *
   * Date object optimized for form inputs and UI components.
   * Ensures consistent date handling in user interfaces.
   *
   * @field dateDebut
   * @type {Date}
   * @required
   * @example new Date('2025-02-15T20:00:00')
   */
  dateDebut: Date;

  /**
   * Event end date (UI format)
   *
   * Date object optimized for form inputs and UI components.
   * Should be chronologically after dateDebut.
   *
   * @field dateFin
   * @type {Date}
   * @required
   * @example new Date('2025-02-15T23:00:00')
   */
  dateFin: Date;
}
