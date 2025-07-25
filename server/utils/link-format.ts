/**
 * Link with type information
 */
export type EventLink = {
  url: string;
  type:
    | "youtube"
    | "twitch"
    | "agendatrad"
    | "vimeo"
    | "soundcloud"
    | "facebook"
    | "instagram"
    | "twitter"
    | "x"
    | "dailymotion"
    | "flickr"
    | "calameo"
    | "eventbrite"
    | "prezi"
    | "google-forms"
    | "ina"
    | "arte"
    | "allocine"
    | "pictoaccess"
    | "wemap"
    | "mail"
    | "other";
};

/**
 * Processes the links array from OpenAgenda events
 * @param {Array} links - Array of link objects from OpenAgenda
 * @returns {EventLink[]} Array of processed links with types
 */
export function processEventLinks(
  links?: Array<{ link: string; data?: unknown }>
): EventLink[] {
  if (!links || !Array.isArray(links)) {
    return [];
  }

  return links
    .filter((linkObj) => linkObj.link && typeof linkObj.link === "string")
    .map((linkObj) => ({
      url: linkObj.link,
      type: getLinkType(linkObj.link),
    }));
}

/**
 * Determines the type of a link based on its URL
 * @param {string} url - The URL to analyze
 * @returns {string} The type of the link
 */
export function getLinkType(url: string): EventLink["type"] {
  const urlLower = url.toLowerCase();

  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return "youtube";
  }
  if (urlLower.includes("twitch.tv")) {
    return "twitch";
  }
  if (urlLower.includes("agendatrad.org")) {
    return "agendatrad";
  }
  if (urlLower.includes("vimeo.com")) {
    return "vimeo";
  }
  if (urlLower.includes("soundcloud.com")) {
    return "soundcloud";
  }
  if (urlLower.includes("facebook.com")) {
    return "facebook";
  }
  if (urlLower.includes("instagram.com")) {
    return "instagram";
  }
  if (urlLower.includes("twitter.com") || urlLower.includes("t.co")) {
    return "twitter";
  }
  if (urlLower.includes("x.com")) {
    return "x";
  }
  if (urlLower.includes("dailymotion.com")) {
    return "dailymotion";
  }
  if (urlLower.includes("flickr.com")) {
    return "flickr";
  }
  if (urlLower.includes("calameo.com")) {
    return "calameo";
  }
  if (urlLower.includes("eventbrite.com")) {
    return "eventbrite";
  }
  if (urlLower.includes("prezi.com")) {
    return "prezi";
  }
  if (
    urlLower.includes("forms.google.com") ||
    urlLower.includes("docs.google.com/forms")
  ) {
    return "google-forms";
  }
  if (urlLower.includes("ina.fr")) {
    return "ina";
  }
  if (urlLower.includes("arte.tv")) {
    return "arte";
  }
  if (urlLower.includes("allocine.fr")) {
    return "allocine";
  }
  if (urlLower.includes("pictoaccess.fr")) {
    return "pictoaccess";
  }
  if (urlLower.includes("wemap.com")) {
    return "wemap";
  }
  if (urlLower.startsWith("mailto:")) {
    return "mail";
  }

  return "other";
}
