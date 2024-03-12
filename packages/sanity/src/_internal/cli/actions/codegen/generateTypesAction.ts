import {constants, open} from 'node:fs/promises'
import {dirname, join} from 'node:path'

import {type CliCommandArguments, type CliCommandContext} from '@sanity/cli'
import {readConfig} from '@sanity/codegen'
import readPkgUp from 'read-pkg-up'
import {Worker} from 'worker_threads'

import {
  type CodegenGenerateTypesWorkerData,
  type CodegenGenerateTypesWorkerMessage,
} from '../../threads/codegenGenerateTypes'
import {TypesGeneratedTrace} from './generateTypes.telemetry'

export interface CodegenGenerateTypesCommandFlags {
  configPath?: string
}

export default async function codegenGenerateAction(
  args: CliCommandArguments<CodegenGenerateTypesCommandFlags>,
  context: CliCommandContext,
): Promise<void> {
  const flags = args.extOptions
  const {output, workDir, telemetry} = context

  const trace = telemetry.trace(TypesGeneratedTrace)
  trace.start()

  const codegenConfig = await readConfig(flags.configPath || 'sanity-codegen.json')

  const rootPkgPath = readPkgUp.sync({cwd: __dirname})?.path
  if (!rootPkgPath) {
    throw new Error('Could not find root directory for `sanity` package')
  }

  const workerPath = join(
    dirname(rootPkgPath),
    'lib',
    '_internal',
    'cli',
    'threads',
    'codegenGenerateTypes.js',
  )

  const spinner = output.spinner({}).start('Generating types')

  const worker = new Worker(workerPath, {
    workerData: {
      workDir,
      schemaPath: codegenConfig.schema,
      searchPath: codegenConfig.path,
    } satisfies CodegenGenerateTypesWorkerData,
    // eslint-disable-next-line no-process-env
    env: process.env,
  })

  const typeFile = await open(
    join(process.cwd(), codegenConfig.generates),
    // eslint-disable-next-line no-bitwise
    constants.O_TRUNC | constants.O_CREAT | constants.O_WRONLY,
  )

  typeFile.write('// This file is generated by `sanity codegen generate`\n')

  const stats = {
    files: 0,
    errors: 0,
    queries: 0,
    schemas: 0,
    unknownTypes: 0,
    size: 0,
  }

  await new Promise<void>((resolve, reject) => {
    worker.addListener('message', (msg: CodegenGenerateTypesWorkerMessage) => {
      if (msg.type === 'error') {
        trace.error(msg.error)

        if (msg.fatal) {
          reject(msg.error)
          return
        }
        const errorMessage = msg.filename
          ? `${msg.error.message} in "${msg.filename}"`
          : msg.error.message
        spinner.fail(errorMessage)
        stats.errors++
        return
      }
      if (msg.type === 'complete') {
        resolve()
        return
      }

      let fileTypeString = `// ${msg.filename}\n`

      if (msg.type === 'schema') {
        stats.schemas += msg.length
        fileTypeString += `${msg.schema}\n\n`
        typeFile.write(fileTypeString)
        return
      }

      stats.files++
      for (const {queryName, query, type, unknownTypes} of msg.types) {
        fileTypeString += `// ${queryName}\n`
        fileTypeString += `// ${query.replace(/(\r\n|\n|\r)/gm, '')}\n`
        fileTypeString += `${type}\n`
        stats.queries++
        stats.unknownTypes += unknownTypes
      }
      typeFile.write(`${fileTypeString}\n`)
      stats.size += Buffer.byteLength(fileTypeString)
    })
    worker.addListener('error', reject)
  })

  typeFile.close()

  trace.log({
    outputSize: stats.size,
    queryTypes: stats.queries,
    schemaTypes: stats.schemas,
    files: stats.files,
    filesWithErrors: stats.errors,
    unknownTypes: stats.unknownTypes,
  })

  trace.complete()
  if (stats.errors > 0) {
    spinner.warn(`Encountered errors in ${stats.errors} files while generating types`)
  }

  spinner.succeed(
    `Generated TypeScript types for ${stats.schemas} schema types and ${stats.queries} queries in ${stats.files} files into: ${codegenConfig.generates}`,
  )
}
