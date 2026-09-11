import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  generateOpenApiDocument,
  openApiDocumentPath,
  serializeOpenApiDocument,
} from '../src/openapi/document.js'

describe('committed OpenAPI document', () => {
  it('matches the document the application generates', async () => {
    const committed = await readFile(resolve(openApiDocumentPath), 'utf8')
    const current = serializeOpenApiDocument(await generateOpenApiDocument())

    expect(
      committed,
      `${openApiDocumentPath} is out of date; run \`npm run openapi:export\``,
    ).toBe(current)
  })
})
