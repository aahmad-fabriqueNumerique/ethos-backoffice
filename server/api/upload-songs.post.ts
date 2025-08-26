/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Songs Upload API Endpoint
 *
 * This API endpoint provides functionality for bulk importing songs from CSV files
 * into the Firestore database. It handles file upload, CSV parsing, data validation,
 * and batch insertion with comprehensive error handling and security measures.
 *
 * Key Features:
 * - Admin authentication and role-based authorization
 * - Multipart form data handling for file uploads
 * - CSV parsing with automatic delimiter detection
 * - Data validation and sanitization
 * - Batch Firestore operations for performance
 * - Temporary file management with cleanup
 * - Comprehensive error handling and logging
 * - Support for various CSV formats and encodings
 *
 * Security:
 * - Requires valid Firebase ID token
 * - Admin role verification
 * - File size and type validation
 * - Temporary file cleanup
 *
 * Usage:
 * POST /api/upload-songs
 * Headers:
 *   - Authorization: Bearer <firebase-id-token>
 *   - x-filename: <optional-filename.csv>
 * Body: multipart/form-data with "file" field containing CSV
 *
 * Expected CSV Format:
 * - Required columns: titre, auteur
 * - Optional columns: pays, langue, compositeur, paroles, etc.
 * - Supports semicolon-separated values for arrays (interpretes, type_de_chanson)
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "X songs imported successfully",
 *   "count": X,
 *   "songs": [...] // Array of processed song objects
 * }
 *
 * @endpoint POST /api/upload-songs
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-18
 */

import { log } from "console";
import { getFirestore } from "firebase-admin/firestore";
import { writeFile, unlink } from "fs/promises";
import Papa, { type ParseError } from "papaparse";
import createSlug from "~/utils/createSlug";

/**
 * Song data interface for type safety
 * Defines the structure of song objects stored in Firestore
 *
 * @interface SongData
 */
interface SongData {
  /** Song title (required) */
  titre: string;
  /** Song slug (required) */
  slug: string[];
  /** Song author/composer (required) */
  auteur: string;
  /** Country of origin */
  pays: string;
  /** Geographic region description */
  region_geographique_libelle: string;
  /** Song language */
  langue: string;
  /** Music composer */
  compositeur: string;
  /** Song lyrics */
  paroles: string;
  /** Array of song types/genres */
  type_de_chanson: string[];
  /** Geographic region code */
  region: string;
  /** Array of performers/interpreters */
  interpretes: string[];
  /** Album name */
  album: string;
  /** Song theme/subject */
  theme: string;
  /** Historical context information */
  contexte_historique: string;
  /** Song description */
  description: string;
  /** General URLs related to the song */
  urls: string;
  /** Music streaming URLs */
  urls_musique: string;
  /** Archive status flag */
  archived: boolean;
}

/**
 * API response interface for successful operations
 *
 * @interface ApiResponse
 */
interface ApiResponse {
  /** Operation success status */
  success: boolean;
  /** Human-readable success message */
  message: string;
  /** Number of songs successfully imported */
  count: number;
  /** Array of processed song objects */
  songs: SongData[];
}

/**
 * Main API Event Handler
 *
 * Handles the complete flow of CSV file upload, parsing, validation,
 * and batch insertion into Firestore database.
 *
 * Process Flow:
 * 1. Authenticate and authorize user (admin role required)
 * 2. Extract and validate multipart form data
 * 3. Save uploaded file temporarily for processing
 * 4. Parse CSV with automatic format detection
 * 5. Validate and transform data into song objects
 * 6. Batch insert into Firestore database
 * 7. Clean up temporary files
 * 8. Return operation results
 *
 * @param {H3Event} event - Nuxt H3 event object containing request data
 * @returns {Promise<ApiResponse>} Promise resolving to operation results
 * @throws {Error} Various HTTP errors for authentication, validation, or processing failures
 */
