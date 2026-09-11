import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  generateOpenApiDocument,
  openApiDocumentPath,
  serializeOpenApiDocument,
} from './document.js'

const target = resolve(process.argv[2] ?? openApiDocumentPath)

try {
  const document = await generateOpenApiDocument()

  await writeFile(target, serializeOpenApiDocument(document), 'utf8')
  console.log(`Wrote OpenAPI document to ${target}`)
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
