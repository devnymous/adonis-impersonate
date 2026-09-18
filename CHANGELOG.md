# Changelog

## 1.0.1

### Fixed

- `config/impersonate.stub` used backticks inside JSDoc comments, which broke Tempura's template renderer and made `node ace configure adonis-impersonate` fail for every user with `SyntaxError: Unexpected token 'false'`.
- `ImpersonatableUser`'s index signature (`[key: string]: unknown`) prevented real Lucid models from structurally satisfying the type, breaking typechecking in consuming apps.

## 1.0.0

Initial release.
