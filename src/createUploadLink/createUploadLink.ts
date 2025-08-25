import type { ApolloLink } from '@apollo/client';
import type { ExtractableFile } from '../extractFiles/isExtractableFile.js';
import { UploadLink, type UploadLinkOptions } from './UploadLink.js';

/**
 * Creates a
 * [terminating Apollo Link](https://www.apollographql.com/docs/react/api/link/introduction/#the-terminating-link)
 * for [Apollo Client](https://www.apollographql.com/docs/react) that fetches a
 * [GraphQL multipart request](https://github.com/jaydenseric/graphql-multipart-request-spec)
 * if the GraphQL variables contain files (by default
 * [`FileList`](https://developer.mozilla.org/en-US/docs/Web/API/FileList),
 * [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File), or
 * [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) instances),
 * or else fetches a regular
 * [GraphQL POST or GET request](https://www.apollographql.com/docs/apollo-server/workflow/requests)
 * (depending on the config and GraphQL operation).
 *
 * Some of the options are similar to the
 * [`createHttpLink` options](https://www.apollographql.com/docs/react/api/link/apollo-link-http/#httplink-constructor-options).
 * @see [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec).
 * @example
 * A basic Apollo Client setup:
 *
 * ```js
 * import { ApolloClient, InMemoryCache } from "@apollo/client";
 * import { createUploadLink } from '@hyperse/apollo-upload-client/createUploadLink';
 *
 * const client = new ApolloClient({
 *   cache: new InMemoryCache(),
 *   link: ApolloLink.from([
 *     createUploadLink(),
 *   ])
 * });
 * ```
 */
export function createUploadLink<T extends ExtractableFile>(
  options: UploadLinkOptions<T> = {}
): ApolloLink {
  return new UploadLink<T>(options);
}
