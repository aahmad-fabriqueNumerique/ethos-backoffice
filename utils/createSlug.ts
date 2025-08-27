/**
 * Service pour créer un slug avec tous les caractères progressifs d'un titre
 *
 * Ce service génère un array contenant toutes les variations progressives
 * du titre normalisé (sans les accents) pour permettre une recherche plus précise avec array.includes().
 *
 * Exemple: "La carioca" → ["l", "la", "la c", "la ca", "la car", "la cari", "la cario", "la carioc", "la carioca"]
 *
 */

import normalizeString from "~/utils/normalizeString";

/**
 * Crée un slug avec tous les caractères progressifs du titre
 *
 * @param titre - Le titre du chant
 * @returns Array contenant toutes les variations progressives du titre normalisé
 */
export function createSlug(titre: string): string[] {
  if (!titre || typeof titre !== "string") {
    return [];
  }

  // Normalise le titre (supprime accents, caractères spéciaux, etc.)
  const titreNormalized = normalizeString(titre).toLowerCase().trim();

  if (!titreNormalized) {
    return [];
  }

  const slugArray: string[] = [];

  // Génère toutes les sous-chaînes progressives
  for (let i = 1; i <= titreNormalized.length; i++) {
    const substring = titreNormalized.substring(0, i);
    slugArray.push(substring);
  }

  return slugArray;
}

/**
 * Version améliorée qui inclut les caractères progressifs de chaque mot
 * En plus des caractères progressifs de la phrase complète
 *
 * @param titre - Le titre du chant
 * @returns Array contenant les caractères progressifs de la phrase + les caractères progressifs de chaque mot
 */
export function createSlugWithWords(titre: string): string[] {
  const progressiveSlug = createSlug(titre);
  const titreNormalized = normalizeString(titre).toLowerCase().trim();

  if (!titreNormalized) {
    return progressiveSlug;
  }

  // Sépare les mots
  const words = titreNormalized.split(" ").filter((word) => word.length > 0);

  // Génère les caractères progressifs pour chaque mot individuellement
  const wordProgressiveSlug: string[] = [];
  words.forEach((word) => {
    for (let i = 1; i <= word.length; i++) {
      const substring = word.substring(0, i);
      wordProgressiveSlug.push(substring);
    }
  });

  // Combine toutes les approches sans doublons :
  // - Caractères progressifs de la phrase complète
  // - Caractères progressifs de chaque mot
  // - Mots complets
  const combinedSlug = [
    ...new Set([...progressiveSlug, ...wordProgressiveSlug, ...words]),
  ];

  return combinedSlug;
}

export default createSlug;
