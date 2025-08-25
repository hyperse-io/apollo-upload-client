import { isExtractableFile } from '../../src/extractFiles/isExtractableFile.js';

describe('isExtractableFile', () => {
  it('should return true for File instances', () => {
    const file = new File(['content'], 'test.txt');
    expect(isExtractableFile(file)).toBe(true);
  });

  it('should return true for Blob instances', () => {
    const blob = new Blob(['content']);
    expect(isExtractableFile(blob)).toBe(true);
  });

  it('should return false for non-file values', () => {
    expect(isExtractableFile(null)).toBe(false);
    expect(isExtractableFile(undefined)).toBe(false);
    expect(isExtractableFile('string')).toBe(false);
    expect(isExtractableFile(123)).toBe(false);
    expect(isExtractableFile({})).toBe(false);
    expect(isExtractableFile([])).toBe(false);
  });

  it('should handle environments where File/Blob are undefined', () => {
    const originalFile = globalThis.File;
    const originalBlob = globalThis.Blob;

    // @ts-expect-error Intentionally removing File/Blob
    globalThis.File = undefined;
    // @ts-expect-error Intentionally removing File/Blob
    globalThis.Blob = undefined;

    expect(isExtractableFile({})).toBe(false);

    globalThis.File = originalFile;
    globalThis.Blob = originalBlob;
  });
});
