# @hyperse/apollo-upload-client

A terminating Apollo Link for Apollo Client that handles GraphQL file uploads using multipart requests. When GraphQL variables contain files (FileList, File, or Blob instances), it sends a multipart/form-data request. Otherwise, it falls back to standard GraphQL POST/GET requests based on the configuration and operation type.

<p align="left">
  <a aria-label="Build" href="https://github.com/hyperse-io/apollo-upload-client/actions?query=workflow%3ACI">
    <img alt="build" src="https://img.shields.io/github/actions/workflow/status/hyperse-io/apollo-upload-client/ci-integrity.yml?branch=main&label=ci&logo=github&style=flat-quare&labelColor=000000" />
  </a>
  <a aria-label="stable version" href="https://www.npmjs.com/package/@hyperse/apollo-upload-client">
    <img alt="stable version" src="https://img.shields.io/npm/v/%40hyperse%2Fapollo-upload-client?branch=main&label=version&logo=npm&style=flat-quare&labelColor=000000" />
  </a>
  <a aria-label="Top language" href="https://github.com/hyperse-io/apollo-upload-client/search?l=typescript">
    <img alt="GitHub top language" src="https://img.shields.io/github/languages/top/hyperse-io/apollo-upload-client?style=flat-square&labelColor=000&color=blue">
  </a>
  <a aria-label="Licence" href="https://github.com/hyperse-io/apollo-upload-client/blob/main/LICENSE">
    <img alt="Licence" src="https://img.shields.io/github/license/hyperse-io/apollo-upload-client?style=flat-quare&labelColor=000000" />
  </a>
</p>
