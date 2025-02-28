/* eslint-disable i18next/no-literal-string */
import {type ReactElement} from 'react'

import {Favicons} from './Favicons'
import {GlobalErrorHandler} from './globalErrorHandler'
import {NoJavascript} from './NoJavascript'

const globalStyles = `
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Regular.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 400;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Italic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Medium.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 500;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-MediumItalic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-SemiBold.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 600;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-SemiBoldItalic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Bold.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 700;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-BoldItalic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 800;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-ExtraBold.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 800;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-ExtraBoldItalic.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: normal;
    font-weight: 900;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-Black.woff2") format("woff2");
  }
  @font-face {
    font-family: Inter;
    font-style: italic;
    font-weight: 900;
    font-display: swap;
    src: url("https://studio-static.sanity.io/Inter-BlackItalic.woff2") format("woff2");
  }
  html {
    background-color: #f1f3f6;
  }
  html,
  body,
  #sanity {
    height: 100%;
  }
  body {
    margin: 0;
    -webkit-font-smoothing: antialiased;
  }
`

/**
 * @hidden
 * @beta */
export interface DefaultDocumentProps {
  entryPath: string
  css?: string[]
  basePath?: string
}

const EMPTY_ARRAY: never[] = []

/**
 * @hidden
 * @beta */
export function DefaultDocument(props: DefaultDocumentProps): ReactElement {
  const {entryPath, css = EMPTY_ARRAY, basePath = '/'} = props
  const addImportMap = false
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="same-origin" />

        <Favicons basePath={basePath} />

        <title>Sanity Studio</title>

        <GlobalErrorHandler />

        {css.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{__html: globalStyles}} />

        {addImportMap && (
          <script
            type="importmap"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `{
              "imports": {
                "react": "https://unpkg.com/sanity@3.38.1-canary.107/dist/react.mjs",
                "react/jsx-runtime": "https://unpkg.com/sanity@3.38.1-canary.107/dist/react_jsx-runtime.mjs",
                "sanity": "https://unpkg.com/sanity@3.38.1-canary.107/dist/index.mjs",
                "sanity/presentation": "https://unpkg.com/sanity@3.38.1-canary.107/dist/presentation.mjs",
                "sanity/desk": "https://unpkg.com/sanity@3.38.1-canary.107/dist/desk.mjs",
                "sanity/router": "https://unpkg.com/sanity@3.38.1-canary.107/dist/router.mjs",
                "sanity/_singletons": "https://unpkg.com/sanity@3.38.1-canary.107/dist/_singletons.mjs",
                "sanity/structure": "https://unpkg.com/sanity@3.38.1-canary.107/dist/structure.mjs",
                "styled-components": "https://unpkg.com/sanity@3.38.1-canary.107/dist/styled-components.mjs"
              }
            }`,
            }}
          />
        )}
      </head>
      <body>
        <div id="sanity" />
        <script type="module" src={entryPath} />
        <NoJavascript />
      </body>
    </html>
  )
}
