export default function normalizeString(str: string): string {
  if (typeof str !== "string") {
    return "";
  }

  // Normalize the string to NFC form
  const normalized = str.normalize("NFC");

  // Remove diacritics and accents
  return normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
