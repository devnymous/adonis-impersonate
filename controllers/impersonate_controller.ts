import type { HttpContext } from '@adonisjs/core/http'
import type {} from '@adonisjs/session/session_middleware'
import type {} from '@adonisjs/auth/initialize_auth_middleware'
import type { ImpersonatableUser } from '../src/types.js'

/**
 * Thin controller wiring the two impersonation routes. Import it
 * directly into your `start/routes.ts`:
 *
 * ```ts
 * import ImpersonateController from 'adonis-impersonate/controllers/impersonate_controller'
 *
 * router
 *   .post('/impersonate/:id', [ImpersonateController, 'take'])
 *   .use([middleware.auth(), middleware.impersonate()])
 *
 * router
 *   .post('/impersonate/leave', [ImpersonateController, 'leave'])
 *   .use([middleware.auth(), middleware.impersonate()])
 * ```
 */
export default class ImpersonateController {
  /**
   * POST /impersonate/:id
   */
  async take({ params, auth, response, session, impersonate }: HttpContext) {
    const fromUser = auth.user as unknown as ImpersonatableUser

    const toUser = await impersonate.resolveUser(params.id)

    if (!toUser) {
      session.flash('errors', { impersonate: 'Unable to find the requested user' })
      return response.redirect().back()
    }

    try {
      await impersonate.impersonate(fromUser, toUser)
    } catch (error) {
      session.flash('errors', { impersonate: (error as Error).message })
      return response.redirect().back()
    }

    return response.redirect(impersonate.config.redirectTo)
  }

  /**
   * POST /impersonate/leave
   */
  async leave({ response, session, impersonate }: HttpContext) {
    try {
      await impersonate.leaveImpersonation()
    } catch (error) {
      session.flash('errors', { impersonate: (error as Error).message })
      return response.redirect().back()
    }

    return response.redirect(impersonate.config.redirectBack)
  }
}
