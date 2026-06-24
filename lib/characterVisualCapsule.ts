/**
 * Builds a single frozen visual description for the main child, prepended to every
 * image prompt so illustration models keep the same character across scenes.
 */
export type CharacterProfileForCapsule = {
  genderExpression: string;
  skinTone: string;
  hairColor: string;
  hairType: string;
  hairLength: string;
  signatureDetail?: string;
};

export function buildCharacterVisualCapsule(
  profile: CharacterProfileForCapsule,
  opts?: { childName?: string; age?: number | undefined }
): string {
  const parts: string[] = [
    "MAIN CHILD — keep this exact same child in every illustration (face, hair, skin, proportions):",
  ];
  if (opts?.childName?.trim()) {
    parts.push(`Named ${opts.childName.trim()} in the story (do not paint their name as text in the image).`);
  }
  if (opts?.age != null && opts.age > 0) {
    parts.push(`About ${opts.age} years old, age-appropriate body and face for a children's book.`);
  }
  parts.push(`Gender expression: ${profile.genderExpression}.`);
  parts.push(`Skin tone: ${profile.skinTone}.`);
  parts.push(`Hair: ${profile.hairColor}, ${profile.hairType}, ${profile.hairLength}.`);
  if (profile.signatureDetail?.trim()) {
    parts.push(`Signature look: ${profile.signatureDetail.trim()}.`);
  }
  parts.push(
    "Same friendly, rounded children's-book character design on cover and every page; no photorealistic adult faces."
  );
  return parts.join(" ");
}
