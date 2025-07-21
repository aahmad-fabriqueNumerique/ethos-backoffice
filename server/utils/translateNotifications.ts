import { readFileSync } from "fs";
import { join } from "path";

/**
 * Translation structure interface
 * Defines the expected structure of translation files
 */
interface MessagesStructure {
  notifications?: {
    types?: Record<string, string>;
  };
}

/**
 * Translates notification types based on language
 *
 * This function loads the appropriate translation file and returns
 * the translated notification type. Falls back to English if the
 * requested language is not available, and to the original type
 * if no translation is found.
 *
 * @param lang - Language code (e.g., "fr", "en")
 * @param type - Notification type key to translate
 * @returns Translated notification type or fallback value
 */
export async function translateNotificationType(
  lang: string,
  type: string
): Promise<string> {
  try {
    // Get the root directory path (adjust as needed based on your project structure)
    const rootDir = process.cwd();

    // Try to load the requested language file
    let messages: MessagesStructure;

    try {
      const langFilePath = join(rootDir, "i18n", "locales", `${lang}.json`);
      const langFileContent = readFileSync(langFilePath, "utf-8");
      messages = JSON.parse(langFileContent);
    } catch (langError) {
      console.warn(
        `Could not load language file for "${lang}", falling back to English : ${langError}`
      );

      // Fallback to English if the requested language file doesn't exist
      const enFilePath = join(rootDir, "i18n", "locales", "en.json");
      const enFileContent = readFileSync(enFilePath, "utf-8");
      messages = JSON.parse(enFileContent);
    }

    // Extract the translated notification type
    const translated = messages.notifications?.types?.[type];

    if (translated) {
      return translated;
    } else {
      console.warn(
        `Translation not found for type "${type}" in language "${lang}"`
      );
      return type; // Return the original type if no translation is found
    }
  } catch (error) {
    console.error(
      `Error loading translation for type "${type}" in language "${lang}":`,
      error
    );

    // Return the original type as fallback if all else fails
    return type;
  }
}
