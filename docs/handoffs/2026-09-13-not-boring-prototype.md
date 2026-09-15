# Handoff — Calculy · Direction « Not Boring » (sessions du 2026-09-13)

> Dossier des handoffs : `docs/handoffs/` (un fichier par session, préfixé par la date ; convention et index dans `README.md`).
> Projet : `/Users/thomas/Documents/dev/calculy_new` — stack et conventions dans `CLAUDE.md`.
> **Mis à jour en fin de journée** : variante I retenue, sons du défi, effets de série de bonnes réponses.
> **Puis, dernière session** : clavier réécrit pour les appuis rapides à plusieurs doigts, son de la touche
> effacer (§6).

## 1. Objectif de la session suivante

1. **Tester sur un vrai téléphone, en version release**, les effets de série (arpège, traits de vitesse, lueur),
   puis régler les constantes (§5.4). Vérifier au passage le clavier et le son de la touche effacer (§6).
2. Trancher les questions ouvertes (§8).
3. Ensuite, **mettre le prototype de côté et réécrire la variante I proprement** (skills `prototype` et `tdd`).

## 2. Où on en est

- **Branche** : `chore/bootstrap-obytes-starter`. **Rien n'est commité** depuis le bootstrap : tout le travail
  du défi est en fichiers non suivis ou modifiés (`git status`).
- **Vérifications** (fin de la dernière session) :
  - `pnpm type-check` OK.
  - `pnpm test` : 73/73, 9 suites (dont un test du hook dans `use-challenge.test.ts`, nouveau).
  - `pnpm lint` **échoue**, mais pas à cause du code de l'app : ~375 erreurs dans `.agents/skills/` (skills
    installés, non suivis) et dans `uniwind-types.d.ts` (généré). Le code de `src/` et `scripts/` passe, à part
    2 avertissements fast-refresh sans conséquence dans `src/components/prototype-switcher.tsx`. À régler en
    excluant ces chemins de la config ESLint. Pas relancé en entier dans la dernière session : les fichiers
    modifiés passent.
