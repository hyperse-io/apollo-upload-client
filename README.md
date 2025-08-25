# @hyperse/apollo-upload-client

A terminating Apollo Link for Apollo Client that handles GraphQL file uploads using multipart requests. When GraphQL variables contain files (FileList, File, or Blob instances), it sends a multipart/form-data request. Otherwise, it falls back to standard GraphQL POST/GET requests based on the configuration and operation type.

[![Build](https://img.shields.io/github/actions/workflow/status/hyperse-io/apollo-upload-client/ci-integrity.yml?branch=main&label=ci&logo=github&style=flat-quare&labelColor=000000)](https://github.com/hyperse-io/apollo-upload-client/actions?query=workflow%3ACI)
[![Version](https://img.shields.io/npm/v/%40hyperse%2Fapollo-upload-client?branch=main&label=version&logo=npm&style=flat-quare&labelColor=000000)](https://www.npmjs.com/package/@hyperse/apollo-upload-client)
[![Top Language](https://img.shields.io/github/languages/top/hyperse-io/apollo-upload-client?style=flat-square&labelColor=000&color=blue)](https://github.com/hyperse-io/apollo-upload-client/search?l=typescript)
[![License](https://img.shields.io/github/license/hyperse-io/apollo-upload-client?style=flat-quare&labelColor=000000)](https://github.com/hyperse-io/apollo-upload-client/blob/main/LICENSE)

## Features

- 🚀 **Seamless Integration**: Drop-in replacement for Apollo Client's HttpLink
- 📁 **File Upload Support**: Handles File, Blob, and FileList instances automatically
- 🔄 **Smart Request Handling**: Automatically switches between multipart and regular GraphQL requests
- 🎯 **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- 🌐 **Universal Compatibility**: Works in browsers, React Native, and Node.js environments
- ⚡ **Performance Optimized**: Efficient file extraction and request handling

## Installation

```bash
npm install @hyperse/apollo-upload-client
# or
yarn add @hyperse/apollo-upload-client
# or
pnpm add @hyperse/apollo-upload-client
```

## Quick Start

### Basic Setup

```typescript
import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
import { UploadHttpLink } from '@hyperse/apollo-upload-client';

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([
    new UploadHttpLink({
      uri: '/graphql',
    }),
  ]),
});
```

### With Multiple Links

```typescript
import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
import { UploadHttpLink } from '@hyperse/apollo-upload-client';

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: ApolloLink.from([
    new ClientAwarenessLink(),
    // Add other links here (e.g., error handling, authentication)
    new UploadHttpLink({
      uri: '/graphql',
    }),
  ]),
});
```

## Usage

### File Upload Mutation

```typescript
import { gql, useMutation } from '@apollo/client';

const UPLOAD_FILE = gql`
  mutation UploadFile($file: Upload!, $description: String) {
    uploadFile(file: $file, description: $description) {
      id
      filename
      url
    }
  }
`;

function FileUploadComponent() {
  const [uploadFile, { loading, error, data }] = useMutation(UPLOAD_FILE);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadFile({
        variables: {
          file: file,
          description: 'My uploaded file'
        }
      });
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {loading && <p>Uploading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <p>File uploaded: {data.uploadFile.filename}</p>}
    </div>
  );
}
```

### Multiple File Upload

```typescript
const UPLOAD_MULTIPLE_FILES = gql`
  mutation UploadMultipleFiles($files: [Upload!]!) {
    uploadMultipleFiles(files: $files) {
      id
      filename
      url
    }
  }
`;

function MultipleFileUploadComponent() {
  const [uploadFiles, { loading }] = useMutation(UPLOAD_MULTIPLE_FILES);

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      uploadFiles({
        variables: {
          files: files
        }
      });
    }
  };

  return (
    <input type="file" multiple onChange={handleFilesChange} />
  );
}
```

## API Reference

### UploadHttpLink

The main class that handles file uploads in GraphQL requests.

#### Constructor Options

```typescript
interface UploadHttpLinkOptions<T extends ExtractableFile> {
  // HTTP Link options
  uri?: string;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  headers?: Record<string, string>;
  credentials?: RequestCredentials;

  // Upload-specific options
  FormData?: typeof FormData;
  isExtractableFile?: ExtractableFileMatcher<T>;
  formDataAppendFile?: FormDataFileAppender<T>;
}
```

#### Options

- **`uri`** (string, default: `/graphql`): The GraphQL endpoint URI
- **`fetch`** (function): Custom fetch implementation
- **`headers`** (object): Additional HTTP headers
- **`credentials`** (string): Request credentials policy
- **`FormData`** (class): Custom FormData implementation
- **`isExtractableFile`** (function): Custom file detection logic
- **`formDataAppendFile`** (function): Custom file appending logic

### ExtractableFile

```typescript
type ExtractableFile = File | Blob;
```

Supported file types that can be automatically detected and uploaded.

### extractFiles

Utility function to extract files from objects and create upload-ready data.

```typescript
import {
  extractFiles,
  isExtractableFile,
} from '@hyperse/apollo-upload-client/extractFiles';

const { clone, files } = extractFiles(
  { file: myFile, data: { nested: { file: anotherFile } } },
  isExtractableFile
);
```

## How It Works

1. **Request Analysis**: The link analyzes GraphQL operation variables for file objects
2. **Smart Routing**:
   - If files are detected: Creates a multipart/form-data request
   - If no files: Falls back to regular GraphQL HTTP request
3. **File Extraction**: Extracts files and their object paths from variables
4. **Request Construction**: Builds the multipart request according to the [GraphQL multipart request specification](https://github.com/jaydenseric/graphql-multipart-request-spec)
5. **Response Handling**: Processes the response and forwards it to Apollo Client

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/hyperse-io/apollo-upload-client)
- 🐛 [Issue Tracker](https://github.com/hyperse-io/apollo-upload-client/issues)
- 💬 [Discussions](https://github.com/hyperse-io/apollo-upload-client/discussions)

## Related Projects

- [Apollo Client](https://www.apollographql.com/docs/react/) - GraphQL client for React
- [GraphQL Multipart Request Spec](https://github.com/jaydenseric/graphql-multipart-request-spec) - File upload specification

---

Made with ❤️ by the Hyperse team
