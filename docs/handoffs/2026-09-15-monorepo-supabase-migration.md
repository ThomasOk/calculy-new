# Handoff — Calculy · Restructuration en monorepo pnpm + backend Supabase (session du 2026-09-15)

> Dossier des handoffs : `docs/handoffs/` (un fichier par session, préfixé par la date ; convention et index
> dans `README.md`). Ne pas confondre avec l'autre handoff du même jour,
> [2026-09-15 — Refonte de l'accueil façon menu Persona](2026-09-15-home-screen-persona.md), qui traite d'un
> sujet totalement différent (design de l'écran d'accueil) en parallèle.
> Projet : `/Users/thomas/Documents/dev/calculy_new` — stack et conventions dans `CLAUDE.md` (racine, vue
> monorepo) et `apps/mobile/claude.md` (détails de l'app Expo, inchangé depuis avant cette session).
> PR de cette session, **déjà mergée dans `main`** : [#1 — Restructure into pnpm monorepo with Supabase
> backend](https://github.com/ThomasOk/calculy-new/pull/1) (3 commits, détail au §7).
> **Tout est commité et poussé.** `git status` propre, `main` local = `origin/main`.

## 1. Contexte et demande initiale

L'utilisateur a expliqué que `calculy_new` est en réalité la nouvelle version d'un projet déjà publié sur les
stores, `/Users/thomas/Documents/dev/calculy` (bundle `gg.calculy.app`, même projet Supabase). Il voulait :

1. Restructurer `calculy_new` en monorepo pnpm sur le modèle d'un autre projet à lui,
   `/Users/thomas/Documents/dev/molio` (voir sa structure `apps/mobile` + `packages/domain` +
   `packages/supabase` + `supabase/`).
2. Brancher Supabase comme backend.
3. Aligner l'identité de l'app (bundle id, projet EAS, etc.) sur l'ancien projet publié, puisque
   `calculy_new` en est la suite.
4. Récupérer la config Google/Apple Sign-In de l'ancien projet (sans forcément porter tout le code d'auth
   tout de suite).

## 2. Ce qui a été implémenté

### 2.1 Structure monorepo

- `apps/mobile/` : toute l'app Expo, déplacée depuis la racine avec `git mv` (historique préservé),
  `package.json` renommé `@calculy/mobile`.
- `packages/domain/` : scaffold **vide** (`package.json`, `tsconfig.json`, `src/index.ts` avec juste
  `export {};`) — décision explicite de l'utilisateur de ne pas migrer `src/features/challenge/{streak,
  problems,challenges}.ts` tout de suite (voir §8).
- `packages/supabase/` (`@calculy/supabase`) : `createSupabaseClient()` typé, copié du pattern de `molio`
  (`packages/supabase/src/client.ts`), plus `database.types.ts`.
- `supabase/` (projet CLI) : scaffoldé par `supabase init`, puis **lié par l'utilisateur lui-même** en
  interactif (`supabase login` / `supabase link` — je ne peux pas faire ça, ça demande un navigateur).
  `packages/supabase/src/database.types.ts` a été régénéré par l'utilisateur avec le vrai schéma
  (`challenge_attempts`, `profiles`, `feature_flags`, vues leaderboard, etc.) — ce fichier fait foi, ne pas
  le retoucher à la main.
- Racine : `pnpm-workspace.yaml`, `tsconfig.base.json`, nouveau `package.json`/`README.md`/`CLAUDE.md` vue
  monorepo, `.gitignore` réanchoré sur `apps/mobile/...`.
- CI/tooling : 10 workflows/actions GitHub adaptés (chemins `apps/mobile/...`,
  `pnpm --filter @calculy/mobile`), `.vscode/settings.json`. **Ces workflows ont été édités à la main, pas
  vérifiés en conditions réelles sur une vraie exécution CI** (voir §8).

### 2.2 Supabase côté app

- `apps/mobile/env.ts` : ajout de `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`.
- `apps/mobile/src/lib/supabase/client.ts` + `storage-adapter.ts` (MMKV chiffré via SecureStore pour la
  session) — copiés du pattern `molio`, **pas encore utilisés nulle part dans l'app** (l'ancien store d'auth
  factice `use-auth-store.tsx` est toujours en place, voir §8).
- `.env` local (non commité) mis à jour avec les vraies valeurs, récupérées depuis l'ancien projet
  `/Users/thomas/Documents/dev/calculy/.env` (même projet Supabase).

### 2.3 Alignement d'identité avec l'app publiée

Constat en cours de session : `calculy_new` pointait encore vers le compte et le projet EAS du **template
Obytes** de départ (`owner: 'obytes'`, slug `obytesapp`, bundle `com.calculy`, projet EAS
`c3e1075b-...`) — un reliquat jamais corrigé, sans lien avec cette restructuration mais bloquant pour que ce
repo remplace l'app publiée. Corrigé dans `apps/mobile/app.config.ts` et `env.ts` :

| | Avant | Après (= ancien projet publié) |
| --- | --- | --- |
| Bundle ID iOS/Android | `com.calculy(.dev/.preview)` | `gg.calculy.app` (identique tous environnements) |
| Projet EAS | `c3e1075b-...` (template) | `72c9f9f9-982c-4a04-bd75-c656655bc688` |
| Owner Expo | `obytes` (codé en dur, faux) | supprimé — résolu via projectId + compte connecté |
| Slug | `obytesapp` | `calculy` |
| Nom affiché | `calculy` | `Calculy` |
| APP_ID Maestro (local + 3 workflows CI) | `com.obytes.*` | `gg.calculy.app` |

### 2.4 Google/Apple Sign-In — config uniquement

Sur demande explicite de l'utilisateur, **seule la config a été portée, pas le code** (voir §8 pour l'ampleur
de ce qui reste) :

- Dépendances ajoutées à `apps/mobile/package.json` : `@react-native-google-signin/google-signin`,
  `expo-apple-authentication`, `expo-web-browser` (mêmes versions que l'ancien projet).
- `env.ts` + `.env`/`.env.example` : 3 clés `EXPO_PUBLIC_GOOGLE_{WEB,IOS,ANDROID}_CLIENT_ID`, vraies valeurs
  récupérées de l'ancien projet.
- `app.config.ts` : plugins `expo-web-browser`, `expo-apple-authentication`,
  `@react-native-google-signin/google-signin` — `iosUrlScheme` **dérivé** de
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (`GOOGLE_IOS_URL_SCHEME`) plutôt que codé en dur comme dans l'ancien
  projet.
- Credentials copiés (gitignorés, jamais commités, vérifié) : `apps/mobile/@toshou__calculy.jks` (l'utilisateur
  a confirmé que c'est la bonne clé, pas `@toshou__calculy_OLD_1.jks`), `apps/mobile/AuthKey_GB2235DUXH.p8`.
- `apps/mobile/eas.json` : bloc `submit.production` restauré (Apple ID, ASC app ID `6757437894`, team ID
  `3YA8W6BKHJ`, `serviceAccountKeyPath: ./google-service-account.json`) + `cli.version`.
  **`google-service-account.json` lui-même est introuvable** dans l'ancien projet — probablement géré
  ailleurs (secret EAS ?). À placer manuellement dans `apps/mobile/` avant un `eas submit` Android.

### 2.5 Bug trouvé et corrigé : `pnpm ios` cassé par le hoisting pnpm

Après la restructuration, `pnpm ios` échouait avec des `lstat ... No such file or directory` sur les polices
`@expo-google-fonts/*`. Cause : le plugin `expo-font` utilisait des chemins **littéraux**
(`'node_modules/@expo-google-fonts/inter/...'`) dans `app.config.ts`, interprétés relativement au dossier du
projet natif (pas via la résolution de modules Node). Avec `nodeLinker: hoisted`, ces paquets sont hoistés à
la racine du monorepo, pas dans `apps/mobile/node_modules/` — donc le chemin relatif ne pointait plus nulle
part.

**Correctif** : remplacé les 5 chaînes par `require.resolve('@expo-google-fonts/...')` (résolution Node réelle
→ chemin absolu, robuste peu importe la structure de hoisting), extraites en constantes en tête de fichier.
Vérifié par `npx expo prebuild --platform ios --clean` (un prebuild incrémental ne remplaçait pas les
références obsolètes de l'ancien `ios/` généré avant la restructuration — d'où le `--clean`) puis un
`pnpm ios` complet qui a abouti. **Seul iOS a été testé, pas Android** (voir §8).

Ce même risque existe probablement dans `molio` (même pattern de plugin `expo-font`, jamais testé par
l'utilisateur avec un vrai build natif à ma connaissance) — pas corrigé là-bas, hors scope de cette session.

### 2.6 `uniwind-types.d.ts` : bruit git récurrent, résolu

Fichier généré par `uniwind` à chaque build/dev (`// NOTE: ... should not be edited manually`), commité par le
template Obytes (et par `molio`) malgré ça. Deux problèmes empilés, corrigés en deux commits séparés :

1. `eslint --fix` le reformatait (style `interface`/sans point-virgule → `type`/avec point-virgule), donc il
   réapparaissait en « modifié » après chaque build qui le régénérait dans son propre style. → ajouté aux
   `ignores` de `apps/mobile/eslint.config.mjs`.
2. Même avec l'ignore ESLint, le fichier restant **suivi par git**, il continuait à apparaître modifié après
   chaque build. → `git rm --cached`, ajouté à `.gitignore` (comme `expo-env.d.ts`). Il reste généré sur
   disque, juste plus suivi.

### 2.7 `lint-staged` cassé par la restructuration

Le pre-commit hook (`pnpm lint-staged`) échouait avec *"ESLint couldn't find an eslint.config.(js|mjs|cjs)
file"* : la résolution de la config flat d'ESLint se fait **par rapport au `cwd` du process, pas par fichier
linté** (contrairement à ce que j'avais supposé pendant la planification) — et husky/lint-staged tournent
depuis la racine du repo, qui n'a plus de `eslint.config.mjs` depuis le déplacement vers `apps/mobile/`.
Corrigé dans `lint-staged.config.js` (racine) : `--config apps/mobile/eslint.config.mjs` explicite sur les
deux commandes eslint.

## 3. Vérifications effectuées

- `pnpm install` (4 workspaces), `pnpm type-check` (mobile + domain + supabase), `pnpm test` (80/80,
  inchangé), `pnpm lint` / hook pre-commit — tous verts au moment du dernier commit.
- `npx expo config --type public` : confirme que `bundleIdentifier`/`package` = `gg.calculy.app`, que le
  plugin Google résout le bon `iosUrlScheme`, que les chemins de polices sont bien absolus.
- `pnpm ios` : build natif complet réussi après le fix §2.5 (build lancé en arrière-plan, terminé avec succès
  — le process est resté vivant un moment après et a dû être tué manuellement, sans conséquence sur le repo).
- **Non vérifié** : build Android, exécution réelle des workflows CI (édités à la main, jamais lancés).

## 4. État git / PR

Branche `restructure/pnpm-monorepo-supabase`, PR #1, **mergée dans `main`**. Trois commits, dans l'ordre :

1. `944be05` — `refactor: restructure into pnpm monorepo with Supabase backend` (tout le §2.1 à §2.5).
2. `5102e3f` — `fix: stop linting uniwind's generated types file` (§2.6, étape 1).
3. `bf3bb1e` — `fix: stop tracking uniwind's generated types file` (§2.6, étape 2).

Le premier push et la création de la PR ont nécessité l'autorisation explicite de l'utilisateur (le
classificateur du mode auto bloque par défaut les actions git qui publient vers l'extérieur — push, PR).

## 5. Secrets et fichiers sensibles — état

Tous gitignorés, vérifié à chaque étape (`git check-ignore -v`) :

- `apps/mobile/.env` (vraies valeurs Supabase + Google, copiées depuis l'ancien projet).
- `apps/mobile/@toshou__calculy.jks`, `apps/mobile/AuthKey_GB2235DUXH.p8`.
- `apps/mobile/eas.json` contient l'Apple ID et le Team ID en clair (pas un secret à proprement parler, mais
  personnel) — ce fichier **est** commité (comme dans l'ancien projet), ce n'est pas un oubli.

## 6. Fichiers à connaître

- `apps/mobile/app.config.ts` — identité de l'app, plugins Google/Apple/fonts, `GOOGLE_IOS_URL_SCHEME` dérivé.
- `apps/mobile/env.ts` — schéma Zod de toutes les variables d'env, y compris Supabase et Google.
- `apps/mobile/src/lib/supabase/{client,storage-adapter}.ts` — client Supabase prêt, pas encore branché.
- `packages/supabase/src/database.types.ts` — généré par l'utilisateur depuis le vrai projet, ne pas éditer
  à la main, régénérer avec `supabase gen types typescript --linked` si le schéma change.
- `lint-staged.config.js` (racine) et `apps/mobile/eslint.config.mjs` — pourquoi le `--config` explicite existe
  (§2.7).
- `apps/mobile/src/features/auth/` (`login-screen.tsx`, `use-auth-store.tsx`) — l'ancien feature d'auth
  factice (dummyjson), toujours en place, à remplacer quand l'auth réelle sera portée.

## 7. Points ouverts pour la prochaine session

- **Porter le vrai code d'auth Google/Apple**, resté en config seulement (§2.4). Dans l'ancien projet
  (`/Users/thomas/Documents/dev/calculy`) : `src/contexts/auth-context.tsx` (~320 lignes),
  `src/app/auth/{login,signup,complete-profile,confirm,callback}.tsx`,
  `src/features/auth/{screens,components,hooks}/*` (hooks Google/Apple, schemas Zod). Remplacerait le feature
  factice actuel (`login-screen.tsx` + `use-auth-store.tsx`, ~135 lignes). Attention : l'ancien projet utilise
  un contexte React, `calculy_new` un store Zustand pour l'auth — à trancher avec l'utilisateur, pas un copier-
  coller direct.
- `packages/domain` toujours vide — migration de `streak.ts`/`problems.ts`/`challenges.ts` explicitement
  reportée par l'utilisateur (§1), pas oubliée.
- `google-service-account.json` introuvable (§2.4) — à obtenir de l'utilisateur avant tout `eas submit`
  Android.
- `NSUserTrackingUsageDescription` (infoPlist iOS), présent dans l'ancien projet, pas ajouté — lié à l'usage
  réel du tracking, à revoir avec le portage de l'auth.
- Build Android jamais testé après la restructuration (seul iOS l'a été, §2.5) — même classe de bug possible
  côté Gradle si d'autres chemins littéraux existent.
- Workflows CI édités à la main (§2.1), jamais exécutés — à surveiller sur la prochaine PR qui déclenchera la
  CI.

## 8. Skills à invoquer

- `tdd` : pour le portage de l'auth (§7) — code métier neuf, autant le faire test-first plutôt que copier
  l'ancien projet tel quel.
- `codebase-design` : la question du contexte React vs store Zustand pour l'auth (§7) est une vraie décision
  d'architecture, pas un détail — vaut le coup de la poser explicitement avant de coder.
- `diagnosing-bugs` : si un bug du même genre que §2.5 (chemin cassé par le hoisting pnpm) apparaît côté
  Android ou ailleurs.
- `run` : pour lancer et vérifier l'app (iOS **et** Android cette fois) après le prochain gros changement.
