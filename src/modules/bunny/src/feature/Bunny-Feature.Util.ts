export default class BunnyFeatureUtil {
  public pluralize(word: string): string {
    if (!word || typeof word !== "string") return "";

    const trimmed = word.trim();
    if (trimmed === "") return "";

    const lower = trimmed.toLowerCase();

    // 1. Already looks plural or ends with 'series' / 'species'
    if (lower.endsWith("series") || lower.endsWith("species")) {
      return trimmed;
    }

    // 2. Irregular entity types common in software development
    const irregulars: Record<string, string> = {
      criterion: "criteria",
      datum: "data",
      child: "children",
      person: "people",
      ox: "oxen",
      mouse: "mice",
    };
    if (irregulars[lower]) {
      // Preserve original casing strategy roughly (Capitalized vs lowercase)
      const match = irregulars[lower];
      return trimmed[0] === trimmed[0].toUpperCase()
        ? match[0].toUpperCase() + match.slice(1)
        : match;
    }

    // 3. Ends in a sibilant sound or 'o': add 'es' (e.g., Match -> Matches, Box -> Boxes, Status -> Statuses)
    if (
      lower.endsWith("s") ||
      lower.endsWith("x") ||
      lower.endsWith("z") ||
      lower.endsWith("ch") ||
      lower.endsWith("sh") ||
      lower.endsWith("o")
    ) {
      // If it already ends in 'es', don't double it (e.g., Categories -> Categories)
      if (lower.endsWith("es")) {
        return trimmed;
      }
      return trimmed + "es";
    }

    // 4. Ends in a consonant + 'y': change 'y' to 'ies' (e.g., Category -> Categories, Company -> Companies)
    // Avoid changing words like 'Day' to 'Daies' by checking for a vowel before 'y'
    if (lower.endsWith("y") && !/[aeiou]y$/.test(lower)) {
      return trimmed.slice(0, -1) + "ies";
    }

    // 5. Ends in 'fe' or 'f': change to 'ves' (e.g., Knife -> Knives, Leaf -> Leaves)
    if (lower.endsWith("fe")) {
      return trimmed.slice(0, -2) + "ves";
    }
    if (lower.endsWith("f") && !lower.endsWith("ff")) {
      return trimmed.slice(0, -1) + "ves";
    }

    // 6. Default fallback rule
    return trimmed + "s";
  }
}
