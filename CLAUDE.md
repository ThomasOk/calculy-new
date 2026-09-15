This is a pnpm monorepo.

## Structure

```text
apps/
  mobile/        Expo / React Native app — see apps/mobile/claude.md for app-specific rules
packages/
  domain/        Pure, shareable business rules (empty scaffold for now)
  supabase/      Typed Supabase client + generated database types
supabase/
  migrations/    Versioned SQL migrations (Supabase CLI project)
```

## Working in this repo

- App-specific conventions (routing, styling, forms, state, storage) live in `apps/mobile/claude.md` — read it before working inside `apps/mobile/`.
- Run `pnpm install` once at the repo root; it installs every workspace package.
- Cross-cutting checks (`pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm check`) run from the root and fan out to every package that defines the matching script.
- Expo/EAS-specific commands (`prebuild`, `build:*`, env-specific `start:*`) must be run from `apps/mobile` (or via `pnpm --filter @calculy/mobile <script>` from the root).
- Supabase migrations live in `supabase/migrations`. After linking the project (`supabase link`), regenerate `packages/supabase/src/database.types.ts` with `supabase gen types typescript --linked`.
