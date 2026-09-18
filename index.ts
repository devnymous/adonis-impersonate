export { configure } from './configure.js'
export { stubsRoot } from './stubs/main.js'
export { defineConfig } from './src/define_config.js'
export { default as ImpersonateService } from './src/impersonate_service.js'
export { default as ImpersonateManager } from './src/impersonate_manager.js'
export * as errors from './src/errors.js'
export type {
  ImpersonatableUser,
  ImpersonateConfig,
  ResolvedImpersonateConfig,
  ImpersonateEventPayload,
} from './src/types.js'
