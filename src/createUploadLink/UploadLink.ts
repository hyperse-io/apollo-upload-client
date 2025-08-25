import { HttpLink } from '@apollo/client';
import { ApolloLink, defaultPrinter } from '@apollo/client';
import { parseAndCheckHttpResponse } from '@apollo/client/link/http';
import {
  fallbackHttpConfig,
  selectHttpOptionsAndBodyInternal,
} from '@apollo/client/link/http';
import { selectURI } from '@apollo/client/link/http';
import { Observable } from '@apollo/client/utilities';
import { maybe } from '@apollo/client/utilities/internal/globals';
import { extractFiles } from '../extractFiles/extractFiles.js';
import {
  type ExtractableFile,
  isExtractableFile,
} from '../extractFiles/isExtractableFile.js';
import { formDataAppendFile } from './formDataAppendFile.js';

// Helper function to serialize fetch parameters (replacement for serializeFetchParameter)
function serializeFetchParameter(value: unknown, _type: string): string {
  return JSON.stringify(value);
}

/**
 * Creates an AbortController with proper fallback for older environments.
 * This replaces the deprecated createSignalIfSupported function.
 */
function createAbortController(): AbortController | null {
  if (typeof AbortController !== 'undefined') {
    return new AbortController();
  }
  return null;
}

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

const backupFetch = maybe(() => fetch);
function noop() {}

/**
 * Options for creating an upload link.
 */
export interface UploadLinkOptions<T extends ExtractableFile>
  extends HttpLink.Options {
  /**
   * Matches extractable files in the GraphQL operation.
   * Defaults to {@linkcode isExtractableFile}.
   */
  isExtractableFile?: ExtractableFileMatcher<T>;
  /**
   * [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) class.
   *  Defaults to the {@linkcode FormData} global.
   */
  FormData?: typeof FormData;
  /**
   * Customizes how extracted files are appended to the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) instance.
   * Defaults to {@linkcode formDataAppendFile}.
   */
  formDataAppendFile?: FormDataFileAppender<T>;
}

export class UploadLink<T extends ExtractableFile> extends ApolloLink {
  private httpLink: HttpLink;

  constructor(options: UploadLinkOptions<T> = {}) {
    super();

    // 创建一个 HttpLink 实例用于处理无文件的情况
    this.httpLink = new HttpLink(options);

    const {
      uri: fetchUri = '/graphql',
      isExtractableFile:
        customIsExtractableFile = isExtractableFile as ExtractableFileMatcher<T>,
      FormData: CustomFormData,
      formDataAppendFile:
        customFormDataAppendFile = formDataAppendFile as FormDataFileAppender<T>,
      print = defaultPrinter,
      fetch: preferredFetch,
      fetchOptions,
      credentials,
      headers,
      includeExtensions,
    } = options;

    const linkConfig = {
      http: { includeExtensions },
      options: fetchOptions,
      credentials,
      headers,
    };

    // 重写 request 方法
    this.request = (operation) => {
      const context = operation.getContext();
      const {
        clientAwareness: { name, version } = {},
        headers: contextHeaders,
      } = context;

      const contextConfig = {
        http: context.http,
        options: context.fetchOptions,
        credentials: context.credentials,
        headers: {
          ...(name && { 'apollographql-client-name': name }),
          ...(version && { 'apollographql-client-version': version }),
          ...contextHeaders,
        },
      };

      const { options, body } = selectHttpOptionsAndBodyInternal(
        operation,
        print,
        fallbackHttpConfig,
        linkConfig,
        contextConfig
      );

      const { clone, files } = extractFiles(
        body,
        customIsExtractableFile as (value: unknown) => value is ExtractableFile,
        ''
      );

      // If there are no files, directly use HttpLink to handle
      if (!files.size) {
        // HttpLink is a terminating link, the forward parameter will not be used
        return this.httpLink.request(operation, () => new Observable(() => {}));
      }

      // When there are files, use the file upload logic
      const uri = selectURI(operation, fetchUri);

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
          const listener = () => {
            controller?.abort(externalSignal.reason);
          };
          externalSignal.addEventListener('abort', listener, { once: true });
          cleanupController = () => {
            controller?.signal.removeEventListener('abort', cleanupController);
            controller = null;
            externalSignal.removeEventListener('abort', listener);
            cleanupController = noop;
          };
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

        runtimeFetch!(uri, options)
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
