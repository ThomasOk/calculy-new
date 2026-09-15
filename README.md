<h1 align="center">
  <img alt="logo" src="./apps/mobile/assets/icon.png" width="124px" style="border-radius:10px"/><br/>
Calculy </h1>

## Structure

```text
apps/
  mobile/        Expo / React Native app
packages/
  domain/        Pure, shareable business rules
  supabase/      Typed Supabase client + generated database types
supabase/
  migrations/    Versioned SQL migrations
```

## Getting started

Prerequisites: Node.js, pnpm, and the native tooling required by Expo (see [React Native environment setup](https://reactnative.dev/docs/environment-setup)).

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev
```

To run a development build:

```bash
pnpm ios
pnpm android
```

App-specific Expo and EAS commands (`prebuild`, `build:*`, `start:preview`, ...) must be run from `apps/mobile`.

## Checks

```bash
pnpm check
```

## Supabase

Migration files live in `supabase/migrations`. Once the Supabase project is linked (`supabase link`), regenerate the types in `packages/supabase/src/database.types.ts` with `supabase gen types typescript --linked`.

## Documentation

See `apps/mobile/README-project.md` for the mobile app's own documentation (rules and conventions, project structure, environment vars, UI/theming, forms, data fetching).
