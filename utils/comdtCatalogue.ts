const COMDT_CATALOGUE_SEARCH_URL =
  "https://cataloguedoc.comdt.org/ListRecord.htm?list=table&global=on&table=3&field_all=on&what=";

/**
 * Builds the COMDT catalogue search URL for a song title.
 */
export const getComdtCatalogueSearchUrl = (title?: string): string =>
  `${COMDT_CATALOGUE_SEARCH_URL}${encodeURIComponent((title ?? "").trim())}`;

/**
 * Expected format of a COMDT audio file URL, e.g.
 * https://cataloguedoc.comdt.org/COMDT/197643591582/546_12.mp3
 */
export const regexComdtAudioUrl =
  /^https:\/\/cataloguedoc\.comdt\.org\/COMDT\/\d+\/\d+_\d+\.mp3$/i;
