import { EventEmitter } from 'node:events'
import type { HttpContext } from '@adonisjs/core/http'
import type { EmitterService } from '@adonisjs/core/types'
import type { ImpersonatableUser } from '../../src/types.js'

/**
 * A minimal in-memory session store implementing just the methods
 * `ImpersonateService` relies on.
 */
export class FakeSession {
  #store = new Map<string, unknown>()

  put(key: string, value: unknown) {
    this.#store.set(key, value)
  }

  get<T = unknown>(key: string, defaultValue?: T): T {
    return (this.#store.has(key) ? this.#store.get(key) : defaultValue) as T
  }

  has(key: string): boolean {
    return this.#store.has(key)
  }

  forget(key: string) {
    this.#store.delete(key)
  }
}

/**
 * A fake auth guard implementing just `login()` and `user`, mirroring
 * the parts of `@adonisjs/auth`'s SessionGuard that `ImpersonateService`
 * uses.
 */
export class FakeGuard {
  user?: ImpersonatableUser

  constructor(user?: ImpersonatableUser) {
    this.user = user
  }

  async login(user: ImpersonatableUser) {
    this.user = user
  }

  async logout() {
    this.user = undefined
  }
}

export class FakeAuth {
  #guards = new Map<string, FakeGuard>()

  constructor(defaultGuard: FakeGuard) {
    this.#guards.set('web', defaultGuard)
  }

  use(guardName = 'web'): FakeGuard {
    if (!this.#guards.has(guardName)) {
      this.#guards.set(guardName, new FakeGuard())
    }
    return this.#guards.get(guardName)!
  }
}

/**
 * Builds a fake HttpContext exposing just `session` and `auth`, which
 * is all `ImpersonateService` touches. Cast to `HttpContext` since we
 * intentionally don't stub the rest of the (unused) surface.
 */
export function createFakeCtx(loggedInUser?: ImpersonatableUser) {
  const session = new FakeSession()
  const auth = new FakeAuth(new FakeGuard(loggedInUser))

  return { session, auth } as unknown as HttpContext
}

/**
 * A plain Node `EventEmitter` wrapped to satisfy the tiny slice of
 * `EmitterService` that `ImpersonateService` uses (`emit`), while
 * staying listenable via `on()` for assertions in tests.
 */
export function createFakeEmitter(): EmitterService & EventEmitter {
  const emitter = new EventEmitter()
  const service = emitter as unknown as EmitterService & EventEmitter

  service.emit = (async (event: string, payload: unknown) => {
    EventEmitter.prototype.emit.call(emitter, event, payload)
  }) as EmitterService['emit']

  return service
}
