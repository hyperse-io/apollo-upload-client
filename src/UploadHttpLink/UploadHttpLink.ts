import { ApolloLink, defaultPrinter } from '@apollo/client';
import { BaseHttpLink } from '@apollo/client/link/http';
import { parseAndCheckHttpResponse } from '@apollo/client/link/http';
import {
  fallbackHttpConfig,
  selectHttpOptionsAndBodyInternal,
} from '@apollo/client/link/http';
import { selectURI } from '@apollo/client/link/http';
import { filterOperationVariables } from '@apollo/client/link/utils';
import { isSubscriptionOperation, Observable } from '@apollo/client/utilities';
import { maybe } from '@apollo/client/utilities/internal/globals';
import { extractFiles } from '../extractFiles/extractFiles.js';
import {
  type ExtractableFile,
  isExtractableFile,
} from '../extractFiles/isExtractableFile.js';
import { formDataAppendFile } from './formDataAppendFile.js';
import {
  backupFetch,
  compact,
  createAbortController,
  noop,
  serializeFetchParameter,
} from './utils.js';

/**
 * Checks if a value is an extractable file.
 * @template T Extractable file type.
 */
export interface ExtractableFileMatcher<T> {
  (value: unknown): value is T;
}

/**
 * Appends a file extracted from the GraphQL operation to the
 * [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
 * instance used as the
 * [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch)
 * `options.body` for the
 * [GraphQL multipart request](https://github.com/jaydenseric/graphql-multipart-request-spec).
 * @template T Extractable file type.
 */
export interface FormDataFileAppender<T> {
  (formData: FormData, fieldName: string, file: T): void;
}

/**
 * Options for creating an upload link.
 */
export interface UploadHttpLinkOptions<
  T extends ExtractableFile = ExtractableFile,
> extends BaseHttpLink.Options {
  /**
   * [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) class.
   *  Defaults to the {@linkcode FormData} global.
   */
  FormData?: typeof FormData;
  /**
   * Matches extractable files in the GraphQL operation.
   * Defaults to {@linkcode isExtractableFile}.
   */
  isExtractableFile?: ExtractableFileMatcher<T>;
  /**
   * Customizes how extracted files are appended to the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) instance.
   * Defaults to {@linkcode formDataAppendFile}.
   */
  formDataAppendFile?: FormDataFileAppender<T>;
}

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
 * import { UploadHttpLink } from '@hyperse/apollo-upload-client';
 *
 * const client = new ApolloClient({
 *   cache: new InMemoryCache(),
 *   link: ApolloLink.from([
 *     new ClientAwarenessLink(options),
 *     new UploadHttpLink(options),
 *   ])
 * });
 * ```
 */
export class UploadHttpLink<
  T extends ExtractableFile = ExtractableFile,
> extends ApolloLink {
  private baseHttpLink: BaseHttpLink;

  constructor(options: UploadHttpLinkOptions<T> = {}) {
    super();

    // Create a BaseHttpLink instance for handling non-file requests
    this.baseHttpLink = new BaseHttpLink(options);

    const {
      uri = '/graphql',
      fetch: preferredFetch,
      print = defaultPrinter,
      includeExtensions,
      preserveHeaderCase,
      includeUnusedVariables = false,
      FormData: CustomFormData,
      isExtractableFile:
        customIsExtractableFile = isExtractableFile as ExtractableFileMatcher<T>,
      formDataAppendFile:
        customFormDataAppendFile = formDataAppendFile as FormDataFileAppender<T>,
      ...requestOptions
    } = options;

    const linkConfig = {
      http: compact({ includeExtensions, preserveHeaderCase }),
      options: requestOptions.fetchOptions,
      credentials: requestOptions.credentials,
      headers: requestOptions.headers,
    };

    // Override the request method
    this.request = (operation) => {
      const context = operation.getContext();

      const http = { ...context.http };
      if (isSubscriptionOperation(operation.query)) {
        http.accept = [
          'multipart/mixed;boundary=graphql;subscriptionSpec=1.0',
          ...(http.accept || []),
        ];
      }

      const contextConfig = {
        http,
        options: context.fetchOptions,
        credentials: context.credentials,
        headers: context.headers,
      };

      //uses fallback, link, and then context to build options
      const { options, body } = selectHttpOptionsAndBodyInternal(
        operation,
        print,
        fallbackHttpConfig,
        linkConfig,
        contextConfig
      );

      if (body.variables && !includeUnusedVariables) {
        body.variables = filterOperationVariables(
          body.variables,
          operation.query
        );
      }

      // Extract files from the body
      const { clone, files } = extractFiles(
        body,
        customIsExtractableFile as (value: unknown) => value is ExtractableFile,
        ''
      );

      // If there are no files, directly use HttpLink to handle
      if (!files.size) {
        // No file need to upload, fallback to HttpLink
        return this.baseHttpLink.request(
          operation,
          () => new Observable(() => {})
        );
      }

      // When there are files, use the file upload logic
      const chosenURI = selectURI(operation, uri);

      // Automatically set content-type to multipart/form-data
      if (options.headers) {
        delete options.headers['content-type'];
      }

      // GraphQL multipart request spec:
      // https://github.com/jaydenseric/graphql-multipart-request-spec

      const RuntimeFormData = CustomFormData || FormData;
      const form = new RuntimeFormData();

      form.append('operations', serializeFetchParameter(clone, 'Payload'));

      const map: Record<string, Array<string>> = {};
      let i = 0;
      files.forEach((paths) => {
        map[++i] = paths;
      });
      form.append('map', JSON.stringify(map));

      i = 0;
      files.forEach((_paths, file) => {
        (customFormDataAppendFile as FormDataFileAppender<ExtractableFile>)(
          form,
          String(++i),
          file
        );
      });

      options.body = form;

      let controller = createAbortController();
      let cleanupController = () => {
        controller = null;
      };

      if (controller) {
        if (options.signal) {
          const externalSignal: AbortSignal = options.signal;
          // in an ideal world we could use `AbortSignal.any` here, but
          // React Native uses https://github.com/mysticatea/abort-controller as
          // a polyfill for `AbortController`, and it does not support `AbortSignal.any`.
          const listener = () => {
            controller?.abort(externalSignal.reason);
          };
          externalSignal.addEventListener('abort', listener, { once: true });
          cleanupController = () => {
            controller?.signal.removeEventListener('abort', cleanupController);
            controller = null;
            // on cleanup, we need to stop listening to `options.signal` to avoid memory leaks
            externalSignal.removeEventListener('abort', listener);
            cleanupController = noop;
          };
          // react native also does not support the addEventListener `signal` option
          // so we have to simulate that ourself
          controller.signal.addEventListener('abort', cleanupController, {
            once: true,
          });
        }
        options.signal = controller.signal;
      }

      return new Observable((observer) => {
        // Prefer linkOptions.fetch (preferredFetch) if provided, and otherwise fall back to the *current* global window.
        const runtimeFetch =
          preferredFetch || maybe(() => fetch) || backupFetch;

        runtimeFetch!(chosenURI, options)
          .then((response) => {
            // Forward the response on the context.
            operation.setContext({ response });
            return response;
          })
          .then(parseAndCheckHttpResponse(operation))
          .then((result) => {
            cleanupController();
            observer.next(result);
            observer.complete();
          })
          .catch((error) => {
            cleanupController();
            observer.error(error);
          });

        // Cleanup function.
        return () => {
          // Abort fetch. It’s ok to signal an abort even when not fetching.
          if (controller) {
            controller.abort();
          }
        };
      });
    };
  }
}
