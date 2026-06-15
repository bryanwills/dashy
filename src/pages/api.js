import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useColorMode } from '@docusaurus/theme-common';
import '../styles/api.css';

// Pinned to a commit until the spec lands on HEAD.
const SPEC_URL =
  'https://raw.githubusercontent.com/lissy93/dashy/2bfae4dc03f29e4dc1d58aa4ffd0dcccece109f9/services/api/openapi.yml';

const DESCRIPTION =
  "Interactive reference for Dashy's REST API, generated from its OpenAPI spec";

// Scalar touches `window`, so render it client-side only.
function ApiReference() {
  const { colorMode } = useColorMode();
  return (
    <BrowserOnly fallback={<div className="api-loading">Loading API reference…</div>}>
      {() => {
        const { ApiReferenceReact } = require('@scalar/api-reference-react');
        require('@scalar/api-reference-react/style.css');
        return (
          <ApiReferenceReact
            configuration={{ url: SPEC_URL, darkMode: colorMode === 'dark', hideDarkModeToggle: true }}
          />
        );
      }}
    </BrowserOnly>
  );
}

export default function Api() {
  return (
    <Layout title="API Reference — Dashy" description={DESCRIPTION}>
      <Head>
        <body className="dashy-api-page" />
        <meta property="og:title" content="API Reference — Dashy" />
        <meta property="og:description" content={DESCRIPTION} />
        <link rel="canonical" href="https://dashy.to/api" />
      </Head>
      <main>
        <ApiReference />
      </main>
    </Layout>
  );
}
