/**
 * An extractable file.
 */
export type ExtractableFile = File | Blob;

/**
 * Checks if a value is an {@link ExtractableFile extractable file}.
 * @param value Value to check.
 * @returns Is the value an {@link ExtractableFile extractable file}.
 */
export function isExtractableFile(value: unknown): value is ExtractableFile {
  return (
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  );
}
