import type { HttpContext } from '@adonisjs/core/http'
import type { EmitterService } from '@adonisjs/core/types'
import type {} from '@adonisjs/session/session_middleware'
import type {} from '@adonisjs/auth/initialize_auth_middleware'

import {
  CannotImpersonateSelfException,
  ImpersonationNotAllowedException,
  ImpersonatorNotFoundException,
  NotImpersonatingException,
} from './errors.js'
import type { ImpersonatableUser, ResolvedImpersonateConfig } from './types.js'

/**
 * ImpersonateService exposes the impersonation API for a single HTTP
 * request. An instance is created per-request (see `impersonate_middleware.ts`
 * and `impersonate_manager.ts`) and is available as `ctx.impersonate`.
 */
export default class ImpersonateService {
  constructor(
    protected ctx: HttpContext,
    public config: ResolvedImpersonateConfig,
    protected emitter: EmitterService
  ) {}

  /**
   * Whether the current session is the result of an active
   * impersonation.
   */
  isImpersonating(): boolean {
    return this.ctx.session.has(this.config.sessionKey)
  }

  /**
   * The id of the user who started the impersonation, or `null`
   * when not impersonating.
   */
  getImpersonatorId(): string | number | null {
    return this.ctx.session.get(this.config.sessionKey, null)
  }

  /**
   * Resolves a user by id using the `findUserById` hook from the
   * config. Exposed so controllers can resolve impersonation
   * targets using the same lookup.
   */
  resolveUser(id: string | number): Promise<ImpersonatableUser | null> {
    return this.config.findUserById(id)
  }

  /**
   * The original user who started the impersonation, or `null` when
   * not impersonating.
   */
  async getImpersonator(): Promise<ImpersonatableUser | null> {
    const impersonatorId = this.getImpersonatorId()

    if (impersonatorId === null) {
      return null
    }

    return this.resolveUser(impersonatorId)
  }

  /**
   * Start impersonating "toUser" on behalf of "fromUser".
   *
   * - Stores `fromUser.id` in the session under the configured key
   * - Logs "toUser" in using the configured auth guard
   * - Emits the "impersonate:started" event
   */
  async impersonate(fromUser: ImpersonatableUser, toUser: ImpersonatableUser): Promise<void> {
    if (String(fromUser.id) === String(toUser.id)) {
      throw new CannotImpersonateSelfException('You cannot impersonate yourself')
    }

    const [canImpersonate, canBeImpersonated] = await Promise.all([
      this.config.canImpersonate(fromUser, toUser),
      this.config.canBeImpersonated(toUser, fromUser),
    ])

    if (!canImpersonate || !canBeImpersonated) {
      throw new ImpersonationNotAllowedException('You are not allowed to impersonate this user')
    }

    this.ctx.session.put(this.config.sessionKey, fromUser.id)

    const guard = this.ctx.auth.use(this.config.guard as any) as any
    await guard.login(toUser as any)

    await this.emitter.emit('impersonate:started', {
      impersonatorId: fromUser.id,
      impersonatedId: toUser.id,
      happenedAt: new Date(),
    })
  }

  /**
   * Stop impersonating and switch back to the original user.
   *
   * - Reads the impersonator id from the session
   * - Logs the original user back in using the configured auth guard
   * - Clears the session key
   * - Emits the "impersonate:left" event
   */
  async leaveImpersonation(): Promise<ImpersonatableUser> {
    if (!this.isImpersonating()) {
      throw new NotImpersonatingException('You are not currently impersonating anyone')
    }

    const impersonatorId = this.getImpersonatorId() as string | number
    const guard = this.ctx.auth.use(this.config.guard as any) as any
    const impersonatedUser = guard.user as unknown as ImpersonatableUser | undefined

    const impersonator = await this.resolveUser(impersonatorId)

    if (!impersonator) {
      this.ctx.session.forget(this.config.sessionKey)
      throw new ImpersonatorNotFoundException('The original user could not be found')
    }

    this.ctx.session.forget(this.config.sessionKey)
    await guard.login(impersonator as any)

    await this.emitter.emit('impersonate:left', {
      impersonatorId: impersonator.id,
      impersonatedId: impersonatedUser ? impersonatedUser.id : impersonator.id,
      happenedAt: new Date(),
    })

    return impersonator
  }
}
