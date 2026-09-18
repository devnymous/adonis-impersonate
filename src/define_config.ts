import type { ImpersonateConfig, ResolvedImpersonateConfig } from './types.js'

/**
 * Define the impersonate config inside `config/impersonate.ts`.
 * Applies sane defaults for every optional option.
 */
export function defineConfig(config: ImpersonateConfig): ResolvedImpersonateConfig {
  return {
    guard: config.guard ?? 'web',
    sessionKey: config.sessionKey ?? 'impersonator_id',
    redirectTo: config.redirectTo ?? '/',
    redirectBack: config.redirectBack ?? '/',
    findUserById: config.findUserById,
    canImpersonate: config.canImpersonate ?? (() => true),
    canBeImpersonated: config.canBeImpersonated ?? (() => true),
  }
}
