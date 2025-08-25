import type { ExtractableFile } from '../extractFiles/isExtractableFile.js';

/**
 * The default implementation for the function `createUploadLink` option
 * `formDataAppendFile` that uses the standard {@linkcode FormData.append}
 * method.
 * @param formData Form data to append the specified file to.
 * @param fieldName Field name for the file.
 * @param file File to append.
 */
export function formDataAppendFile(
  formData: FormData,
  fieldName: string,
  file: ExtractableFile
): void {
  if ('name' in file) {
    formData.append(fieldName, file, file.name);
  } else {
    formData.append(fieldName, file);
  }
}
