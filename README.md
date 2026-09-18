# adonis-impersonate

User impersonation for [AdonisJS v6](https://adonisjs.com), inspired by [lab404/laravel-impersonate](https://github.com/404labfr/laravel-impersonate). Lets an authenticated user (typically an admin) temporarily log in as another user, with a clean way back to their own session.

## Installation

Install the package from your AdonisJS project:

```bash
npm i adonis-impersonate
```

Then configure it:

```bash
node ace configure adonis-impersonate
```

This will:

- Create the `config/impersonate.ts` config file
- Register the `ImpersonateProvider` inside `adonisrc.ts`
- Register `impersonate` as a named middleware inside `start/kernel.ts`

## Setup

### 1. Configure the lookup, guard and permission checks

Edit `config/impersonate.ts`:

```ts
import { defineConfig } from 'adonis-impersonate'

export default defineConfig({
  guard: 'web',
  sessionKey: 'impersonator_id',
  redirectTo: '/',
  redirectBack: '/',

  findUserById: async (id) => {
    const User = (await import('#models/user')).default
    return User.find(id)
  },

  canImpersonate: (impersonator, target) => {
    return true
  },

  canBeImpersonated: (target, impersonator) => {
    // e.g. prevent admins from impersonating other admins
    return !target.isAdmin
  },
})
```

| Option              | Description                                                                                   | Default              |
| -------------------| ----------------------------------------------------------------------------------------------| ----------------------|
| `guard`             | The auth guard used to read/switch the logged-in user                                         | `'web'`               |
| `sessionKey`        | Session key used to store the impersonator's original id                                      | `'impersonator_id'`   |
| `redirectTo`        | Redirect target after starting an impersonation                                                | `'/'`                 |
| `redirectBack`      | Redirect target after leaving an impersonation                                                 | `'/'`                 |
| `findUserById`      | Resolves a user by id (used for the target lookup and to restore the impersonator)             | required              |
| `canImpersonate`    | `(impersonator, target) => boolean \| Promise<boolean>` — return `false` to block              | always allow          |
| `canBeImpersonated` | `(target, impersonator) => boolean \| Promise<boolean>` — return `false` to block              | always allow          |

Self-impersonation (`fromUser.id === toUser.id`) is always blocked, regardless of the hooks above.

### 2. Register routes

`adonis-impersonate` ships a controller instead of auto-writing routes, since route files are too app-specific to safely rewrite. Add this to `start/routes.ts`:

```ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import ImpersonateController from 'adonis-impersonate/controllers/impersonate_controller'

router
  .post('/impersonate/:id', [ImpersonateController, 'take'])
  .use([middleware.auth(), middleware.impersonate()])

router
  .post('/impersonate/leave', [ImpersonateController, 'leave'])
  .use([middleware.auth(), middleware.impersonate()])
```

The `impersonate` named middleware (registered automatically by `node ace configure`) attaches `ctx.impersonate` to the request. `middleware.auth()` protects the routes — only logged-in users can start/stop an impersonation.

## Usage

### From a controller

```ts
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminUsersController {
  async impersonate({ auth, params, impersonate, response }: HttpContext) {
    const target = await impersonate.resolveUser(params.id)
    if (!target) return response.notFound()

    await impersonate.impersonate(auth.user!, target)

    return response.redirect('/')
  }
}
```

### The service API

`ctx.impersonate` (an `ImpersonateService`) exposes:

```ts
// Start impersonating "toUser" on behalf of "fromUser"
await impersonate.impersonate(fromUser, toUser)

// Stop impersonating and switch back to the original user
const originalUser = await impersonate.leaveImpersonation()

// Whether the current session is impersonating someone
impersonate.isImpersonating() // boolean

// The original impersonator (or null)
await impersonate.getImpersonator()

// The impersonator's id straight from the session (or null)
impersonate.getImpersonatorId()

// Resolve a user by id via the configured `findUserById`
await impersonate.resolveUser(id)
```

### In Edge templates

Since `ctx.impersonate` is only available where the `impersonate` middleware runs, share it explicitly from a controller or a global middleware if you want it in views, e.g.:

```ts
view.share({ isImpersonating: impersonate.isImpersonating() })
```

```edge
@if(isImpersonating)
  <form action="/impersonate/leave" method="POST">
    {{ csrfField() }}
    <button type="submit">Stop impersonating</button>
  </form>
@end
```

## Events

Two events are emitted so your app can plug in its own audit logging — nothing is logged to a fixed destination by this package:

- `impersonate:started` — `{ impersonatorId, impersonatedId, happenedAt }`
- `impersonate:left` — `{ impersonatorId, impersonatedId, happenedAt }`

```ts
// start/events.ts (or any provider's boot method)
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

emitter.on('impersonate:started', (payload) => {
  logger.info(payload, 'User impersonation started')
})

emitter.on('impersonate:left', (payload) => {
  logger.info(payload, 'User impersonation ended')
})
```

## Errors

`impersonate()` and `leaveImpersonation()` throw typed exceptions (all extend `@adonisjs/core/exceptions`'s `Exception`, so AdonisJS's default exception handler renders them with the right HTTP status automatically):

| Exception                          | Status | Code                            | When                                                   |
| ----------------------------------- | ------ | -------------------------------- | ------------------------------------------------------- |
| `CannotImpersonateSelfException`    | 403    | `E_CANNOT_IMPERSONATE_SELF`      | Trying to impersonate yourself                          |
| `ImpersonationNotAllowedException`  | 403    | `E_IMPERSONATION_NOT_ALLOWED`    | `canImpersonate`/`canBeImpersonated` returned `false`    |
| `NotImpersonatingException`         | 400    | `E_NOT_IMPERSONATING`            | Calling `leaveImpersonation()` while not impersonating   |
| `ImpersonatorNotFoundException`     | 400    | `E_IMPERSONATOR_NOT_FOUND`       | The original impersonator can no longer be resolved      |

They're all importable from `adonis-impersonate`:

```ts
import { errors } from 'adonis-impersonate'

if (error instanceof errors.CannotImpersonateSelfException) {
  // ...
}
```

## How it works

- Starting an impersonation stores the impersonator's id in the session (`session.put(sessionKey, impersonator.id)`) and logs the target in via `auth.use(guard).login(toUser)` — the same session-switching mechanism `@adonisjs/auth`'s session guard uses for a normal login.
- Leaving an impersonation reads the impersonator id back out of the session, resolves that user via `findUserById`, logs them back in the same way, and clears the session key.
- No user object is ever serialized into the session — only the id — so the session stays small and always reflects a fresh copy of the impersonator record.

## Testing

```bash
npm test
```

## License

MIT