- **Vu sur l'Android de l'utilisateur** : le nouveau clavier (« c'est mieux ») et le son de la touche effacer.
  Les effets de série (arpège, traits, lueur) n'ont pas encore été commentés.

## 3. Direction de design (ce que l'utilisateur a validé)

S'inspirer de Not Boring Calculator : très grands chiffres en relief 3D, police grotesque très condensée
(League Gothic), fond sombre, accents orange, lumière qui suit l'inclinaison du téléphone, sons tactiles.

Déroulé des décisions :
1. **Faisabilité** : Skia (fausse 3D par empilement du contour des chiffres) plutôt que three.js.
   Reanimated 4 sur le thread UI, capteur de gravité pour l'inclinaison.
2. **B et C** (un seul très grand nombre) : l'utilisateur préfère le design Not Boring à l'actuel « Aqua ».
3. **Contrainte** : garder la vue sur plusieurs calculs (précédent, actuel, suivant), comme le carrousel Aqua.
4. **D (rouleau) et E (bande)** : construites ; D perdait la réponse en très grand.
5. **F à I** : construites ensuite (voir le commentaire en tête de `challenge-screen.tsx`).
6. **Variante I (« Arc ») retenue.** Le calcul actuel est au sommet d'une roue, penché avec elle ; le
   précédent (avec sa réponse en vert ou rouge) descend à gauche, le suivant monte à droite. La roue tourne
   d'un cran par réponse (220 ms). La réponse tapée s'affiche en dessous, en très grand relief, et clignote en
   vert ou en rouge.

Principes de mouvement retenus (skill `animate-expo`) :
- **À chaque touche** : moins de 150 ms, ease-out, pas de rebond.
- **À chaque réponse** : environ 200 à 220 ms, interruptible.
- **Moments rares** (décompte, paliers de série, score) : c'est là que va le spectaculaire.
- **Rien ne retient le doigt** : les effets passent par-dessus le clavier sans bloquer les touches.
- **Réduire les animations** : on garde les couleurs et les fondus, on supprime les déplacements, la secousse,
  le parallaxe et les traits de vitesse.
- Le ressenti se juge **en release sur un vrai téléphone**, pas dans le simulateur.

## 4. Sons du défi

Tous en **mi majeur**, sur les lames d'une boîte à musique, pour que les sons s'enchaînent sans se heurter.
Seule exception : la touche effacer, un souffle sans note.
Générés en WAV par `pnpm sounds:challenge` (`scripts/generate-challenge-sounds.mjs`), joués par `expo-audio`.

| Moment | Son | Fichiers | Hook |
| --- | --- | --- | --- |
| Bonne réponse | quinte mi6 → si6 | `correct-music-box.wav` | `use-answer-sounds.ts` |
| Mauvaise réponse | lame freinée la5 → mi5 | `wrong-muted-tine.wav` | `use-answer-sounds.ts` |
| Décompte 3, 2, 1, go | mi5, sol♯5, si5, puis mi6 | `countdown-*.wav` | `use-countdown-sounds.ts` |
| Résultats | accord de mi brossé sur 5 lames | `results-chord.wav` | `use-results-sound.ts` |
| Série (§5) | arpège de 3 lames, un cran plus haut par palier | `streak-1.wav` à `streak-5.wav` | `use-answer-sounds.ts` |
| Touche effacer (§6.2) | souffle de gomme qui descend, 3,2 → 1,1 kHz | `key-erase.wav` | `use-key-sounds.ts` |

Bancs d'écoute (artifacts, chacun avec le détail des propositions écartées) :
- Réponses : [Banc d'écoute Calculy](https://claude.ai/code/artifact/259f72a1-8806-478a-8d38-bfb51a7237a7)
- Décompte : [Banc du décompte](https://claude.ai/code/artifact/251ffa32-75f1-4b08-947f-722618bdb38c)
- Fin de partie : [Banc de fin de partie](https://claude.ai/code/artifact/806f466c-a9e0-4926-b854-dd20dc229126)
- Séries : [Banc des séries](https://claude.ai/code/artifact/3decab1e-d21c-4c6a-83da-a51080d1cb03)
- Clavier : [Banc des clics](https://claude.ai/code/artifact/2551634e-9c9f-4062-ab6f-78ab44909603)

## 5. Série de bonnes réponses (avant-dernière session)

### 5.1 Décisions de l'utilisateur

- **Paliers par défi**, dans `challenges.ts` (`streakMilestones`) :
  - Calculy 20 : **4, 10, 15** bonnes réponses d'affilée.
  - Calculy 30 : **4, 10, 15, 20, 25**.
  La série commence au 1er palier et dure jusqu'à la prochaine faute. La règle est dans `streak.ts`
  (`streakStatus`), testée dans `streak.test.ts`.
- **Son « Arpège qui monte »** : dès le 1er palier, **chaque** bonne réponse joue un arpège de 3 lames à la
  place de la quinte. Il monte d'**une note de l'accord à chaque palier** et garde sa hauteur jusqu'au suivant :
  - 4e : sol♯6 · si6 · mi7 — 10e : si6 · mi7 · sol♯7 — 15e : mi7 · sol♯7 · si7
  - Calculy 30 seulement : 20e : sol♯7 · si7 · mi8 — 25e : si7 · mi8 · sol♯8
- **Traits de vitesse**, **seulement aux paliers** (pas à chaque réponse de la série) : des traits fins et
  pointus visent le grand nombre depuis les bords de l'écran, en plein écran, clavier compris. Trois images
  de 60 ms, puis un fondu : 300 ms en tout. Plus de traits à chaque palier suivant.
- **Lueur « Éclair puis veilleuse »** derrière le grand nombre :
  - la veilleuse s'allume au 1er palier et **monte d'un cran à chaque palier suivant** ; entre deux paliers,
    rien ne bouge ;
  - un éclair part à chaque palier, avec les traits ;
  - **la faute l'éteint en 120 ms**, en même temps que le rouge ;
  - elle est dans la couleur d'accent du thème (orange pour le blanc, violet pour le chrome).
- **Écartés** (voir le banc des séries) : fond orange plein (le vert de la bonne réponse ne s'y lit plus),
  fond qui chauffe en braise, lueur qui respire (attire l'œil pendant le calcul), réponse en or, étincelles
  (pas assez fortes), éclat et couronne. Le relief qui monte, le compteur ×3, l'onde et la roue allumée restent
  dans le banc mais n'ont pas été retenus pour l'instant.

### 5.2 Où c'est dans le code

- `src/features/challenge/streak.ts` : `streakStatus(streak, milestones)` → `inStreak`, `atMilestone`, `level`
  (nombre de paliers atteints). **Vrai code, pas prototype.**
- `src/features/challenge/challenges.ts` : `streakMilestones` par défi, transmis par `challenge-screen.tsx`.
- `src/features/challenge/use-answer-sounds.ts` : `playAnswerSound(isCorrect, streakLevel)` ; au-delà du 5e
  palier, le dernier son reste. L'écran Aqua appelle `playAnswerSound(isCorrect)` et garde la quinte.
- `prototype-not-boring/use-streak-effects.ts` : à chaque réponse, calcule le statut et pilote la lueur et
  les traits ; remis à zéro par « Restart ».
- `prototype-not-boring/streak-rays.tsx` : les traits (Canvas Skia en plein écran, `pointerEvents="none"`).
- `prototype-not-boring/streak-glow.tsx` : la lueur (deux dégradés radiaux Skia, dessinés derrière tout).
- `prototype-not-boring/not-boring-challenge.tsx` : branchement. `useNumberBox` mesure la boîte du grand nombre
  (`measureLayout` par rapport à la racine) pour centrer traits et lueur.
- Les effets s'appliquent à **toutes les variantes Not Boring (B à I)**, pas seulement I.

### 5.3 Comportements à connaître

- Si la partie se termine en pleine série, **la veilleuse reste allumée derrière le score** jusqu'à
  « Restart » (question ouverte, §8).
- La vibration de série plus forte (impact Heavy aux paliers) a été proposée mais **n'est pas faite**.

### 5.4 Réglages

- Traits : `streak-rays.tsx` — `NUMBER_RADIUS` (où les traits s'arrêtent autour des chiffres : **estimé, à
  vérifier sur le téléphone**), `BASE_COUNT`, `COUNT_STEP`, `GAP`, `SPREAD`, `MIN_WIDTH`, `WIDTH_SPREAD`,
  `FRAME_MS`, `FADE_MS`.
- Lueur : `streak-glow.tsx` — `RADIUS`, `REST_MIN`/`REST_SPAN`, `SCALE_MIN`/`SCALE_SPAN`, `FLASH_MIN`/`FLASH_SPAN`,
  `STEP_MS`, `OUT_MS`.
- Notes de l'arpège : entrée `streak-*.wav` de `generate-challenge-sounds.mjs`, puis `pnpm sounds:challenge`.

## 6. Clavier et sons du clavier (dernière session)

### 6.1 Appuis rapides perdus : corrigé, validé sur l'Android (« c'est mieux »)

- **Symptôme** : sur l'Android, en tapant vite « 22 = », seul le premier « 2 » comptait.
- **Cause** : les touches étaient des `Pressable`, qui passent par le système de toucher de React Native, un seul
  geste à la fois. Un doigt posé pendant qu'un autre est encore appuyé rejoint le geste du premier. Sur Android, il
  est même attribué à la touche du premier doigt (`JSTouchDispatcher.kt`, `ACTION_POINTER_DOWN`).
- **Correction** (`not-boring-challenge.tsx`, `FlatKey` et `useKeyGesture`) :
  - un geste `Gesture.Manual()` de `react-native-gesture-handler` par touche : chaque touche suit ses propres doigts ;
  - une touche compte **dès que le doigt se pose**, une fois par doigt, « = » compris. On ne peut plus annuler un
    appui en glissant hors de la touche ;
  - l'enfoncement s'affiche sur le thread UI (valeur partagée), puis la touche revient en 150 ms ;
  - avec un lecteur d'écran, le double appui passe par l'action d'accessibilité `activate` ;
  - le « = » grisé reste appuyable (`dimmed`), car la saisie peut ne pas être encore affichée. S'il n'y a rien à
    valider, l'appui ne fait rien.
- **`useChallenge`** : les touches arrivent du thread UI (`scheduleOnRN`), en dehors des événements React, donc
  plusieurs appuis peuvent précéder un rendu. L'état après chaque action est gardé dans une ref (`latest`), et
  `confirm()` lit cet état puis renvoie `{ value, correct }` (ou `null`), d'où vient le flash vert ou rouge. Test :
  « confirms every digit typed so far » dans `use-challenge.test.ts`. **Vrai code, à garder.**
- **Le clavier Aqua** (`components/keypad.tsx`) a toujours l'ancien problème : il utilise encore `Pressable`.

### 6.2 Sons du clavier

- Banc : [Banc des clics](https://claude.ai/code/artifact/2551634e-9c9f-4062-ab6f-78ab44909603). On y trouve 5 familles
  de clics pour les chiffres, 5 sons pour effacer, un téléphone jouable, et un réglage « Haut-parleur : Téléphone »
  qui coupe les graves sous 700 Hz.
- **Décision finale : un son sur la touche effacer seulement** (« Gomme », `key-erase.wav`, joué par
  `use-key-sounds.ts` et branché par `useSoundedErase`). **Pas de son sur les chiffres**, ni sur « = », puisque la
  réponse a déjà le sien.
- **Le Feutre, pour les chiffres, a été essayé puis retiré** :
  1. inaudible sur l'Android : tout son son était sous 950 Hz, et un haut-parleur de téléphone ne joue presque pas
     ces graves (−12 à −23 dB mesurés). Le simulateur iOS passe par les haut-parleurs du Mac, ce qui masquait le
     problème ;
  2. remonté vers 1 à 1,5 kHz et au plafond de −1 dB : audible, mais encore faible à côté des autres sons ;
  3. retiré, car l'utilisateur avait l'impression qu'il faisait « buguer » l'app. Piste non vérifiée : le
     `seekTo(0)` puis `play()` d'`expo-audio` à chaque chiffre.
- **Générateur** (`generate-challenge-sounds.mjs`) :
  - les sons du clavier (`KEY_LEVELS`) sont réglés sur leur niveau **à travers un haut-parleur de téléphone**
    (`phoneLevel` : les 30 premières ms, après deux passe-haut à 700 Hz), et non sur leur pic. La Gomme est à
    −14 dB sous la bonne réponse ;
  - un son dont le pic dépasserait −1 dB est plafonné, avec un avertissement ;
  - chaque ligne de sortie affiche aussi « on a phone … dB ». Un son très en dessous des autres sur cette mesure ne
    s'entendra pas sur un téléphone ;
  - nouveau aussi : le bruit peut commencer plus loin (`offset`) et sa fréquence peut balayer (`to`, `time`).
- **Si on veut un jour un son sur les chiffres** : passer plutôt par `react-native-audio-api` (latence faible, sons
  joués sans un lecteur par fichier) que par `expo-audio`. C'est une dépendance native, donc une nouvelle build.

## 7. Le prototype (jetable, marqué `PROTOTYPE`)

Branché sur le vrai écran du défi, sélectionné par `?variant=` et par une **pastille rose** en bas (masquée
en production). Toutes les variantes jouent la même partie (même logique, mêmes sons et vibrations).
Variantes : A Aqua (actuel), B Blanc, C Chrome, D Rouleau, E Bande, F Pile, G Ligne, H Cartes, **I Arc**.

**Pour lancer** : `pnpm ios` ou `pnpm android`, puis ouvrir un défi et choisir I avec la pastille rose. Skia est
déjà dans la build de l'utilisateur, donc un rechargement Metro suffit en général. **Après l'ajout de nouveaux
`.wav`, relancer `pnpm start`** si Metro ne les trouve pas.

**Fichiers** (lire les commentaires en tête de chacun plutôt que ce résumé) :
- `src/features/challenge/challenge-screen.tsx` : liste des variantes et choix de celle à afficher.
- `src/components/prototype-switcher.tsx` : la pastille rose.
- `src/features/challenge/prototype-not-boring/`
  - `not-boring-challenge.tsx` : le plateau (en-tête, zone centrale selon `layout`, clavier plat à gestes natifs
    (§6.1), résultats, compte à rebours dans le grand nombre, effets de série).
  - `relief.ts` : le moteur de relief (32 couches, ombre, face éclairée, peintures par thème).
  - `use-glyph-slots.ts` : les chiffres qui tombent et glissent, sur le thread UI.
  - `extruded-number.tsx` : le très grand nombre.
  - `problem-rows.ts` : les lignes de calcul en tracés Skia, `useRoll`, `useRowShake`.
  - `problem-queue.tsx` : F (`pile`), G (`line`) et **I (`arc`)**. Réglages de l'arc : `ARC_DROP`, `ARC_EDGE`,
    `ARC_FADE_END`, `SIDE`, `TURN_MS`.
  - `problem-roll.tsx` (D), `problem-band.tsx` (E), `problem-cards.tsx` (H).
  - `streak-rays.tsx`, `streak-glow.tsx`, `use-streak-effects.ts` : effets de série (§5).
  - `skins.ts` : thèmes `white` et `chrome`. `use-tilt.ts` : capteur de gravité et glissé du doigt.
- `src/features/challenge/use-key-sounds.ts` : son de la touche effacer (vrai code, comme `use-answer-sounds.ts`).
- **Dépendances ajoutées** : `@shopify/react-native-skia` 2.2.12 et `@expo-google-fonts/league-gothic`.

## 8. Suite suggérée

1. **Tester sur téléphone (release)** une partie de Calculy 20 puis de Calculy 30 :
   - les traits partent-ils juste au bord des chiffres (`NUMBER_RADIUS`) ?
   - la lueur est-elle assez visible au 1er palier, et pas trop forte au dernier ?
   - les deux derniers crans de l'arpège de Calculy 30 (jusqu'au sol♯8) sont-ils trop aigus sur le haut-parleur ?
     Sinon, plafonner au 3e cran et laisser traits et lueur marquer les paliers 20 et 25.
2. **Vibration aux paliers** (proposée, pas faite).
3. **Exclure `.agents/` et `uniwind-types.d.ts` de ESLint** pour que `pnpm lint` repasse.
4. **Intégrer la variante I proprement**, en suivant le skill `prototype` :
   - mettre tout le prototype de côté sur une branche dédiée et noter le verdict (I, et pourquoi) ;
   - réécrire I dans le vrai code, avec des tests et sans le code jetable. Garder `streak.ts`, `useChallenge` et
     `use-key-sounds.ts` tels quels, et reprendre le clavier à gestes natifs du §6.1 ;
   - supprimer la pastille et les variantes perdantes. Si Aqua reste, lui appliquer la correction du clavier (§6.1).
5. **Au-delà du défi** : l'écran d'accueil et le panneau d'intro sont encore en Aqua ; l'écran de résultats
   Not Boring est minimal ; envisager de retirer M PLUS Rounded (3,5 Mo, déclarée dans `app.config.ts`).
6. **À vérifier** : le sens de l'inclinaison sur un vrai téléphone (signes dans `use-tilt.ts`), et les
   performances sur l'Android le plus lent visé, surtout pendant la rotation de l'arc et les traits.

**Questions ouvertes pour l'utilisateur** :
- La veilleuse reste-t-elle derrière le score quand la partie finit en série, ou s'éteint-elle aux résultats ?
- Plafonner l'arpège de Calculy 30 au 3e cran ?
- Thème blanc ou chrome (ou les deux, au choix) ? Garde-t-on Aqua quelque part ?
- Un son sur les chiffres, plus tard ? Si oui, passer par `react-native-audio-api` (§6.2).

## 9. Pièges déjà rencontrés

- **Ordre des worklets** : une fonction `'worklet'` au niveau du module capture les fonctions qu'elle
  appelle *au moment où sa définition s'exécute*. **Toujours définir les fonctions appelées avant celle qui les
  appelle** (erreur `drawInput is not a function` de D, voir `problem-roll.tsx`).
- **Skia n'a pas de police de repli** : League Gothic contient bien `−` (U+2212) et `×` (vérifié).
- **Lint du projet** : 3 paramètres maximum par fonction (y compris les callbacks : celui de `measureLayout`
  en a 4, d'où le `...frame` dans `useNumberBox`), 110 lignes maximum par fonction.
- **Volume des sons** : le générateur règle le son le plus fort à -1 dB et applique **le même gain à tous**
  (sauf `results-chord.wav`, et les sons du clavier, réglés à part sur leur niveau au téléphone : §6.2). Un
  nouveau son plus fort baisserait donc tous les autres : mesurer les pics
  après chaque ajout. Avant ce handoff, rien n'a bougé (bonne réponse à -1,29 dB, série entre -1,45 et -2,62 dB).
- **`pnpm expo install`** a affiché « -125 packages » : ce n'était que du ménage dans `node_modules`.
- **Transitions CSS de Reanimated** : hors de `StyleSheet.create` (limite des types RN), et `cubicBezier()`
  passe par un cast (voir `challenge-countdown.tsx`).
- **Plusieurs doigts** : `Pressable` ne gère qu'un geste à la fois. Pour un clavier, il faut un geste
  `react-native-gesture-handler` par touche (§6.1).
- **Actions venues du thread UI** (`scheduleOnRN`) : rien ne garantit un rendu entre deux appuis. Ne pas lire
  l'état du dernier rendu dans le callback d'une touche (voir la ref `latest` de `useChallenge`).
- **Graves et haut-parleur de téléphone** : sous 500 à 800 Hz, presque rien ne sort. Regarder « on a phone » dans
  la sortie du générateur, et ne jamais juger un volume dans le simulateur iOS, qui passe par les haut-parleurs du
  Mac.
- **`.wav` remplacé sous le même nom** : Metro peut garder l'ancien. Relancer avec `pnpm start --clear`.

## 10. Skills à invoquer

- `animate-expo` : animation, geste, vibration (timings, thread UI, réduction des animations).
- `prototype` : pour mettre le prototype de côté et intégrer la variante I (§8.4).
- `run` : pour lancer l'app et voir une variante.
- `tdd` : pour réécrire la variante I dans le vrai code avec des tests.
- `design-foundations` et `typography` : hiérarchie, contraste des gris sur fond noir, échelle de texte.
- `code-review` ou `ui-review` : avant de fusionner l'intégration.
- `diagnosing-bugs` : pour un bug vu sur le téléphone. Mesurer avant de corriger, comme pour le Feutre (§6.2).
