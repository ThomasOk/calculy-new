# Handoff — Calculy · Variante « Pagaille », sons du défi, décompte/résultats, clavier et accueil (session du 2026-09-14)

> Dossier des handoffs : `docs/handoffs/` (un fichier par session, préfixé par la date ; convention et index dans `README.md`).
> Projet : `/Users/thomas/Documents/dev/calculy_new` — stack et conventions dans `CLAUDE.md`.
> Handoff précédent : [2026-09-13 — Prototype « Not Boring »](2026-09-13-not-boring-prototype.md). Il couvre
> l'ensemble de la direction (variantes A à L, sons, série, clavier à gestes natifs) : pas repris ici, sauf ce
> qui touche directement Pagaille.
> **Mis à jour en fin de journée** : §5 couvre une session séparée, le même jour, sur les **sons du défi**
> (nouvelle direction « Acid jazz »). Elle touche tout le jeu, pas seulement Pagaille : Aqua en hérite aussi.
> **Mis à jour une deuxième fois** : §6 couvre une troisième session, toujours le même jour, sur le **décompte
> et l'écran de résultats de Pagaille**, façon menu Persona (demande explicite de l'utilisateur, en s'appuyant
> sur le skill `animate-expo`).
> **Mis à jour une troisième fois** : §7 couvre une quatrième session, toujours le même jour, sur la
> **disposition du clavier à deux pouces** (`FlatKeypad`, partagé par toutes les variantes B à M, pas seulement
> Pagaille) — plusieurs allers-retours avec l'utilisateur sur la touche ⌫.
> **Mis à jour une quatrième fois** : §8 couvre une cinquième session, toujours le même jour, sur la **barre de
> progression de Pagaille**, qui remplace le « 1/20 » de l'en-tête (demande explicite de l'utilisateur, en
> s'appuyant sur le skill `animate-expo`).
> **Mis à jour une cinquième fois** : §9 couvre une sixième session, toujours le même jour, sur **l'accueil et
> le choix du défi**, remis dans le même style Persona/Pagaille (demande explicite de l'utilisateur) — Pagaille
> (M) devient la variante par défaut du défi et la pastille de prototypage qui permettait de changer de variante
> est retirée. Contient aussi un aller-retour sur le placement des cartes de défi (rejeté par l'utilisateur, revu
> dans la même session) et un réglage de la vitesse d'ouverture de la fenêtre de choix.
> **Objectif de la prochaine session : tester sur un vrai téléphone** — Pagaille (§4.2), les sons (§5.5), le
> décompte/résultats (§6.5), le nouveau clavier (§7.6), la barre de progression (§8.5) et l'accueil (§9.6).

## 1. Où on en est

- **Branche** : `chore/bootstrap-obytes-starter`. Rien n'est commité depuis le bootstrap (`git status` : tout le
  travail du défi, Pagaille compris, est en fichiers non suivis ou modifiés).
- `pnpm type-check` OK. `pnpm eslint` OK sur les fichiers touchés cette session. `pnpm lint` complet non
  relancé : le handoff précédent notait déjà un échec sans rapport (`.agents/`, `uniwind-types.d.ts`), pas
  revérifié.
- Pas de tests ajoutés pour Pagaille : c'est un prototype jetable (`// PROTOTYPE`), comme les variantes B à L.
- Testé seulement dans le simulateur iOS (captures d'écran). **Pas encore testé sur un vrai téléphone.**
- **Sons du défi (§5, session séparée du même jour)** : `pnpm type-check` OK, `pnpm test` 81/81 (4 nouveaux
  tests sur `sound-variants.ts`), `pnpm eslint` OK sur les fichiers touchés. **Sons non écoutés par Claude et
  pas testés sur téléphone** : tout le travail s'est fait à l'oreille de l'utilisateur sur un banc d'écoute
  (artifact), Claude n'entend rien.
- **Décompte et résultats de Pagaille (§6, troisième session du même jour)** : `pnpm type-check` OK, `pnpm test`
  77/77 (aucun nouveau test : toujours un prototype jetable), `pnpm eslint` OK sur les fichiers touchés. Vérifié
  en enregistrant le simulateur iOS et en relisant les images extraites (§6.4) — pas en jouant la main sur
  l'appareil, et pas sur un vrai téléphone. Les sons qui accompagnent ces deux écrans (`use-countdown-sounds.ts`,
  `use-results-sound.ts`, §5) n'ont pas changé cette session ; leur synchronisation avec le nouveau visuel n'est
  que calculée (§6.5), pas entendue.
