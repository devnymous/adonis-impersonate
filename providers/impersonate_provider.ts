import type { ApplicationService } from '@adonisjs/core/types'

import ImpersonateManager from '../src/impersonate_manager.js'
import type { ResolvedImpersonateConfig } from '../src/types.js'

export default class ImpersonateProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('impersonate.manager', async () => {
      const config = this.app.config.get<ResolvedImpersonateConfig>('impersonate')
      const { default: emitter } = await import('@adonisjs/core/services/emitter')

      return new ImpersonateManager(config, emitter)
    })
  }
}

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'impersonate.manager': ImpersonateManager
  }
}
