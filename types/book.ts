/**
 * A single page/scene in a generated book.
 * Older books may only have `text`; image fields are optional for backward compatibility.
 */
export type BookPage = {
  text: string;
  /** Optional prompt used to generate this page's image. */
  imagePrompt?: string;
  /** Optional base64 image data for this page (no data URL prefix). */
  imageBase64?: string;
  /** Optional URL of the generated image for this page. */
  imageUrl?: string;
};

/**
 * A generated bedtime book.
 * Older books may only have `title` and `pages` with `text`; cover and page image fields are optional.
 */
export type Book = {
  title: string;
  /**
   * Frozen visual description of the main child, derived from the character profile.
   * Prepended to each image API call for consistent illustrations across scenes.
   */
  characterVisualCapsule?: string;
  /** Optional prompt used to generate the cover image. */
  coverImagePrompt?: string;
  /** Optional base64 image data for the cover (no data URL prefix). */
  coverImageBase64?: string;
  /** Optional URL of the generated cover image. */
  coverImageUrl?: string;
  pages: BookPage[];
};

/** Alias for API and form usage. */
export type GeneratedBook = Book;
