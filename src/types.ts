/**
 * The minimal shape a user model must satisfy to be impersonated.
 * Any Lucid model (or plain object coming from another ORM) that
 * exposes an "id" works out of the box.
 *
 * Deliberately has no index signature: adding one would require
 * every real model class (e.g. a Lucid model) to also declare a
 * matching index signature to structurally satisfy this type, which
 * defeats the point of keeping this loose.
 */
export interface ImpersonatableUser {
  id: string | number
}

/**
 * Config accepted by `defineConfig()` inside the user's
 * `config/impersonate.ts` file.
 */
export interface ImpersonateConfig {
  /**
   * The auth guard used to read/switch the logged-in user.
   * Defaults to "web".
   */
  guard?: string

  /**
   * The session key used to store the impersonator's original id.
   * Defaults to "impersonator_id".
   */
  sessionKey?: string

  /**
   * Where to redirect after successfully starting an impersonation.
   * Defaults to "/".
   */
  redirectTo?: string

  /**
   * Where to redirect after leaving an impersonation.
   * Defaults to "/".
   */
  redirectBack?: string

  /**
   * Resolves a user by id. Used to find the impersonation target as
   * well as to restore the original impersonator when leaving.
   */
  findUserById: (id: string | number) => Promise<ImpersonatableUser | null>

  /**
   * Return `false` to block "impersonator" from impersonating "target".
   * Defaults to always allowing impersonation (self-impersonation is
   * always blocked separately, regardless of this hook).
   */
  canImpersonate?: (
    impersonator: ImpersonatableUser,
    target: ImpersonatableUser
  ) => boolean | Promise<boolean>

  /**
   * Return `false` to block "target" from being impersonated by
   * "impersonator". Use this to protect sensitive accounts, e.g.
   * preventing admins from being impersonated by other admins.
   */
  canBeImpersonated?: (
    target: ImpersonatableUser,
    impersonator: ImpersonatableUser
  ) => boolean | Promise<boolean>
}

/**
 * The config shape after `defineConfig()` has applied its defaults.
 */
export interface ResolvedImpersonateConfig {
  guard: string
  sessionKey: string
  redirectTo: string
  redirectBack: string
  findUserById: (id: string | number) => Promise<ImpersonatableUser | null>
  canImpersonate: (
    impersonator: ImpersonatableUser,
    target: ImpersonatableUser
  ) => boolean | Promise<boolean>
  canBeImpersonated: (
    target: ImpersonatableUser,
    impersonator: ImpersonatableUser
  ) => boolean | Promise<boolean>
}

/**
 * Payload emitted with the "impersonate:started" and
 * "impersonate:left" events.
 */
export interface ImpersonateEventPayload {
  impersonatorId: string | number
  impersonatedId: string | number
  happenedAt: Date
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'impersonate:started': ImpersonateEventPayload
    'impersonate:left': ImpersonateEventPayload
  }
}