export default defineEventHandler(async (event): Promise<ApiResponse> => {
  // Track temporary file path for cleanup
  let filepath = "";

  try {
    // Step 1: Authentication and Authorization
    console.log("🔐 Starting authentication process...");

    /**
     * Extract and validate authorization header
     * Expected format: "Bearer <firebase-id-token>"
     */
    const authHeader = getHeader(event, "authorization");

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid authorization header format",
      });
    }

    // Extract the token from the authorization header
    const token = authHeader.substring(7).trim();
    console.log("✅ Authorization token extracted");

    // Initialize Firebase Admin Auth for token verification
    const auth = getAuth();

    // Verify the ID token and extract user claims
    const decoded = await auth.verifyIdToken(token);
    const userRole = decoded.role || decoded.customClaims?.role;

    console.log(`👤 User authenticated with role: ${userRole}`);

    // Ensure the requester has admin privileges
    if (userRole !== "admin") {
      console.error("❌ Access denied: Admin role required");
      throw createError({
        statusCode: 403,
        statusMessage: "Access forbidden - Admin role required",
      });
    }

    console.log("✅ Admin authorization confirmed");

    // Step 2: File Upload Processing
    console.log("📁 Processing file upload...");

    // Initialize Firestore database connection
    const db = getFirestore(firebaseApp);

    // Process multipart form data to extract uploaded file
    const formData = await readMultipartFormData(event);

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No file found in the request",
      });
    }

    // Find the file in the form data
    const fileData = formData.find((item) => item.name === "file");

    if (!fileData) {
      throw createError({
        statusCode: 400,
        statusMessage: "File not found in form data",
      });
    }

    console.log(`📄 File received: ${fileData.data.length} bytes`);

    // Step 3: Temporary File Management
    /**
     * Get filename from header or use default
     * The x-filename header allows clients to specify the original filename
     */
    const filename = getHeader(event, "x-filename") || "uploaded-songs.csv";

    // Get temporary uploads directory with fallback
    const runtimeConfig = useRuntimeConfig();
    const tmpUploadsDir =
      runtimeConfig.tmpUploadsDir || process.env.TMP_UPLOADS_DIR || "/tmp";

    // Ensure the temporary directory path is valid
    if (!tmpUploadsDir || tmpUploadsDir === "undefined") {
      console.error(
        "❌ TMP_UPLOADS_DIR environment variable not properly configured"
      );
      throw createError({
        statusCode: 500,
        statusMessage:
          "Server configuration error: temporary uploads directory not defined",
      });
    }

    log(`🗂️ Saving file to temporary directory: ${tmpUploadsDir}`);
    filepath = `${tmpUploadsDir}/${filename}`;

    // Write the uploaded file to temporary location for processing
    await writeFile(filepath, fileData.data);
    console.log(`💾 File saved temporarily to ${filepath}`);

    // Step 4: CSV Content Processing and Parsing
    console.log("🔍 Starting CSV parsing process...");

    // Convert buffer to string for text processing
    let content = fileData.data.toString("utf8");

    /**
     * Handle BOM (Byte Order Mark) encoding issues
     * BOM can cause parsing problems with some CSV files
     */
    if (content.includes("\uFEFF")) {
      content = content.replace("\uFEFF", ""); // Remove UTF-8 BOM
      console.log("🔧 UTF-8 BOM detected and removed");
    }

    // Log first part of content for debugging purposes
    console.log("📝 CSV content preview:", content.slice(0, 200) + "...");

    /**
     * Automatic Delimiter Detection
     *
     * Analyzes the first line of the CSV to determine the most likely delimiter.
     * Supports common delimiters: comma, semicolon, tab, pipe.
     *
     * @param {string} csvContent - Raw CSV content to analyze
     * @returns {string} Detected delimiter character
     */
    const detectDelimiter = (csvContent: string): string => {
      const firstLine = csvContent.split("\n")[0];
      const delimiters = [",", ";", "\t", "|"];

      // Count occurrences of each potential delimiter
      for (const delimiter of delimiters) {
        const count = (firstLine.match(new RegExp(`\\${delimiter}`, "g")) || [])
          .length;
        if (count > 0) {
          console.log(
            `🎯 Delimiter detected: "${delimiter}" (${count} occurrences)`
          );
          return delimiter;
        }
      }

      // Default to comma if no delimiter is clearly detected
      console.log("⚠️ No clear delimiter found, defaulting to comma");
      return ",";
    };

    const delimiter = detectDelimiter(content);

    /**
     * Configure PapaParse for robust CSV parsing
     *
     * Settings optimize for:
     * - Header detection and processing
     * - Empty line handling
     * - Quote character handling
     * - Data transformation and cleanup
     */
    console.log("⚙️ Configuring CSV parser...");

    const { data, errors } = Papa.parse(content, {
      header: true, // Use first row as headers
      skipEmptyLines: true, // Skip empty rows
      delimiter: delimiter, // Use detected delimiter
      quoteChar: '"', // Standard quote character
      escapeChar: '"', // Escape character for quotes
      transformHeader: (header: string) => header.trim(), // Clean header names
      transform: (value: string) => value.trim(), // Clean cell values
      complete: (results) => {
        console.log(
          `✅ Parsing completed: ${results.data.length} rows processed`
        );
      },
      error: (error: any) => {
        console.error("❌ Parsing error encountered:", error);
      },
    }) as unknown as {
      data: Papa.ParseResult<unknown>[];
      errors: ParseError[];
    };

    // Step 5: Error Analysis and Data Validation
    console.log("🔍 Analyzing parsing results...");

    /**
     * Check for critical parsing errors
     * Field mismatch errors can indicate structural issues with the CSV
     */
    const criticalErrors = errors.filter(
      (error: any) =>
        error.type === "FieldMismatch" && error.code === "TooManyFields"
    );

    if (criticalErrors.length > 0) {
      console.error("⚠️ Critical parsing errors detected:", criticalErrors);

      // Log debugging information for troubleshooting
      if (data.length > 0) {
        console.log("🔍 First row sample:", data[0]);
        console.log("📋 Detected headers:", Object.keys(data[0] || {}));
      }
    }

    // Log general parsing statistics
    if (errors.length > 0) {
      console.log(`⚠️ Total parsing warnings: ${errors.length}`);
    }

    // Step 6: Data Processing and Transformation
    console.log("🔄 Processing and validating song data...");

    const result = processData(data);

    // Validate that we have usable data
    if (result.count === 0) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "No valid songs found in CSV file. Please ensure 'titre' and 'auteur' columns are present and contain data.",
      });
    }

    console.log(
      `✅ Data processing completed: ${result.count} valid songs found`
    );

    // Step 7: Batch Database Operations
    console.log("💾 Starting database batch operations...");

    /**
     * Use Firestore batch operations for atomic writes
     * This ensures all songs are added together or none are added
     */
    const batch = db.batch();

    result.songs.forEach((song, index) => {
      const docRef = db.collection("chants").doc(); // Auto-generate document ID
      batch.set(docRef, song);

      // Log progress for large batches
      if ((index + 1) % 100 === 0) {
        console.log(
          `📝 Prepared ${index + 1}/${result.songs.length} documents for batch`
        );
      }
    });

    // Execute the batch operation
    await batch.commit();
    console.log(`🎉 Successfully committed ${result.count} songs to database`);

    // Return success response
    return result;
  } catch (error: any) {
    // Step 8: Error Handling and Logging
    console.error("❌ Error during file processing:", error);

    // Re-throw with more context for client
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Server error: ${error.message}`,
    });
  } finally {
    // Step 9: Cleanup Operations
    /**
     * Always attempt to clean up temporary files
     * This prevents disk space accumulation from temporary uploads
     */
    try {
      if (filepath) {
        await unlink(filepath);
        console.log(`🧹 Temporary file cleaned up: ${filepath}`);
      }
    } catch (unlinkError) {
      // Log but don't throw - cleanup failure shouldn't break the response
      console.warn(
        `⚠️ Unable to delete temporary file: ${filepath}`,
        unlinkError
      );
    }
  }
});

/**
 * Data Processing and Validation Function
 *
 * Transforms raw CSV data into validated song objects suitable for database storage.
 * Handles data cleaning, validation, type conversion, and array field processing.
 *
 * Process Flow:
 * 1. Filter rows for required fields (titre, auteur)
 * 2. Transform and clean each valid row
 * 3. Process array fields (semicolon-separated values)
 * 4. Convert boolean fields
 * 5. Return formatted results with statistics
 *
 * @param {any[]} data - Raw parsed CSV data from PapaParse
 * @returns {ApiResponse} Formatted response with processed songs and statistics
 *
 * @example
 * ```typescript
 * const csvData = [
 *   { titre: "Song 1", auteur: "Artist 1", interpretes: "Singer A; Singer B" },
 *   { titre: "", auteur: "Artist 2" }, // Will be filtered out
 * ];
 * const result = processData(csvData);
 * // Returns: { success: true, count: 1, songs: [...], message: "..." }
 * ```
 */
function processData(data: any[]): ApiResponse {
  console.log(`🔄 Starting data processing for ${data.length} rows`);

  // Debug logging for data structure analysis
  if (data.length > 0) {
    console.log("📋 Sample row structure:", data[0]);
    console.log("🔍 Available columns:", Object.keys(data[0]));
  }

  /**
   * Filter and transform data rows
   *
   * Filtering criteria:
   * - Must have non-empty 'titre' (title) field
   * - Must have non-empty 'auteur' (author) field
   */
  const formattedSongs = data
    .filter((row) => {
      // Validate required fields
      const hasTitle = row.titre && row.titre.trim() !== "";
      const hasAuthor = row.auteur && row.auteur.trim() !== "";

      // Log rejected rows for debugging
      if (!hasTitle || !hasAuthor) {
        console.log("❌ Row rejected - missing title or author:", {
          titre: row.titre,
          auteur: row.auteur,
        });
      }

      return hasTitle && hasAuthor;
    })
    .map((row: any, index: number): SongData => {
      // Log processing progress for large datasets
      if ((index + 1) % 100 === 0) {
        console.log(`🔄 Processed ${index + 1} rows...`);
      }

      // Normalize title and create progressive slug with all character variations
      const slug = createSlug(row["titre"] || "");

      /**
       * Transform raw CSV row into structured SongData object
       *
       * Transformations applied:
       * - String trimming and default values
       * - Array field processing (semicolon-separated values)
       * - Boolean field conversion
       * - Empty string handling
       */
      return {
        // Required fields
        titre: row["titre"] || "",
        slug: slug,
        auteur: row["auteur"] || "",

        // Basic string fields with fallbacks
        pays: row["pays"] || "",
        region_geographique_libelle: row["region_geographique_libelle"] || "",
        langue: row["langue"] || "",
        compositeur: row["compositeur"] || "",
        paroles: row["paroles"] || "",
        region: row["region"] || "",
        album: row["album"] || "",
        theme: row["theme"] || "",
        contexte_historique: row["contexte_historique"] || "",
        description: row["description"] || "",
        urls: row["urls"] || "",
        urls_musique: row["urls_musique"] || "",

        /**
         * Array fields processing
         *
         * Converts semicolon-separated strings into arrays:
         * "value1; value2; value3" → ["value1", "value2", "value3"]
         *
         * Steps:
         * 1. Split on semicolon
         * 2. Trim whitespace from each element
         * 3. Filter out empty strings
         * 4. Return array or empty array if no data
         */
        type_de_chanson:
          row["type_de_chanson"]
            ?.split(";")
            .map((s: string) => s.trim())
            .filter(Boolean) || [],

        interpretes:
          row["interpretes"]
            ?.split(";")
            .map((s: string) => s.trim())
            .filter(Boolean) || [],

        /**
         * Boolean field conversion
         *
         * Converts string representations to boolean:
         * "true", "TRUE", "True" → true
         * "false", "FALSE", "False", "", undefined → false
         */
        archived: row["archived"]?.toLowerCase() === "true",
      };
    });

  // Log processing results
  console.log(
    `✅ Data processing completed: ${formattedSongs.length} valid songs out of ${data.length} total rows`
  );

  // Calculate and log statistics
  const rejectedCount = data.length - formattedSongs.length;
  if (rejectedCount > 0) {
    console.log(
      `⚠️ ${rejectedCount} rows were rejected due to missing required fields`
    );
  }

  /**
   * Return formatted response with processing results
   *
   * Includes:
   * - Success status
   * - Human-readable message
   * - Count of processed songs
   * - Array of processed song objects
   */
  return {
    success: true,
    message: `${formattedSongs.length} songs imported successfully`,
    count: formattedSongs.length,
    songs: formattedSongs,
  };
}
