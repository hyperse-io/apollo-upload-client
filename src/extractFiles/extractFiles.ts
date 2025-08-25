import isPlainObject from 'is-plain-obj';
import type { ExtractableFile } from './isExtractableFile.js';

/**
 * String notation for the path to a node in an object tree.
 * @see [`object-path` on npm](https://npm.im/object-path).
 * @example
 * An object path for object property `a`, array index `0`, object property `b`:
 *
 * ```
 * a.0.b
 * ```
 */
export type ObjectPath = string;

/**
 * Deeply clonable value.
 */
export type Cloneable =
  | Array<unknown>
  | FileList
  | Record<PropertyKey, unknown>;

/**
 * Clone of a {@link Cloneable deeply cloneable value}.
 */
export type Clone = Exclude<Cloneable, FileList>;

/**
 * An extraction result.
 * @template Extractable Extractable file type.
 */
export interface Extraction<Extractable = unknown> {
  /** Clone of the original value with extracted files recursively replaced with `null`. */
  clone: unknown;
  /** Extracted files and their object paths within the original value. */
  files: Map<Extractable, Array<ObjectPath>>;
}

/**
 * Recursively extracts files and their {@link ObjectPath object paths} within a
 * value, replacing them with `null` in a deep clone without mutating the
 * original value.
 * [`FileList`](https://developer.mozilla.org/en-US/docs/Web/API/Filelist)
 * instances are treated as
 * [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) instance
 * arrays.
 * @template Extractable Extractable file type.
 * @param value Value to extract files from. Typically an object tree.
 * @param isExtractable Matches extractable files. Typically {@linkcode isExtractableFile}.
 * @param path Prefix for object paths for extracted files. Defaults to `""`.
 * @returns Extraction result.
 * @example
 * Extracting files from an object.
 *
 * For the following:
 *
 * ```js
 * import { extractFiles, isExtractableFile } from "@hyperse/apollo-upload-client/extractFiles";
 * const file1 = new File(["1"], "1.txt", { type: "text/plain" });
 * const file2 = new File(["2"], "2.txt", { type: "text/plain" });
 * const value = {
 *   a: file1,
 *   b: [file1, file2],
 * };
 *
 * const { clone, files } = extractFiles(value, isExtractableFile, "prefix");
 * ```
 *
 * `value` remains the same.
 *
 * `clone` is:
 *
 * ```json
 * {
 *   "a": null,
 *   "b": [null, null]
 * }
 * ```
 *
 * `files` is a
 * [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
 * instance containing:
 *
 * | Key     | Value                        |
 * | :------ | :--------------------------- |
 * | `file1` | `["prefix.a", "prefix.b.0"]` |
 * | `file2` | `["prefix.b.1"]`             |
 */
export function extractFiles<Extractable extends ExtractableFile>(
  value: unknown,
  isExtractable: (value: unknown) => value is Extractable,
  path: ObjectPath = ''
): Extraction<Extractable> {
  if (!arguments.length) {
    throw new TypeError('Argument 1 `value` is required.');
  }

  if (typeof isExtractable !== 'function') {
    throw new TypeError('Argument 2 `isExtractable` must be a function.');
  }

  if (typeof path !== 'string') {
    throw new TypeError('Argument 3 `path` must be a string.');
  }

  /**
   * Map of values recursed within the input value and their clones, for reusing
   * clones of values that are referenced multiple times within the input value.
   */
  const clones = new Map<Cloneable, Clone>();

  /**
   * Extracted files and their object paths within the input value.
   */
  const files = new Map<Extractable, Array<ObjectPath>>();

  /**
   * Recursively clones the value, extracting files.
   * @param value Value to extract files from.
   * @param path Prefix for object paths for extracted files.
   * @param recursed Recursed values for avoiding infinite recursion of circular references within the input value.
   * @returns Clone of the value with files replaced with `null`.
   */
  function recurse(
    value: unknown,
    path: ObjectPath,
    recursed: Set<Cloneable>
  ): unknown {
    if (isExtractable(value)) {
      const filePaths = files.get(value);

      if (filePaths) {
        filePaths.push(path);
      } else {
        files.set(value, [path]);
      }

      return null;
    }

    const valueIsList =
      Array.isArray(value) ||
      (typeof FileList !== 'undefined' && value instanceof FileList);
    const valueIsPlainObject = isPlainObject(value);

    if (valueIsList || valueIsPlainObject) {
      let clone = clones.get(value as Cloneable);

      const uncloned = !clone;

      if (uncloned) {
        clone = valueIsList
          ? []
          : // Replicate if the plain object is an `Object` instance.
            value instanceof Object
            ? {}
            : Object.create(null);

        clones.set(value as Cloneable, clone as Clone);
      }

      if (!recursed.has(value as Cloneable)) {
        const pathPrefix = path ? `${path}.` : '';
        const recursedDeeper = new Set(recursed).add(value as Cloneable);

        if (valueIsList) {
          let index = 0;

          for (const item of value as Array<unknown>) {
            const itemClone = recurse(
              item,
              pathPrefix + index++,
              recursedDeeper
            );

            if (uncloned) (clone as Array<unknown>).push(itemClone);
          }
        } else {
          for (const key in value as Record<PropertyKey, unknown>) {
            const propertyClone = recurse(
              (value as Record<PropertyKey, unknown>)[key],
              pathPrefix + key,
              recursedDeeper
            );

            if (uncloned) {
              (clone as Record<PropertyKey, unknown>)[key] = propertyClone;
            }
          }
        }
      }

      return clone;
    }

    return value;
  }

  return {
    clone: recurse(value, path, new Set()),
    files,
  };
}
