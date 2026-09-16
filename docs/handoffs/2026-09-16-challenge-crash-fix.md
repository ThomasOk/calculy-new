# Handoff — Calculy · Crash de fin de défi (variante Pagaille) et ajustement du clavier (session du 2026-09-16)

> Dossier des handoffs : `docs/handoffs/` (un fichier par session, préfixé par la date ; convention et index dans `README.md`).
> Projet : `/Users/thomas/Documents/dev/calculy_new` — stack et conventions dans `CLAUDE.md`.
> Handoff précédent : [2026-09-15 — Titre et liste de l'accueil façon menu Persona, fenêtre de choix, verdict des
> résultats, sons et haptics](2026-09-15-home-screen-persona.md).
> **Rien n'est commité avant cette session non plus** : tout le travail du défi reste en fichiers modifiés
> (`git status`), cette session comprise.

## 1. Le problème signalé

L'utilisateur a remonté un crash intermittent : à la fin d'un défi, en appuyant sur `=` pour valider le dernier
calcul, l'app freeze puis se ferme. Pas systématique.

## 2. Diagnostic (sans logcat/device log — pas capturé cette session)

Lecture de toute la chaîne du défi (`use-challenge.ts`, `not-boring-challenge.tsx`,
`prototype-not-boring/problem-pagaille.tsx`, `prototype-not-boring/pagaille-results.tsx`, `sound-engine.ts`) a
fait ressortir deux pistes sûres et une piste non confirmée :

1. **Geste du clavier reconstruit sous le doigt (confirmé et corrigé, voir §3.1).** `not-boring-challenge.tsx`
   passe `disabled={isFinished}` au clavier ; `isFinished` bascule dans le même commit React que le dernier
   `confirm()`. `useKeyGesture` avait `disabled` en dépendance de son `useMemo` (`.enabled(!disabled)`) : un
   geste RNGH reconstruit envoie une nouvelle config au handler natif *pendant que le doigt est encore posé*.
   Le `onTouchesUp` n'arrivait jamais sur ce handler-là, `fingers` restait bloqué à 1 — sur le dernier `=`
   précisément, jamais ailleurs. Symptôme annexe (permettant de vérifier sans logcat) : après un « Restart », la
   touche `=` ne répondait plus au premier appui.
2. **Sources audio jamais déconnectées (corrigé par prudence, voir §3.2).** `sound-engine.ts` créait un
   `AudioBufferSourceNode` par son joué, connecté à `destination`, jamais déconnecté ni détaché de son propre
   listener `onEnded`. Une manche joue quelques dizaines de sons ; ça s'accumulait sur le graphe audio.
3. **Piste non retenue, non confirmée : la bascule Stage → PagailleResults.** `RESULTS_DELAY_MS = 600` fait
   démonter le `<Canvas>` Skia du défi et monter dans le même frame celui de `PagailleScore` + un `<Svg>`
   (react-native-svg) + plusieurs animations CSS Reanimated. Profil compatible avec un crash natif Skia
   intermittent, mais non vérifié faute de log de crash. **Pas de correctif appliqué.** Si le crash revient un
   jour, capturer `adb logcat | grep -E "FATAL|SIGSEGV|skia|Reanimated|GestureHandler"` (Android) ou les logs
   d'appareil via Xcode (iOS) pour trancher entre cette piste et une régression du correctif §3.1.

## 3. Correctifs appliqués

### 3.1 `not-boring-challenge.tsx` — `useKeyGesture` ne reconstruit plus le geste

- `disabled` sort du `useMemo` du geste et de `.enabled(...)` : le geste RNGH d'une touche est construit une
  seule fois, jamais reconstruit pendant un appui.
- `disabled` passe désormais par la même ref que `onPress` (`latest.current`), lue dans `press()` qui renvoie
  tôt si `disabled` est vrai — sans risque fonctionnel : le reducer (`use-challenge.ts`) ignore déjà `digit`,
  `erase` et `confirm` une fois la manche finie ; `disabled` n'était qu'un rendu visuel + état d'accessibilité.
