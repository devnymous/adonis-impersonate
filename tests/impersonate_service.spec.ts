import { test } from '@japa/runner'

import { defineConfig } from '../src/define_config.js'
import ImpersonateService from '../src/impersonate_service.js'
import {
  CannotImpersonateSelfException,
  ImpersonationNotAllowedException,
  NotImpersonatingException,
} from '../src/errors.js'
import type { ImpersonatableUser } from '../src/types.js'
import { createFakeCtx, createFakeEmitter } from './helpers/fakes.js'

interface TestUser extends ImpersonatableUser {
  email: string
  isAdmin: boolean
}

const admin: TestUser = { id: 1, email: 'admin@example.com', isAdmin: true }
const customer: TestUser = { id: 2, email: 'customer@example.com', isAdmin: false }

function makeUsers() {
  return new Map<string | number, ImpersonatableUser>([
    [admin.id, admin],
    [customer.id, customer],
  ])
}

function makeService(
  loggedInUser: ImpersonatableUser,
  overrides: Partial<Parameters<typeof defineConfig>[0]> = {}
) {
  const users = makeUsers()
  const ctx = createFakeCtx(loggedInUser)
  const emitter = createFakeEmitter()

  const config = defineConfig({
    findUserById: async (id) => users.get(id) ?? null,
    ...overrides,
  })

  const service = new ImpersonateService(ctx, config, emitter)
  return { service, ctx }
}

test.group('ImpersonateService | impersonate', () => {
  test('stores the impersonator id in the session and logs the target in', async ({ assert }) => {
    const { service, ctx } = makeService(admin)

    assert.isFalse(service.isImpersonating())

    await service.impersonate(admin, customer)

    assert.isTrue(service.isImpersonating())
    assert.equal(service.getImpersonatorId(), admin.id)
    assert.equal((ctx.auth.use('web') as any).user.id, customer.id)
  })

  test('emits the "impersonate:started" event', async ({ assert }) => {
    const users = makeUsers()
    const ctx = createFakeCtx(admin)
    const emitter = createFakeEmitter()
    const config = defineConfig({ findUserById: async (id) => users.get(id) ?? null })
    const service = new ImpersonateService(ctx, config, emitter)

    let payload: any = null
    emitter.on('impersonate:started', (data: unknown) => (payload = data))

    await service.impersonate(admin, customer)

    assert.isNotNull(payload)
    assert.equal(payload.impersonatorId, admin.id)
    assert.equal(payload.impersonatedId, customer.id)
    assert.instanceOf(payload.happenedAt, Date)
  })

  test('blocks self-impersonation', async ({ assert }) => {
    const { service } = makeService(admin)

    await assert.rejects(() => service.impersonate(admin, admin), CannotImpersonateSelfException)
  })

  test('blocks impersonation when "canImpersonate" returns false', async ({ assert }) => {
    const { service } = makeService(admin, {
      canImpersonate: () => false,
    })

    await assert.rejects(
      () => service.impersonate(admin, customer),
      ImpersonationNotAllowedException
    )
  })

  test('blocks impersonation when "canBeImpersonated" returns false', async ({ assert }) => {
    const { service } = makeService(admin, {
      canBeImpersonated: (target) => !(target as TestUser).isAdmin,
    })

    // admin impersonating another admin should be blocked
    const anotherAdmin: TestUser = { id: 3, email: 'other-admin@example.com', isAdmin: true }

    await assert.rejects(
      () => service.impersonate(admin, anotherAdmin),
      ImpersonationNotAllowedException
    )
  })
})

test.group('ImpersonateService | leaveImpersonation', () => {
  test('restores the original user and clears the session', async ({ assert }) => {
    const { service, ctx } = makeService(admin)

    await service.impersonate(admin, customer)
    assert.isTrue(service.isImpersonating())

    const restored = await service.leaveImpersonation()

    assert.equal(restored.id, admin.id)
    assert.isFalse(service.isImpersonating())
    assert.equal((ctx.auth.use('web') as any).user.id, admin.id)
  })

  test('throws when not currently impersonating', async ({ assert }) => {
    const { service } = makeService(admin)

    await assert.rejects(() => service.leaveImpersonation(), NotImpersonatingException)
  })
})

test.group('ImpersonateService | getImpersonator', () => {
  test('returns null when not impersonating', async ({ assert }) => {
    const { service } = makeService(admin)

    assert.isNull(await service.getImpersonator())
  })

  test('resolves the original impersonator while impersonating', async ({ assert }) => {
    const { service } = makeService(admin)

    await service.impersonate(admin, customer)

    const impersonator = await service.getImpersonator()
    assert.equal(impersonator?.id, admin.id)
  })
})
