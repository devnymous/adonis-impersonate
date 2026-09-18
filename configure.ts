/*
|--------------------------------------------------------------------------
| Configure hook
|--------------------------------------------------------------------------
|
| Called when someone runs "node ace configure adonis-impersonate".
| It publishes the config file, registers the provider inside
| ".adonisrc.ts" and registers the impersonate middleware as a named
| middleware inside "start/kernel.ts".
|
*/

import type Configure from '@adonisjs/core/commands/configure'

import { stubsRoot } from './stubs/main.js'

export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  await codemods.makeUsingStub(stubsRoot, 'config/impersonate.stub', {})

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('adonis-impersonate/impersonate_provider')
  })

  await codemods.registerMiddleware('named', [
    { name: 'impersonate', path: 'adonis-impersonate/impersonate_middleware' },
  ])

  command.logger.success('Configured adonis-impersonate successfully')
  command.logger.info(
    'Add routes for "POST /impersonate/:id" and "POST /impersonate/leave" using ' +
      'the ImpersonateController — see the README for a copy-pasteable example.'
  )
}
