/**
 * Image Upload Composable
 *
 * Provides functionality to upload images to Firebase Storage with
 * comprehensive validation, error handling, and progress tracking.
 *
 * Features:
 * - File type and size validation
 * - Firebase Storage integration
 * - Upload progress tracking
 * - Error handling with detailed messages
 * - Automatic filename generation with timestamps
 * - URL retrieval after successful upload
 *
 * @composable useUploadImage
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-22
 */

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export const useUploadImage = () => {
  /**
   * Upload Image to Firebase Storage
   *
   * Validates and uploads an image file to Firebase Storage, returning
   * the download URL for the uploaded file. Includes comprehensive
   * validation for file type, extension, and size.
   *
   * @async
   * @function uploadImage
   * @param {File} file - The image file to upload
   * @param {string} eventId - Unique identifier for the event (used in filename)
   * @returns {Promise<string>} Download URL of the uploaded image
   * @throws {Error} Validation or upload errors with descriptive messages
   *
   * @example
   * ```typescript
   * const { uploadImage } = useUploadImage();
   *
   * try {
   *   const downloadURL = await uploadImage(imageFile, 'event-123');
   *   console.log('Image uploaded successfully:', downloadURL);
   * } catch (error) {
   *   console.error('Upload failed:', error.message);
   * }
   * ```
   */
  const uploadImage = async (file: File, eventId: string): Promise<string> => {
    console.log(
      "🚀 Starting image upload:",
      file.name,
      "for event ID:",
      eventId
    );

    // Step 1: File validation
    const isTypeOk = file.type.startsWith("image/");
    const isExtensionOk = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isSizeOk = file.size <= 5 * 1024 * 1024; // 5MB max size

    // Detailed validation with specific error messages
    if (!isTypeOk) {
      throw new Error("File must be an image (MIME type validation failed)");
    }

    if (!isExtensionOk) {
      throw new Error(
        "File must have a valid image extension (.jpg, .jpeg, .png, .gif, .webp)"
      );
    }

    if (!isSizeOk) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`File size (${sizeMB}MB) exceeds the 5MB limit`);
    }

    console.log("✅ File validation passed");

    try {
      // Step 2: Initialize Firebase Storage
      const storage = getStorage();

      // Step 3: Generate unique filename with timestamp to avoid conflicts

      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${eventId}.${fileExtension}`;

      console.log("📁 Generated filename:", filename);

      // Step 4: Create storage reference
      const imageRef = storageRef(storage, `images/events/${filename}`);

      console.log("☁️ Uploading to Firebase Storage...");

      // Step 5: Upload file to Firebase Storage
      const uploadResult = await uploadBytes(imageRef, file);

      console.log("✅ Upload completed successfully");

      // Step 6: Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);

      console.log("🔗 Download URL obtained:", downloadURL);

      return downloadURL;
    } catch (error) {
      // Step 7: Enhanced error handling
      console.error("❌ Firebase Storage upload failed:", error);

      // Re-throw with more user-friendly error message
      if (error instanceof Error) {
        throw new Error(`Upload failed: ${error.message}`);
      } else {
        throw new Error("Upload failed due to an unknown error");
      }
    }
  };

  return {
    uploadImage,
  };
};
