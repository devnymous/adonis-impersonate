import type { HttpContext } from '@adonisjs/core/http'
import type { EmitterService } from '@adonisjs/core/types'

import ImpersonateService from './impersonate_service.js'
import type { ResolvedImpersonateConfig } from './types.js'

/**
 * ImpersonateManager holds the resolved config and creates a new
 * `ImpersonateService` bound to a given HTTP context. A single
 * instance is bound into the container by `ImpersonateProvider`.
 */
export default class ImpersonateManager {
  constructor(
    protected config: ResolvedImpersonateConfig,
    protected emitter: EmitterService
  ) {}

  createService(ctx: HttpContext): ImpersonateService {
    return new ImpersonateService(ctx, this.config, this.emitter)
  }
}
