import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import type ImpersonateService from './impersonate_service.js'

/**
 * Creates a request-specific `ImpersonateService` instance and
 * exposes it as `ctx.impersonate`, mirroring how `@adonisjs/auth`
 * exposes `ctx.auth` via its own "InitializeAuthMiddleware".
 *
 * Register this as a named middleware (done automatically by
 * `node ace configure adonis-impersonate`) and apply it to any route
 * that reads/writes impersonation state.
 */
export default class InitializeImpersonationMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const manager = await ctx.containerResolver.make('impersonate.manager')
    ctx.impersonate = manager.createService(ctx)

    return next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    impersonate: ImpersonateService
  }
}