- **Clavier (§7, quatrième session du même jour)** : `pnpm type-check` OK, `pnpm eslint` OK (0 warning après
  deux `eslint-disable` justifiés en commentaire, voir §7.3), `pnpm test` 77/77 (aucun nouveau test). Vérifié en
  relançant l'app dans le simulateur iOS après chacun des 4 essais et en capturant l'écran en plein jeu — **pas
  de frappe simulée** (demanderait l'accès Accessibilité macOS, pas accordé sans le demander), donc le geste à
  deux pouces n'a été jugé par personne cette session, pas même dans le simulateur.
- **Barre de progression (§8, cinquième session du même jour)** : `pnpm type-check` OK, `pnpm eslint` OK sur les
  fichiers touchés, `pnpm test` 77/77 (aucun nouveau test : prototype jetable). Vérifié en vidéo dans le simulateur
  iOS (route temporaire, supprimée) et par une capture du vrai écran Pagaille en jeu — **pas sur un vrai
  téléphone**.

## 2. Ce qui a été fait cette session

### 2.1 Nouvelle variante M « Pagaille »

Demande de départ : s'inspirer des menus « en pagaille » façon Persona 5 (l'image de référence de
l'utilisateur vient en fait de *Metaphor: ReFantazio*, du même studio) pour la zone où défilent les calculs.

- **Nouveau fichier** : `src/features/challenge/prototype-not-boring/problem-pagaille.tsx` (composant
  `ProblemPagaille`). Toutes les constantes de réglage sont en tête de fichier (`PLACE_*`, `GLYPH_LEAN`,
  `CAPITAL`, `SPLASH_*`, `TAG_*`, `PARALLAX`, `MAX_SCALE`…) — lire le commentaire en tête du fichier avant ce
  résumé.
- **Branchement** : variante `M` dans `challenge-screen.tsx` (`LAYOUTS.M = 'pagaille'`), rendue par
  `not-boring-challenge.tsx` (`StageLayout` étendu, `Calculations` route vers `ProblemPagaille`, `inPlay`
  inclut `'pagaille'`).
- **Nouvelle dépendance** : `@expo-google-fonts/abril-fatface` (chiffres gras à empattements). League Gothic
  reste pour les opérateurs et l'étiquette de combo. Chargée par Skia au lancement : pas besoin de nouvelle
  build, un rechargement Metro suffit.

### 2.2 Le design retenu

- **3 calculs visibles au repos, jamais plus** : le précédent en haut avec sa réponse verte ou rouge, l'actuel
  au milieu en grand, le suivant en dessous. Chacun a sa propre inclinaison, sa taille et son décalage
  (calculés une fois par calcul, pas par place, pour que chacun garde son écart même en changeant de place).
- **Le calcul actuel** : en noir, sur une tache de peinture déchirée dans la couleur d'accent du thème (orange
  pour le thème blanc, violet pour chrome — pas le rouge de Persona, pour que le vert/rouge de la réponse
  garde son sens), avec coulures, éclaboussures et une feuille blanche qui dépasse dessous. La réponse s'écrit
  directement dessus, en blanc avec un contour noir épais et une ombre dure décalée (pas de flou : moins cher
  que l'ombre floutée du relief des autres variantes, voir §3).
- **Étiquette « COMBO ×N »** : plaque noire inclinée façon menu Persona, sous la tache, dès `COMBO_FROM = 2`
  bonnes réponses d'affilée. **Point ouvert important : voir §4.1**, ce compteur est indépendant du système de
  série officiel du jeu.
- **Look « lettres de rançon »** : chaque lettre d'un calcul est un peu penchée et un peu plus ou moins grande
  (`GLYPH_LEAN`, `GLYPH_SIZE`), la première plus grande (`CAPITAL`), mais assez peu pour qu'un nombre se lise
  d'un coup d'œil — c'est une tension explicite notée dans le fichier, **à re-juger en jouant à vitesse
  réelle**.
- **Mouvement** : réutilise le « game feel » déjà construit pour J/K (`answer-hit.ts`) — tampon des chiffres
  tapés, impact de la réponse (pop, étincelles, flash blanc côté juste ; enfoncement et secousse côté faux),
  arrêt bref puis notch ressort d'une place. Pendant le notch, chaque calcul tourne et change de taille pour
  prendre celles de sa nouvelle place : la pile se remélange plutôt que de glisser en bloc.
- **Réduction des animations** : couleurs et flash gardés : le coup de pinceau devient un fondu, plus de
  parallaxe, de tampon ni d'étincelles.

### 2.3 Clavier resserré (concerne toutes les variantes B à M, pas seulement Pagaille)

Demande : le clavier plein écran rend la touche centrale difficile à atteindre en jouant à deux pouces.
`FlatKeypad` dans `not-boring-challenge.tsx` : marge horizontale passée de `px-4` à `px-10` (16pt → 40pt de
chaque côté), donc les colonnes se resserrent vers le centre. **Pas encore testé à deux pouces sur un vrai
téléphone** — si ça ne suffit pas, pousser à `px-12`/`px-14`, ou élargir plutôt le `hitSlop` de la touche
centrale sans toucher au visuel.

### 2.4 Passe de performance sur Pagaille

Question de l'utilisateur : ce rendu Skia est-il gourmand, un vieux téléphone tiendra-t-il le coup ?

- **Le fond du sujet** (pas spécifique à Pagaille, déjà vrai pour toute la direction Not Boring) : le Canvas
  se redessine à chaque frame en continu, à cause du capteur d'inclinaison (`tilt`) lu dans
  `useDerivedValue`. Ce n'est pas une UI qui se repose entre deux appuis. Le plus gros poste, ailleurs dans le
  prototype (pas dans Pagaille), est le relief à 32 couches de `relief.ts` (`LAYERS = 32`, utilisé par le
  grand nombre et par Rouleau/Défilé/Colonne/Vedette) : Pagaille ne l'utilise pas, ses calculs sont plats.
- **Optimisation appliquée à Pagaille** : `drawRow` a déjà un garde-fou (`if (place.alpha < 0.01) return`) qui
  saute entièrement le dessin d'un calcul quasi invisible. Avant cette session, `PLACE_ALPHA` gardait le
  calcul « après le suivant » à une opacité de 0,5 **en permanence**, même au repos — un 4ᵉ calcul
  semi-transparent dessiné à chaque frame pendant toute la partie. Passé à 0 : au repos, exactement 3 calculs
  sont dessinés, les autres sont sautés à coût nul. `BUILT` (2 calculs de marge de chaque côté en mémoire)
  n'a pas été réduit : cette marge est nécessaire pour que le calcul qui entre ou sort continue d'exister le
  temps du fondu (~220 à 400 ms) sans disparaître brutalement au milieu du mouvement — réduire `BUILT` à 1
  aurait donné 3 calculs en permanence mais avec un pop visible à chaque réponse.
- **Non vérifié** : aucun profilage sur un appareil réel. Le handoff précédent notait déjà ce point comme
  ouvert (§8) pour l'arc ; ça reste vrai ici, en pire vu le nombre de calculs empilés.

## 3. Fichiers à connaître

- `src/features/challenge/prototype-not-boring/problem-pagaille.tsx` — la variante elle-même, toutes les
  constantes de réglage en tête.
- `src/features/challenge/prototype-not-boring/not-boring-challenge.tsx` — écran partagé (jeu, clavier,
  sons, capteur d'inclinaison) ; `FlatKeypad` pour le clavier ; `StageLayout` et `Calculations` pour le
  branchement des variantes.
- `src/features/challenge/challenge-screen.tsx` — registre des variantes (`VARIANTS`, `LAYOUTS`), pastille de
  sélection.
- `src/features/challenge/prototype-not-boring/answer-hit.ts` — le « game feel » partagé (hitstop, pop,
  étincelles, timings) : Pagaille en dépend directement.
- `src/features/challenge/prototype-not-boring/skins.ts` — couleurs d'accent par thème, utilisées par la
  tache de peinture.
- `src/features/challenge/streak.ts`, `use-streak-effects.ts`, `streak-glow.tsx`, `streak-rays.tsx` — le
  système de série **officiel**, à paliers configurés par défi (`streakMilestones` : 4/10/15… dans
  `challenges.ts`). Voir §4.1 : il tourne en même temps que l'étiquette combo de Pagaille, sans lien entre
  les deux.

## 4. Points ouverts pour la prochaine session

### 4.1 Deux indicateurs de série en même temps (à trancher)

`StreakGlow` et `StreakRays` (le système officiel, aux paliers 4/10/15 du défi) sont rendus sans condition de
variante dans `not-boring-challenge.tsx` — Pagaille les reçoit donc aussi, en plus de sa propre étiquette
« COMBO ×N » qui démarre dès la 2ᵉ bonne réponse d'affilée, sans rapport avec les paliers du défi. **Ce choix
de `COMBO_FROM = 2` est arbitraire, posé sans validation.** À trancher avec l'utilisateur :
- Garder les deux (le combo comme retour immédiat et léger, la lueur/les traits comme moment fort aux
  paliers) ?
- Aligner le seuil du combo sur le premier palier du défi (4 pour les deux défis actuels) ?
- Retirer l'étiquette combo et laisser la lueur/les traits porter tout le retour de série sur cette variante ?

### 4.2 À tester sur un vrai téléphone (aucun test réel fait cette session)

- Le clavier resserré (§2.3) résout-il vraiment le problème des deux pouces ?
- Les 3 calculs restent-ils lisibles avec les inclinaisons et le style « lettres de rançon » à la vitesse
  réelle de jeu (pas en lisant une capture d'écran) ?
- Tenue en performance sur l'Android le plus lent visé (voir §2.4) — en particulier pendant le remélange de
  la pile après chaque réponse, moment où plusieurs calculs sont dessinés en même temps.
- Sens de l'inclinaison (`use-tilt.ts`), déjà noté comme point ouvert dans le handoff précédent.

### 4.3 Réglages à l'œil, une fois sur téléphone

Tout est en tête de `problem-pagaille.tsx` : `PLACE_Y`/`PLACE_X`/`PLACE_ANGLE`/`PLACE_SIZE` (position et
inclinaison de chaque place), `GLYPH_LEAN`/`GLYPH_SIZE`/`CAPITAL` (l'effet « lettres de rançon »),
`SPLASH_*` (forme de la tache), `TAG_*` (étiquette combo), `MAX_SCALE` (taille maximale du calcul actuel).

## 5. Sons du défi : nouvelle direction « Acid jazz » (session suivante, même jour)

Demande de départ : retravailler les effets sonores du défi (boîte à musique, cf. handoff du 13/09) pour
coller à la nouvelle direction de design, en s'inspirant de deux articles de l'utilisateur sur le son des
interfaces (*the-most-satisfying-checkbox*, *the-sound-of-software* — peu de détails techniques, surtout des
principes : varier chaque son répété en 8-12 variantes, superposer plusieurs sons, opposer les gestes des
actions contraires).

### 5.1 Démarche : un banc d'écoute en artifact, à l'oreille de l'utilisateur

Claude ne peut pas entendre : tout le travail s'est fait via un **artifact HTML jouable**, synthétisant les
sons en Web Audio dans la page (mêmes instruments que le générateur, voir §5.3), avec un tableau
direction × moment et un téléphone Pagaille jouable dessus.
**Lien** : [Pagaille à l'oreille](https://claude.ai/code/artifact/5af90a67-96e7-4b0d-8ab7-ebc0b2d8bab9)
(6 versions publiées, l'historique du raisonnement y est encore lisible).

Aller-retours (résumé, le détail est dans la conversation) :
1. Un premier essai « Acid jazz » (Rhodes FM, cuivres, claquements de doigts, scratch, accords de 4 notes
   serrées) plaisait sur le principe mais sonnait moins agréable que la boîte à musique actuelle.
2. Deux essais « mélodiques » (vibraphone, Rhodes doux, lames + couleurs de jazz) réglaient l'agrément mais
   ressemblaient trop à la boîte à musique : encore des notes frappées qui s'éteignent seules.
3. Quatre instruments soufflés/pincés/tenus (orgue Hammond, guitare jazz en octaves, flûte, trompette en
   sourdine) réglaient la ressemblance, mais **l'utilisateur a confirmé vouloir rester sur l'Acid jazz**
   (celui de l'essai 1) — ces quatre-là ne sont pas retenus, juste explorés.
4. Retour sur l'Acid jazz de l'essai 1, avec seulement son **juste** retravaillé : 5 propositions plus
   mélodiques sur le même Rhodes (Résolution, Arpège, Accord ouvert, Petite phrase, Cadence), toutes avec une
   note d'arrivée stable au lieu d'un accord de 4 notes serrées.
5. **Décision retenue : Acid jazz, avec « Cadence » pour le juste.** Deux notes qui penchent (une petite
   tension), puis l'accord de mi qu'elles résolvent — implémenté dans le vrai code cette session.

### 5.2 Ce qui a été implémenté

- **`scripts/generate-challenge-sounds.mjs`** entièrement réécrit : rend maintenant tout l'Acid jazz retenu
  (Rhodes en FM, cuivres en dents de scie avec filtre passe-bas qui se ferme, claquements de doigts,
  charleston, cymbale, scratch de vinyle, basse). Toujours généré en WAV par `pnpm sounds:challenge`, lu par
  `expo-audio`. Le juste (« Cadence ») a **8 variantes** ; faux, effacer et les paliers de série en ont moins
  (4, 4, 5) pour limiter le nombre de lecteurs audio créés (voir §5.4).
- **`src/features/challenge/sound-variants.ts`** (+ `sound-variants.test.ts`, 4 tests) : nouveau, tire la
  prochaine variante d'un son au hasard **sans jamais rejouer celle d'avant** (`nextVariant`). Générique,
  utilisé par tous les hooks de son ci-dessous.
- **`src/features/challenge/use-sound-bank.ts`** : nouveau, charge un tableau de sources audio dans des
  `AudioPlayer` (`createAudioPlayer`, pas `useAudioPlayer` : plusieurs variantes par son), les libère au
  démontage (`.remove()`), expose `play(index)` et `playNext()` (via `nextVariant`).
- **Hooks de son réécrits** sur `use-sound-bank.ts` : `use-answer-sounds.ts` (juste + faux + **la couche
  d'un palier de série jouée en même temps**, deux fichiers superposés), `use-key-sounds.ts` (effacer, 4
  variantes de scratch), `use-countdown-sounds.ts`, `use-results-sound.ts`. Interface de chaque hook
  inchangée : aucun écran appelant n'a bougé.
- **26 nouveaux fichiers** `src/features/challenge/sounds/jazz-*.wav`. Les anciens (`correct-music-box.wav`,
  `wrong-muted-tine.wav`, `countdown-*.wav`, `results-chord.wav`, `key-erase.wav`, `streak-*.wav`, les deux
  `.mp3`) **ne sont plus référencés par aucun code, mais toujours présents sur le disque** (non suivis par
  git : supprimer serait définitif, laissé au choix de l'utilisateur — pas encore tranché).

### 5.3 Comment le générateur reste fidèle au banc

Le banc synthétise en Web Audio ; le générateur re-synthétise en JS pur (mêmes coefficients de filtre RBJ,
même bruit blanc à graine fixe, même FM, mêmes dents de scie limitées en bande) pour produire des `.wav`
identiques à l'oreille. Deux points travaillés cette session, spécifiques à l'Acid jazz :
- **Niveaux** : le juste est calé à **−3 dB** (pas −1 dB comme les autres sons du 13/09) pour laisser de la
  marge à la couche de série qui se superpose. Cette couche est elle-même **compressée dynamiquement**
  (`duck` dans le générateur : attaque 2 ms, relâchement 80 ms, testée contre un décalage de ±5 ms entre les
  deux lecteurs) pour ne jamais dépasser le pic cible quand elle joue par-dessus n'importe laquelle des 8
  variantes du juste.
- **Mesure « au téléphone »** (`phoneLevel`) revue pour chercher **la fenêtre de 30 ms la plus forte** du
  son entier (fenêtre glissante), pas seulement ses 30 premières ms comme avant : l'Acid jazz a des sons plus
  longs (le juste dure 1 s) dont le pic n'est pas au tout début.

### 5.4 Points ouverts, à trancher/vérifier avec l'utilisateur

- **Réglages pris sans validation explicite** (rien n'était enregistré dans le banc au moment d'implémenter) :
  claquement de doigts gardé sur la note d'arrivée de « Cadence » (case à cocher du banc, par défaut cochée),
  et marge de −3 dB plutôt que −1 dB pour le juste.
- **Anciens fichiers son inutilisés** : à supprimer ou garder ? (§5.2)
- **26 lecteurs audio** au lieu de 13 avant cette session (plus de variantes) : si latence ou ralentissement
  sur un téléphone bas de gamme, la piste notée dans le handoff du 13/09 (`react-native-audio-api` au lieu
  d'`expo-audio`, latence plus faible) redevient pertinente — mais demande une dépendance native, donc une
  nouvelle build.
- **Palier 1 de la série** : son calque (charleston seul) tombe pile sur la note d'arrivée de « Cadence » et
  perd beaucoup de niveau après compression (`duck`) — à vérifier que ça reste audible sur un haut-parleur de
  téléphone.
- **Le scratch d'effacer** est ~6 dB sous le juste, mesuré « au téléphone » — plus bas que la Gomme validée
  le 13/09 (−14 dB sous la bonne réponse, mais sur un son différent). Si trop discret ou trop fort en vrai,
  réglable via `KEY_LEVELS` dans le générateur.
- **Aqua hérite de l'Acid jazz** : les hooks de son sont partagés par toutes les variantes, Aqua compris —
  pas discuté explicitement avec l'utilisateur, à confirmer que c'est voulu.

### 5.5 À tester sur un vrai téléphone (rien testé cette session)

- Audibilité et équilibre de chaque son au haut-parleur (pas au casque : les graves des cuivres/basse
  passent mal, voir §5.3).
- Le palier 1 de la série (§5.4).
- Latence/fluidité avec 26 lecteurs audio chargés (§5.4).
- `pnpm start --clear` nécessaire pour que Metro trouve les nouveaux `.wav` (piège déjà noté le 13/09).

## 6. Décompte et résultats de Pagaille : design façon menu Persona (troisième session, même jour)

Demande de départ : reprendre le design du décompte et de l'écran de résultats de la variante Pagaille en
s'inspirant du même style Persona 5 que le reste de la variante (§2), en invoquant le skill `animate-expo` pour
les décisions de mouvement.

### 6.1 Ce qui a été implémenté

- **Nouveau fichier partagé** : `src/features/challenge/prototype-not-boring/pagaille-paint.ts` — la tache de
  peinture déchirée (`splashPaths`), la feuille blanche dessous (`SHEET`, `SHEET_TILT`) et l'encre blanche à
  contour et ombre noirs (`drawInk`), extraits de `problem-pagaille.tsx` pour être partagés avec le décompte et
  les résultats. `problem-pagaille.tsx` importe maintenant ces fonctions au lieu de les redéfinir ; son rendu
  n'a pas changé.
- **`pagaille-countdown.tsx`** (nouveau) : le 3, 2, 1 comme un coup porté façon Persona. Chaque chiffre arrive
  dès sa première frame, en même temps que le claquement de doigts (`use-countdown-sounds.ts`, §5), trop grand,
  dans l'encre de `pagaille-paint.ts`, sur une étoile d'éclat (« starburst ») de la couleur d'accent avec un
  flash blanc, incliné à sa façon. Il se stabilise en ~240 ms, la feuille blanche apparaissant dessous, puis
  continue de tourner doucement tant qu'il est affiché. Le suivant l'éjecte (translation, rotation, rétrécissement,
  fondu) quand il arrive. Au « go », le 1 est éjecté pendant que les calculs de la pile s'installent en dessous
  (`useScroll`, `answer-hit.ts`), puis le composant se démonte : plus de redessin inutile à cause de
  l'inclinaison.
- **`pagaille-score.tsx`** (nouveau) : le score sur une tache de peinture, comme les calculs en jeu. La tache
  est brossée depuis la gauche, le score défile pendant la gamme montante du son des résultats
  (`use-results-sound.ts`, §5) et « atterrit » à `LAND_MS` (360 ms, calé sur l'accord du son) avec le même hit
  qu'une bonne réponse (`answer-hit.ts` : pop, flash blanc, étincelles).
- **`pagaille-results.tsx`** (nouveau) : l'écran de résultats complet pour la variante M, remplaçant
  `ResultsActions` et le grand nombre pour cette variante :
  - Titre « Finished! » découpé lettre par lettre façon lettres de rançon, chaque lettre sur son propre bout de
    papier (blanc, noir ou orange), polices mêlées (Abril Fatface / League Gothic), tamponnées l'une après
    l'autre. Repli explicite (`LAST_CUTTABLE`) : un titre hors de l'alphabet latin étendu s'affiche entier, pas
    découpé — pas vérifié visuellement en arabe (§6.5).
  - Score sur la tache (`PagailleScore`) sur une bande noire en diagonale.
  - Trois lignes (erreurs, meilleur combo, temps) sur des plaques noires inclinées glissant depuis la droite,
    l'une après l'autre.
  - Deux boutons façon menu Persona : « Restart » sur une plaque blanche au-dessus de son ombre orange, qui
    s'enfonce dans l'ombre au toucher ; « Back to challenges » sur une plaque noire simple.
  - Tout est calé sur le son des résultats (`RESULTS_DELAY_MS` dans `not-boring-challenge.tsx`, puis `LAND_MS`,
    `ROWS_AT`, `BUTTONS_AT` dans ce fichier).
  - Le « meilleur combo » (streak la plus longue de la partie) est calculé localement (`bestStreak`), sans lien
    avec `streak.ts` ni les paliers officiels — point à noter au même titre que §4.1.
- **Nouvelle clé de traduction** : `challenge.results.best_combo` (« Best combo » / « أفضل سلسلة ») ajoutée à
  `en.json` et `ar.json`, pour la ligne du meilleur combo.
- **Branchement** dans `not-boring-challenge.tsx` : `useCountdown` renvoie maintenant un nombre (0 hors
  décompte) plutôt qu'une chaîne ; `PagailleCountdown` est rendu par-dessus la pile de calculs pour
  `layout === 'pagaille'` ; `PagailleResults` remplace `ExtrudedNumber` + `ResultsActions` pour cette variante
  une fois les résultats affichés. Les autres variantes (B à L) n'ont pas bougé.

### 6.2 Mouvement : décisions prises avec `animate-expo`

- Décompte et hit du score : ressenti de coup porté, pas d'apparition douce — la valeur apparaît déjà à sa
  taille choquée dès la première frame (comme le tampon des chiffres tapés, `answer-hit.ts`), puis se réduit à
  sa taille de repos. Pas de `scale(0)` ni d'entrée en fondu seul.
- Titre et lignes de résultats : `CSSAnimationProperties`/`CSSTransitionProperties` de Reanimated, hors thread
  JS, avec la même courbe `cubic-bezier(0.23, 1, 0.32, 1)` que le reste du jeu (voir `challenge-countdown.tsx`
  pour le cast nécessaire par les types RN).
- Réduction des animations : le décompte et le score gardent leur flash (couleur, pas mouvement) et perdent le
  pop, le knock et les étincelles ; le titre et les lignes des résultats gardent leur ordre d'apparition
  (fondus décalés) et perdent le tamponnage, le glissement et le lever.
- Le bouton Restart montre son enfoncement dès que le doigt se pose (`onPressIn`), pas seulement au relâchement.

### 6.3 Fichiers à connaître (en plus de §3)

- `src/features/challenge/prototype-not-boring/pagaille-paint.ts` — tache de peinture, feuille blanche, encre :
  partagé par `problem-pagaille.tsx`, `pagaille-countdown.tsx`, `pagaille-score.tsx` et `pagaille-results.tsx`.
- `src/features/challenge/prototype-not-boring/pagaille-countdown.tsx` — le 3, 2, 1. Réglages en tête :
  `LEAN`, `HIT`, `BURST_FROM`, `SPIN_IN`, `ARRIVE`, `DRIFT`, `KNOCK_*`.
- `src/features/challenge/prototype-not-boring/pagaille-score.tsx` — le score des résultats. Réglages :
  `LAND_MS`, `BRUSH`, `COUNT_FROM_MS`, `MAX_SCALE`.
- `src/features/challenge/prototype-not-boring/pagaille-results.tsx` — l'écran de résultats. Réglages :
  `LAND_MS`, `ROWS_AT`, `BUTTONS_AT`, le style des lettres (`LETTER_*`, `CAPITAL`), le style des lignes
  (`ROW_LEAN`, `ROW_SHIFT`) et des boutons (`BUTTON_LEAN`, `PRESS_DEPTH`).

### 6.4 Comment c'est vérifié (pas un test sur téléphone)

Le décompte a été vérifié en ouvrant le lien direct dans le simulateur iOS pendant un enregistrement d'écran
(`xcrun simctl io booted recordVideo`), puis en extrayant des images avec `ffmpeg` et en les relisant. Les
résultats ne s'atteignent qu'en finissant une partie de 20 calculs : une route temporaire
(`src/app/pagaille-preview.tsx`, montée directement sur `PagailleResults` avec des réponses fixes) a servi à
capturer l'écran sans y jouer, puis a été supprimée avant la fin de la session (`git status` ne la montre plus).
Cette méthode montre le rendu visuel image par image, pas le ressenti en main ni le son — voir §6.5.

### 6.5 À tester sur un vrai téléphone (rien testé cette session)

- Le calage du visuel sur le son : le décompte doit taper pile sur le claquement de doigts, le score doit
  atterrir pile sur l'accord des résultats (`LAND_MS = 360`). Les délais sont calculés à partir du code du
  générateur de sons (§5.3), pas entendus.
- Performance : comme le reste de Pagaille (§2.4), le décompte et les résultats sont un `Canvas` Skia redessiné
  à chaque frame à cause du capteur d'inclinaison — à surveiller sur l'Android le plus lent visé.
- Lisibilité et cadrage sur un petit écran (iPhone SE ou équivalent Android) : la taille du décompte
  (`BURST_RADIUS`) et si la dernière ligne/bouton des résultats reste au-dessus du bas de l'écran.
- Le titre des résultats en arabe : affiché entier (pas découpé lettre par lettre, `LAST_CUTTABLE`), pas revu
  visuellement en RTL.
- Détails mineurs repérés en relisant les images : le « × » de « ×8 » (meilleur combo) n'existe pas dans Abril
  Fatface et retombe sur une police système ; la plaque du temps (`ROW_SHIFT`) peut passer près du bord droit
  sur un écran étroit — deux réglages à l'œil, pas des bugs.

## 7. Clavier à deux pouces : disposition de ⌫, allers-retours avec l'utilisateur (quatrième session, même jour)

Demande de départ : le clavier plein écran de `FlatKeypad` (partagé par les variantes B à M, pas seulement
Pagaille) rend la colonne du milieu difficile à atteindre à deux pouces, même resserré (`px-10`, handoff du
13/09 §6.1). L'objectif posé par l'utilisateur : finir un défi le plus vite possible, en jouant à deux mains,
deux pouces.

### 7.1 Analyse : où va le temps de frappe

- Simulation Node (scratchpad de session, non committée) sur 200 000 réponses tirées comme `problems.ts` : loi
  de Fitts + modèle d'alternance des deux pouces (MacKenzie & Soukoreff, *A model for predicting text entry rate
  on two-thumb keyboards*, 2002).
- Constats sur les réponses du jeu : 73 % ont 2 chiffres, le premier chiffre est 1, 2 ou 3 dans 86 % des cas, et
  **36 % de tous les appuis sont un « = »** (un par réponse) — sur l'ancien clavier (`⌫ 0 =`), coincé en bas à
  droite, seul le pouce droit peut l'atteindre, et 44 % des enchaînements se font avec le même pouce (pas
  d'alternance, la plus grosse perte de vitesse à deux pouces).
- Dédoubler « = » (un dans chaque coin bas, `= 0 =`) ressort comme le levier le plus efficace **parmi les
  dispositions qui ne changent pas la règle du jeu** : environ 13 à 16 % de temps de frappe gagné par réponse
  dans la simulation. (Supprimer la validation manuelle gagnerait davantage, ~40 %, mais changerait le jeu —
  hors sujet, pas retenu.)

### 7.2 Quatre essais sur ⌫, chacun revu par l'utilisateur avant le suivant

Dédoubler « = » libère la case du bas (`⌫ 0 =` → `= 0 =`), donc ⌫ doit trouver une autre place :

1. **⌫ flottante seule, au-dessus de la grille, coin haut-droit** (proposition initiale) — jugée « bizarre » :
   isolée, sans rien à côté d'elle, beaucoup d'espace vide autour.
2. **`0` seul sur sa propre rangée, `= ⌫ =` juste en dessous** (5 rangées au total, proposée par l'utilisateur) —
   colonnes bien alignées, ⌫ regroupée avec ses voisines habituelles, mais grille plus haute (grignote la zone de
   jeu au-dessus).
3. **Grille à 3 colonnes inchangée + ⌫ en chevauchement (`position: absolute`, `right: -32`) dans la marge
   `px-10`, à droite du 9, sur la même rangée** (repositionnement demandé par l'utilisateur : « aligner avec la
   première ligne, à droite du 9 ») — pas de rangée en plus, mais l'alignement vient d'un décalage en pixels
   choisi à la main, pas de la grille elle-même.
4. **Retenu : vraie 4ᵉ colonne, étroite, présente sur les 4 rangées** — vide (un `View` espaceur) partout sauf en
   haut où elle contient ⌫ (demandé explicitement par l'utilisateur : « pour une meilleure présentation »,
   pour que l'alignement vienne de la grille et non d'un réglage à la main). Coût mesuré : les colonnes de
   chiffres passent d'environ 33 % à 29 % de la largeur (~13 % plus étroites), contre ~11,8 % pour la 4ᵉ colonne.

### 7.3 Ce qui a été implémenté (état final de la session)

- **`not-boring-challenge.tsx`**, `FlatKeypad` réécrit en table déclarative `KEY_ROWS` (retour à l'esprit du
  code d'avant cette session, avec une 4ᵉ colonne en plus) :
  ```ts
  const ERASE_COLUMN_FLEX = 0.45; // contre flex: 1 pour les 3 colonnes de chiffres/actions
  const KEY_ROWS = [
    ['7', '8', '9', 'erase'],
    ['4', '5', '6', null],
    ['1', '2', '3', null],
    ['confirm', '0', 'confirm', null],
  ] as const;
  ```
  `null` = case vide (`styles.narrowFill`, même largeur que ⌫, réservée sur toutes les rangées pour que les 3
  colonnes principales s'alignent). `'confirm'` apparaît deux fois dans la même rangée : la clé React est
  l'index de colonne, avec deux commentaires `eslint-disable react/no-array-index-key` / `eslint-enable`
  justifiés en ligne (table figée, jamais réordonnée, labels non uniques).
- **`FlatKey`** : nouveau prop `compact` — bascule `styles.fill` (`flex: 1`) pour `styles.narrowFill`
  (`flex: ERASE_COLUMN_FLEX`, centré), et une touche visuelle plus petite (`compactKey` 40×40, halo 36×36,
  police 24 contre 44 pour un chiffre) — passé par plusieurs formes selon l'essai (§7.2) avant de se stabiliser
  ici.
- **`useKeyGesture`** : `hitSlop` redevenu un paramètre (`Gesture.Manual().hitSlop(...)`), 10 pour la touche
  compacte seulement (sa cible visuelle est sous la règle des 44pt), 0 pour les autres.
- Le clavier resserré du 13/09 (`px-10` sur tout le `FlatKeypad`, handoff précédent §6.1) n'a pas bougé : cette
  session ne touche qu'à la disposition interne des touches, pas à la marge extérieure.

### 7.4 Comment c'est vérifié

- `pnpm type-check`, `pnpm eslint` (0 warning après les deux `eslint-disable` ci-dessus) et `pnpm test` (77/77,
  aucun nouveau test) après chacun des 4 essais.
- Chaque essai relancé dans le simulateur iOS via le lien direct (`calculy://challenge/calculy-20?variant=M`),
  capturé **en plein jeu** (pas seulement au repos, pour voir le clavier sur un vrai calcul), zoomé sur la zone
  ⌫ pour confirmer qu'elle ne mord ni sur le bord de l'écran ni sur le 9.
- **Pas de frappe simulée** : taper sur le simulateur depuis le terminal demanderait de donner l'accès
  Accessibilité macOS à Terminal (réglage système) — pas fait sans le demander à l'utilisateur. Le geste à deux
  pouces n'a donc été jugé par personne cette session, ni Claude ni l'utilisateur, pas même dans le simulateur :
  seul le rendu visuel est vérifié.

### 7.5 Piège rencontré : processus Metro fantôme

Un `expo run:ios` du matin même (10h05, oublié d'une session précédente) tournait encore en arrière-plan sur le
port 8081 en cours de session, servant un bundle obsolète — le rechargement à chaud semblait ne rien faire
(l'app affichait toujours l'ancienne disposition alors que le code avait changé). Diagnostiqué via
`ps -o lstart -p <pid>` (date de démarrage du processus) après `lsof -i :8081`. Corrigé en le tuant
(`kill -9`) et relançant `pnpm start` proprement. **À vérifier en début de session future** avant de conclure
qu'un rechargement à chaud ne marche pas : `lsof -i :8081` peut pointer vers un processus d'une session bien
plus ancienne que celle en cours.

### 7.6 Points ouverts pour la prochaine session

- **Tout le geste à deux pouces reste à juger sur un vrai téléphone** (voir §7.4) : la 4ᵉ colonne réduit les
  colonnes de chiffres d'environ 13 % — à confirmer que ça ne gêne pas la frappe rapide, et que `⌫` (40×40,
  hitSlop 10) reste assez facile à viser sans taper sur le 9 par erreur.
- `ERASE_COLUMN_FLEX = 0.45` et la taille de la touche compacte (40×40, police 24, halo 36×36) sont des
  réglages à l'œil sur un écran de simulateur, pas validés en main.
- Choix pas éprouvé en situation réelle : `= 0 =` (deux « = ») a été validé par l'utilisateur dès le premier
  essai (§7.2) sur la base de la simulation (§7.1) seule — rien ne dit encore que ça bat le simple `⌫ 0 =`
  d'origine une fois en main, à vitesse réelle.
- La simulation du §7.1 (script Node, modèle de Fitts à deux pouces) n'a pas été committée dans le repo — à
  refaire ou à retrouver dans la conversation si on veut re-tester d'autres dispositions plus tard.

## 8. Barre de progression de Pagaille (cinquième session, même jour)

Demande de départ : le « 1/20 » en haut à droite (nombre de calculs, dans `Header` de `not-boring-challenge.tsx`,
en League Gothic gris) ne colle pas au design de Pagaille. Faut-il l'afficher en chiffres ou en barre qui se
remplit ? Avec le skill `animate-expo` pour le mouvement.

### 8.1 Deux essais, le second retenu par l'utilisateur

1. **Un trait incliné par calcul, groupés par 5** (proposition de Claude) : calculs faits en blanc, calcul en
   cours en orange et plus haut, le reste en gris ; entrée des traits un par un pendant le décompte.
   Argument : on reconnaît jusqu'à 5 éléments d'un coup d'œil sans compter, donc on voit à la fois la proportion
   et combien il en reste. **Rejeté par l'utilisateur** : d'autres défis auront beaucoup plus de calculs (au-delà
   d'environ 30, les traits se fondent en une ligne pointillée), et pendant la partie on ne lit pas, on jette un
   coup d'œil pour voir si c'est bientôt fini — ce que dit le remplissage d'une barre, pas un décompte exact.
2. **Retenu : une barre qui se remplit**, dans le style de Pagaille (voir §8.2).

### 8.2 Ce qui a été implémenté

- **`src/features/challenge/prototype-not-boring/pagaille-progress.tsx`** (nouveau, `PagailleProgress`) : une
  bande inclinée (`skewX`, comme les plaques de l'écran de résultats) sous la croix et le chrono, sur toute la
  largeur. Le fond de la barre est le gris `muted` du thème en transparence ; le remplissage est blanc (`ink`) ;
  un petit trait orange (`accent`), plus haut que la barre, marque en tête le calcul en cours, comme la tache
  orange dans la pile. Le trait orange se déplace dans une zone qui s'arrête `HEAD` points avant la fin : il ne
  sort jamais de la barre et couvre toujours le bout du remplissage. Accessibilité : `accessibilityRole=
  "progressbar"` avec `accessibilityValue` (min, max, nombre fait), comme `ChallengeProgress` d'Aqua.
- **Branchement dans `not-boring-challenge.tsx`** : `Header` scindé en `Header` (en-tête + barre de Pagaille) et
  `HeaderRow` (l'ancienne ligne ✕ / chrono / « n/total »). `Header` reçoit maintenant `state`, `playing`
  (`isStarted && !isFinished`) et `bar` (`layout === 'pagaille'`) au lieu de `startedAt`, `finishedAt` et
  `position` — même nombre de lignes à l'appel, parce que `NotBoringChallenge` était déjà pile à la limite
  ESLint `max-lines-per-function` (110). Pour Pagaille, le « n/total » n'est plus affiché du tout ; **les
  variantes B à L gardent leur « 1/20 »**.
- La barre s'efface quand les résultats s'affichent, avec le même fondu (`FADE`) que le chrono.

### 8.3 Mouvement : décisions prises avec `animate-expo`

- **À chaque réponse** (20 à 200 fois par partie, l'œil sur la pile) : le remplissage et le trait orange avancent
  ensemble en `FILL_MS` = 200 ms, courbe `cubic-bezier(0.23, 1, 0.32, 1)`, sans rebond. Transitions CSS de
  Reanimated sur `width` et `left` : autorisé ici parce que ce sont des vues en position absolue sans enfant,
  donc rien d'autre n'est remis en page (même raisonnement que `ChallengeProgress`).
- Le trait orange apparaît en fondu au « go » et disparaît à la fin de la partie ; pendant le décompte, la barre
  est vide et sans trait.
- Pas d'animation d'entrée de la barre (celle des traits de l'essai 1 n'a plus de sens pour une barre).
- **Réduction des animations** : le remplissage avance d'un coup (pas de transition) ; le trait orange garde son
  fondu (opacité, pas mouvement). Différence avec `ChallengeProgress` d'Aqua, qui garde sa transition de 250 ms
  même en réduction des animations — pas harmonisé.
- **Choix pris sans validation explicite de l'utilisateur** : pas de vert ni de rouge dans la barre (la pile et
  l'écran de résultats le montrent déjà), et le trait orange en tête (il dépasse de `HEAD_OUT` = 3 pt au-dessus
  et en dessous).

### 8.4 Comment c'est vérifié (pas un test sur téléphone)

- `pnpm type-check`, `pnpm eslint` sur les fichiers touchés, `pnpm test` (77/77).
- Une route temporaire (`src/app/pagaille-progress-preview.tsx`, supprimée à la fin de la session) faisait défiler
  les états toutes les 600 ms à 20 et à 100 calculs, sur les thèmes blanc et chrome : enregistrée
  (`xcrun simctl io booted recordVideo`), images extraites avec `ffmpeg` et relues. La barre reste aussi nette à
  100 qu'à 20 ; le violet du trait en tête se distingue du blanc sur chrome.
- Capture du vrai écran Pagaille en jeu (`calculy://challenge/calculy-20?variant=M`) : la barre tient sous la
  croix et le chrono sans pousser la pile de calculs.

### 8.5 À tester sur un vrai téléphone / points ouverts

- En jouant vite : le mouvement de la barre à chaque réponse se voit-il assez en vision périphérique, sans
  attirer l'œil loin des calculs ?
- Réglages à l'œil, tous en tête de `pagaille-progress.tsx` : `HEIGHT` (8), `SKEW` (-24°), `HEAD`/`HEAD_OUT`
  (taille du trait orange), `TRACK_ALPHA` (transparence du fond), `FILL_MS` (200 ms).
- Si la barre devient la norme pour toutes les variantes, décider si les variantes B à L la reprennent et
  harmoniser son comportement en réduction des animations avec celui d'Aqua (§8.3).

## 9. Accueil et choix du défi façon menu Persona ; M par défaut (sixième session, même jour)

Demande de départ : harmoniser l'accueil (`HomeScreen`) et le choix du défi avec le design Persona 5 déjà posé
pour Pagaille (§2), et faire en sorte qu'un défi choisi à l'accueil s'ouvre directement sur la variante M, sans
le bouton de bas d'écran qui permettait de changer de variante.

### 9.1 Ce qui a été implémenté

- **Code partagé sorti de Pagaille**, en deux fichiers pour que l'accueil (React Native pur, sans Skia) puisse
  s'en servir sans faire échouer les tests Jest (le module natif Skia ne s'installe pas sous Jest, voir §9.4) :
  - **`pagaille-style.ts`** (nouveau) : tout ce qui n'a pas besoin de Skia — les deux polices, `ON_SPLASH`,
    l'inclinaison des plaques (`SKEW`), `noise`/`wobble`, et les fonctions d'entrée (`stampIn`, `slideIn`,
    `riseIn`, `fadeIn`) déjà utilisées par les résultats de Pagaille.
  - **`pagaille-menu.tsx`** (nouveau) : les composants React Native construits sur `pagaille-style.ts` —
    `RansomTitle` (le titre en lettres de rançon, découpé en scraps papier/encre/peinture) et `MenuPlate`/
    `MenuButton` (la plaque inclinée d'un item de menu, allumée blanche sur son ombre accent au toucher, sinon
    noire). Sortis de `pagaille-results.tsx`, qui les importe maintenant au lieu de les redéfinir ; son rendu
    n'a pas changé.
  - `pagaille-paint.ts` (Skia) a perdu `ON_SPLASH`/`noise`/`wobble`, déplacés dans `pagaille-style.ts` : tous
    ses importeurs (`problem-pagaille.tsx`, `pagaille-countdown.tsx`, `pagaille-score.tsx`) ont été mis à jour.
- **`home-screen.tsx`** réécrit : fond sombre du thème Pagaille, nom « CALCULY » en lettres de rançon sur une
  bande noire inclinée, deux croix géantes très sombres en fond (`Operators`, décoration pure, masquée aux
  lecteurs d'écran), puis les défis juste sous le titre (voir §9.2 pour ce choix de placement).
- **`challenge-card.tsx`** réécrit : chaque défi est une plaque de menu (`MenuPlate`) avec son nombre de
  calculs en grand (Abril Fatface, débordant du haut de la plaque) et son nom/sous-titre en League Gothic.
  Allumée (blanche sur ombre accent) dès que son doigt s'y pose, et tant que la fenêtre de choix (§9.3) reste
  ouverte pour ce défi (nouvelle prop `lit`, portée par `HomeScreen`). Glisse depuis la droite à l'ouverture de
  l'écran, les cartes l'une après l'autre.
- **`challenge-intro-sheet.tsx`** réécrit dans le même style : page à angles droits (rien n'est arrondi dans
  les menus Persona) sous une bande accent inclinée qui dépasse en haut, titre en lettres de rançon, Continue
  comme l'item choisi (plaque blanche) et Cancel en plaque noire simple. Voir §9.3 pour la vitesse d'ouverture.
- **`challenges.ts`** : nouvelle constante `PRODUCT_NAME` (« Calculy »), pour ne plus répéter le nom en dur
  dans l'accueil et `challengeTitle`.
- **`challenge-screen.tsx`** : la pastille de sélection (`PrototypeSwitcher`) est retirée de l'écran ; **M
  (Pagaille) est maintenant la variante par défaut** (`parseVariant` retombe sur `'M'`, plus sur `'A'`). Les
  douze autres variantes restent accessibles par lien direct pour comparer, par ex.
  `calculy://challenge/calculy-20?variant=A`. Le composant `PrototypeSwitcher` lui-même
  (`src/components/prototype-switcher.tsx`) est supprimé : il n'était plus utilisé nulle part. Il n'était pas
  suivi par git (bootstrap jamais commité, §1) : sa suppression est donc définitive, pas récupérable par git.
- **`home-screen.test.tsx`** mis à jour pour le nouveau balisage (les cartes sont maintenant des boutons
  accessibles avec un `accessibilityLabel`, plus un simple `Text` cliqué par son contenu) ; simule
  `usePagailleFonts` pour ne pas attendre le chargement réel des polices dans les tests.

### 9.2 Aller-retour sur le placement des cartes de défi

Premier essai : les cartes en bas de l'écran (« à portée du pouce », par analogie avec un CTA principal).
**L'utilisateur a rejeté ce choix** : ça laissait un grand vide sombre entre le titre et les cartes, qui se lit
comme un écran cassé plutôt que voulu — la portée du pouce est un argument pour un CTA unique ou une liste
assez longue pour atteindre le bas naturellement, pas pour deux cartes courtes plaquées contre le bord. Revenu
en arrière dans la même session : les cartes sont maintenant juste sous le titre, ancrées en haut
(`marginTop`, plus de `flex: 1` + `justifyContent: 'flex-end'`) — une liste qui grandit naturellement vers le
bas si d'autres défis s'ajoutent, sans qu'il faille revoir le placement.

### 9.3 Fenêtre de choix plus rapide, demande explicite de l'utilisateur

Demande : la description du défi (dans la fenêtre qui s'ouvre au choix d'un défi) doit apparaître plus vite.
Diagnostic avant de toucher au code : la description n'a pas d'animation propre, elle apparaît d'un coup en
même temps que toute la fenêtre — le seul levier est donc la vitesse à laquelle la fenêtre (`BottomSheetModal`
de Gorhom) monte. `SHEET_SPRING` dans `challenge-intro-sheet.tsx` passe de `{ duration: 300, dampingRatio: 0.8
}` à `{ duration: 220, dampingRatio: 0.8 }` (toujours `overshootClamping: true`, pour éviter qu'un dépassement
laisse la description mal cadrée un instant). Cette fenêtre s'ouvre à chaque choix de défi, souvent, avec un
contenu léger : descendre sous le standard « feuille/tiroir » de 300 ms (skill `animate-expo`) est un choix
délibéré pour ce cas précis, pas la règle générale.
**Vérification incomplète** : comparé par enregistrement d'écran dans le simulateur (avant/après), mais la
différence ne se voit pas nettement à la résolution obtenue (30 im/s, donc 33 ms par image, contre un écart
attendu d'environ 80 ms) — la physique du ressort dit que ça doit être plus rapide, mais ce n'est pas confirmé
au ressenti. Pistes si 220 ms ne suffit pas en main : descendre encore (180 ms), ou passer `dampingRatio` à 1
pour un mouvement plus direct, sans la légère oscillation du ressort actuel.

### 9.4 Piège rencontré : Skia et Jest

`pagaille-menu.tsx` importait au départ directement `pagaille-paint.ts` (Skia) pour `ON_SPLASH`/`noise`/
`wobble`. Le test de l'accueil (`home-screen.test.tsx`) échouait alors avec « Native Skia Module failed to
correctly install JSI Bindings » : le module natif de `@shopify/react-native-skia` ne s'installe pas sous
Jest, et rien dans l'accueil n'a besoin de dessiner sur un `Canvas`. Corrigé en sortant tout ce qui ne dépend
pas de Skia dans `pagaille-style.ts` (§9.1), que `pagaille-paint.ts` importe maintenant lui-même pour ses
propres besoins de bruit/lettres.

### 9.5 Comment c'est vérifié (pas un test sur téléphone)

- `pnpm type-check`, `pnpm eslint` (0 warning sur les fichiers touchés) et `pnpm test` (77/77, 4 nouveaux dans
  `home-screen.test.tsx` adaptés au nouveau balisage plutôt qu'ajoutés) après chaque étape.
- Accueil et fenêtre de choix vérifiés par captures d'écran dans le simulateur iOS, à chaque changement
  (thème blanc uniquement — le thème chrome de l'accueil n'a pas été revu, l'accueil est toujours dans le look
  Pagaille blanc quel que soit le thème choisi ailleurs, comme avant cette session).
- La vitesse d'ouverture de la fenêtre (§9.3) a été comparée par vidéo (`xcrun simctl io booted recordVideo`)
  avant/après le réglage, avec une route temporaire qui ouvrait la fenêtre automatiquement — supprimée à la fin
  de la session.
- **Pas de frappe ni de toucher simulés** : comme pour le clavier (§7.4), taper dans le simulateur depuis le
  terminal demanderait l'accès Accessibilité macOS, pas demandé sans l'utilisateur. L'enfoncement des plaques
  au toucher (`MenuPlate`, `pressed`) et l'allumage d'une carte de défi tant que sa fenêtre est ouverte n'ont
  donc été jugés par personne cette session, ni Claude ni l'utilisateur.

### 9.6 À tester sur un vrai téléphone / points ouverts

- Le toucher : l'enfoncement d'une plaque et son allumage (carte de défi, Continue/Cancel) — jamais vu en main
  (§9.5).
- La vitesse d'ouverture de la fenêtre de choix (§9.3) : le réglage à 220 ms est une estimation physique, pas
  un ressenti confirmé.
- Le vide sous les deux cartes de défi (§9.2) : acceptable avec 2 défis (les croix en fond occupent un peu
  l'espace), à revoir si la liste ne s'allonge jamais.
- La barre d'onglets du gabarit de départ (Home/Feed/Style/Settings, sous l'accueil) suit le thème système
  (sombre ou claire) alors que l'accueil est toujours sombre façon Pagaille : en thème clair, une barre
  blanche sous un accueil sombre. Repéré en fin de session, pas encore tranché avec l'utilisateur ni corrigé.
- Le thème chrome n'a pas de variante pour l'accueil : il reste toujours blanc/orange (`SKINS.white`), même si
  le défi choisi s'ouvrait en thème chrome par le passé (avant que M soit imposé par défaut, §9.1).

## 10. Pour lancer

`pnpm ios` ou `pnpm android`, l'accueil et le choix du défi sont dans le look Persona/Pagaille (§9) ; choisir un
défi l'ouvre directement sur la variante **M**. Les onze autres variantes restent accessibles par lien direct
pour comparer, par ex. `calculy://challenge/calculy-20?variant=A` (plus de pastille à l'écran, §9.1). Les sons
de l'Acid jazz jouent sur toutes les variantes, Pagaille comprise. Pour régénérer les sons après un réglage du
générateur : `pnpm sounds:challenge`, puis `pnpm start --clear`. Si le rechargement à chaud semble ne rien
faire, vérifier qu'aucun `expo run:ios`/`expo start` d'une session précédente ne tourne encore sur le port 8081
(§7.5).

## 11. Skills à invoquer

- `prototype` : la variante Pagaille reste un prototype jetable ; garder cette posture tant que la direction
  n'est pas validée. Les sons (§5), eux, sont déjà dans le vrai code (comme `streak.ts` et `useChallenge`).
  L'accueil et la fenêtre de choix (§9) sont du vrai code aussi : ce n'est plus un prototype comparatif une
  fois M imposé par défaut, seul l'écran de défi lui-même garde ses douze autres variantes en réserve.
- `animate-expo` : pour tout réglage de mouvement (le fondu d'entrée/sortie, le remélange, les paramètres de
  ressort d'`answer-hit.ts`, le calage du décompte/score sur le son §6.2, la barre de progression §8.3, le
  ressort de la fenêtre de choix §9.3) — rappelle la règle « le ressenti se juge en release sur un vrai
  téléphone ».
- `design-foundations` et `typography` : pour juger la lisibilité du style « lettres de rançon » et la
  hiérarchie des 3 calculs, du titre découpé des résultats (§6.1) et de celui de l'accueil (§9.1).
- `diagnosing-bugs` : si un souci apparaît sur téléphone (mesurer avant de corriger, comme pour les sons du
  clavier dans le handoff du 13/09, ou pour le niveau « au téléphone » du §5.3).
- `touch-and-accessibility` : pour juger la taille de cible de ⌫ (40×40 + hitSlop 10, §7.3/§7.6) une fois en
  main, l'alternance à deux pouces sur `= 0 =`, et l'enfoncement des plaques de menu (§9.5/§9.6) jamais jugé
  au toucher.
- `ui-review` ou `code-review` : avant toute fusion, une fois les directions (Pagaille, sons, décompte/
  résultats, clavier, accueil) validées.
