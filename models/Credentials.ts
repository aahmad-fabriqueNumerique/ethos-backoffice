/**
 * User Authentication Credentials Model
 *
 * This file defines the data structure for user authentication credentials
 * used throughout the application for login and authentication processes.
 *
 * @file Credentials.ts
 * @description Defines the structure of user authentication credentials
 * @author [@CyrilPonsan](https://github.com/CyrilPonsan)
 * @module models/Credentials
 */

/**
 * Credentials interface
 *
 * Represents the authentication credentials required for user login.
 * Used in login forms, authentication requests, and related processes.
 *
 * @interface Credentials
 */
export interface Credentials {
  /**
   * User's username or email address
   * Used as the primary identifier for authentication
   */
  username: string

  /**
   * User's password (plain text before sending to authentication service)
   * Should be handled securely and never stored in application state
   */
  password: string
}
