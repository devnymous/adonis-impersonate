import { Exception } from '@adonisjs/core/exceptions'

/**
 * Raised when a user tries to impersonate themselves.
 */
export class CannotImpersonateSelfException extends Exception {
  static status = 403
  static code = 'E_CANNOT_IMPERSONATE_SELF'
}

/**
 * Raised when the configured `canImpersonate`/`canBeImpersonated`
 * checks reject the impersonation attempt.
 */
export class ImpersonationNotAllowedException extends Exception {
  static status = 403
  static code = 'E_IMPERSONATION_NOT_ALLOWED'
}

/**
 * Raised when calling `leaveImpersonation()` while not impersonating
 * anyone.
 */
export class NotImpersonatingException extends Exception {
  static status = 400
  static code = 'E_NOT_IMPERSONATING'
}

/**
 * Raised when the original impersonator can no longer be resolved
 * (e.g. their account was deleted while impersonating another user).
 */
export class ImpersonatorNotFoundException extends Exception {
  static status = 400
  static code = 'E_IMPERSONATOR_NOT_FOUND'
}