- Diff exact : `git diff` sur ce fichier, ou lire le commentaire ajouté à `useKeyGesture` qui explique le bug.

### 3.2 `sound-engine.ts` — les sources audio se déconnectent à la fin

- `source.onEnded` déconnecte la source de `destination` et retire son propre `onEnded` une fois jouée.

### 3.3 `not-boring-challenge.tsx` — clavier remonté

Demande séparée de l'utilisateur (pas un correctif de bug) : plus d'espace sous le clavier de la variante
Pagaille. `FlatKeypad` : `pb-2` → `pb-6` (8 px → 24 px, avant addition du safe-area inset déjà appliqué sur la
racine de l'écran). Testé visuellement par l'utilisateur comme correct. Non répercuté sur le clavier de la
variante A (`components/keypad.tsx`), qui n'est joignable que par lien direct (`?variant=A`).

## 4. Vérifications faites

- `pnpm --filter @calculy/mobile type-check` : OK.
- `pnpm --filter @calculy/mobile lint` : OK.
- `pnpm --filter @calculy/mobile test` : 80 tests passent (10 suites).
- Test manuel utilisateur : plusieurs défis enchaînés sur device réel, plus de freeze/crash observé.
- Pas de test automatisé ajouté pour le bug du geste (RNGH + timing de commit React, difficile à couvrir en
  Jest ; le test manuel enchaînant les manches est le signal retenu).

## 5. État du dépôt

Rien n'est commité. `git status` à la fin de cette session :

```
M apps/mobile/scripts/generate-challenge-sounds.mjs      (hors scope de cette session, déjà modifié avant)
M apps/mobile/src/features/challenge/components/keypad.tsx (hors scope, déjà modifié avant)
M apps/mobile/src/features/challenge/prototype-not-boring/not-boring-challenge.tsx  (§3.1, §3.3)
M apps/mobile/src/features/challenge/sound-engine.ts      (§3.2)
M apps/mobile/src/features/home/sounds/menu-start.wav     (hors scope, déjà modifié avant)
```

Les trois fichiers `keypad.tsx`, `generate-challenge-sounds.mjs` et `menu-start.wav` étaient déjà modifiés
avant cette session (voir `git status` en tête de conversation) — non touchés ici, à clarifier/committer au
prochain passage sur le sujet.

## 6. Suite possible

- Si le crash revient : capturer un vrai log de crash (§2.3) avant de toucher à quoi que ce soit d'autre.
- L'utilisateur a évoqué puis explicitement mis de côté l'idée d'un écran intermédiaire « défi terminé » entre
  la fin du défi et les résultats (bloquant sur un tap). Piste écartée pour l'instant en tant que pansement de
  crash ; pourrait revenir comme sujet de design pur (l'écran est actuellement vide 600 ms après le dernier
  calcul, cf. `Stage` dans `not-boring-challenge.tsx` et `buildRows` dans `problem-pagaille.tsx`).
- Envisagé côté design si le sujet revient : plaque « TERMINÉ » façon Persona (`pagaille-menu.tsx` a déjà
  `stampIn`/`PlateTitle`), non bloquante (un tap saute l'attente plutôt que de la déclencher), et démonter le
  `<Canvas>` du défi un frame avant de monter celui des résultats plutôt que dans le même commit.
- Committer ce travail (et les trois fichiers déjà modifiés avant cette session) reste à faire — rien n'a été
  commité durant cette session ni les précédentes.

## Suggested skills

- `code-review` — avant de committer, une revue courte du diff `not-boring-challenge.tsx` (logique de geste
  RNGH, subtile) serait utile.
- `diagnosing-bugs` — si le crash Skia (§2.3) revient, ce skill structure la capture de logcat/device log avant
  toute nouvelle hypothèse.
- `animate-expo` — si l'écran intermédiaire (§6) est repris, ce skill couvre Reanimated/Gesture Handler/Expo
  pour l'implémentation.
