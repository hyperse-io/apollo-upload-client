import { maybe } from '@apollo/client/utilities/internal/globals';

export type TupleToIntersection<T extends any[]> = T extends [infer A]
  ? A
  : T extends [infer A, infer B]
    ? A & B
    : T extends [infer A, infer B, infer C]
      ? A & B & C
      : T extends [infer A, infer B, infer C, infer D]
        ? A & B & C & D
        : T extends [infer A, infer B, infer C, infer D, infer E]
          ? A & B & C & D & E
          : T extends (infer U)[]
            ? U
            : any;

/**
 * Merges the provided objects shallowly and removes
 * all properties with an `undefined` value
 */
export function compact<TArgs extends any[]>(
  ...objects: TArgs
): TupleToIntersection<TArgs> {
  const result = {} as TupleToIntersection<TArgs>;

  objects.forEach((obj) => {
    if (!obj) return;
    Object.keys(obj).forEach((key) => {
      const value = (obj as any)[key];
      if (value !== void 0) {
        result[key] = value;
      }
    });
  });

  return result;
}

export const backupFetch = maybe(() => fetch);
export function noop() {}

// Helper function to serialize fetch parameters (replacement for serializeFetchParameter)
export function serializeFetchParameter(value: unknown, _type: string): string {
  return JSON.stringify(value);
}

/**
 * Creates an AbortController with proper fallback for older environments.
 * This replaces the deprecated createSignalIfSupported function.
 */
export function createAbortController(): AbortController | null {
  if (typeof AbortController !== 'undefined') {
    return new AbortController();
  }
  return null;
}
