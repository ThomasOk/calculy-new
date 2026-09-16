# Handoff — Calculy · Refonte du titre et de la liste de l'accueil, fenêtre de choix et Finished des résultats (session du 2026-09-15)

> Dossier des handoffs : `docs/handoffs/` (un fichier par session, préfixé par la date ; convention et index dans `README.md`).
> Projet : `/Users/thomas/Documents/dev/calculy_new` — stack et conventions dans `CLAUDE.md`.
> Handoff précédent : [2026-09-14 — Variante « Pagaille », sons du défi, décompte/résultats, clavier et
> accueil](2026-09-14-pagaille-variant.md). Cette session reprend directement son §9 (accueil façon menu
> Persona) : l'utilisateur a demandé de retravailler le titre « CALCULY » de l'accueil, jugé trop plat, en
> s'inspirant d'images de *Persona 5* / *Metaphor: ReFantazio* (menus « en pagaille », bouton MENU, item SKILL).
> **Rien n'est commité avant cette session non plus** : tout le travail du défi reste en fichiers non suivis ou
> modifiés (`git status`), cette session comprise.
> **Objectif de la prochaine session : tester sur un vrai téléphone.** Rien de ce qui suit n'a été vu en main ni
> en mouvement réel — voir §6.

## 1. Démarche : artifacts avant code

Comme pour les sons (handoff du 13/09) et le décompte/résultats (handoff du 14/09 §6), tout le design a été
proposé dans des artifacts HTML jouables avant d'écrire une ligne de code React Native — plusieurs allers-retours
avec l'utilisateur à chaque étape, un artifact par étape :

1. **Le titre seul** : 5 propositions (le style actuel + 4 inspirées des trois images de référence). L'utilisateur
   a retenu la réf. « BAN » (deux plaques noires empilées sur un éclair orange), sans le japonais ni la pastille
   « TAP ».
2. **La liste des défis, sous ce titre** : 4 propositions. Retenue : réf. « SKILL » (plaques pleine largeur,
   taillées en éclair, texte calé à droite), sans le curseur allumé au repos ni le repère « last played ».
3. **La police et la présentation du nombre/mot sur ces plaques** : 4 variantes de la même structure. Retenue :
   **A1 « Case »** — le nombre dans une case blanche penchée, comme la première lettre du titre.
4. **La fenêtre de choix de défi et le « Finished! » des résultats**, jugés plus non raccords avec le nouveau
   style : 4 propositions chacun. Retenues : **F1 « Carte ouverte »** (la fenêtre reprend la carte touchée) et
   **R3 « Verdict »** (le titre des résultats juge la partie : PERFECT! / CLEAR!).

Chaque artifact contenait des écrans iPhone rejouables (bouton « Rejouer ») et, pour les listes/menus, des
cartes tapables pour voir l'état allumé — mais un artifact HTML n'est qu'une approximation : voir §6.

## 2. Ce qui a été implémenté

### 2.1 Le titre de l'accueil : `home-title.tsx` (nouveau)

Remplace l'ancien titre en lettres de rançon (bande noire + sous-titre séparé, handoff du 14/09 §9.1) par deux
plaques noires inclinées sur un éclair orange qui traverse l'écran, comme les prompts de combat de *Persona 5* :

- **Plaque du nom** : « CALCULY », son « C » découpé dans du papier blanc, son « A » encadré d'un trait blanc
  (comme les cases du bouton MENU de la référence), le reste à main levée.
- **Plaque du sous-titre** : « CHOOSE A CHALLENGE », plus petite, sous la première.
- **Mouvement** : l'éclair frappe depuis la gauche, la plaque du nom arrive de la gauche, celle du sous-titre de
  la droite, puis les deux lettres découpées sont tamponnées. Réduction des animations : tout en fondu, dans le
  même ordre.

### 2.2 La liste des défis : `challenge-card.tsx` (réécrit)

Chaque défi est une plaque noire pleine largeur (elle déborde du bord gauche de l'écran), taillée en éclair côté
gauche avec une trame de points en dégradé (dessinée en un seul `Path` SVG, pas des centaines de nœuds), un
nombre dans une case blanche (voir §2.3) et « CALCULATIONS » à côté. Allumée (blanche sur ombre orange) sous le
doigt ou tant que la fenêtre de choix reste ouverte pour ce défi — **plus de curseur allumé au repos** (demande
explicite de l'utilisateur).

### 2.3 Composants partagés, sortis pour être réutilisés

- **`pagaille-menu.tsx`** : `RansomTitle` (lettres de rançon, une par une) est remplacé par **`PlateTitle`** —
  un titre sur une plaque noire, dont seules les deux premières lettres sont découpées (papier + case), le reste
  en texte normal. Réutilisé par le titre de l'accueil (§2.1) et le nouveau titre des résultats (§2.5). Un titre
  hors de l'alphabet latin étendu (`LAST_CUTTABLE`) s'affiche entier, dans une police plus petite avec de la
  place pour les hampes/jambages (`UNCUT_SIZE`), sans découpe — pas revu en arabe (§6). Le prop `stripe` de
  `MenuPlate`, qui ne servait plus depuis le retrait de la bande orange des cartes de défi, est retiré.
- **`count-box.tsx`** (nouveau, dans `src/features/home/components/`) : le nombre dans sa case blanche penchée,
  partagé par `challenge-card.tsx` et la fenêtre de choix (§2.4).
- **`pagaille-style.ts`** : `PRESS_DEPTH`/`PRESS_TRANSITION` (déplacés depuis `pagaille-menu.tsx` pour que le
  rechargement à chaud continue de marcher — Fast Refresh casse sur un fichier qui exporte à la fois des
  composants et des constantes), `slideIn` accepte maintenant une direction (`from`, négatif pour venir de la
  gauche), et un nouveau type exporté `EntranceStyle` (le type de retour de `stampIn`/`fadeIn`, pour typer les
  props `entrance` des composants partagés).

### 2.4 La fenêtre de choix de défi : `challenge-intro-sheet.tsx` (réécrit)

**Contenu**, dans le style de la nouvelle liste :
- La case du nombre (§2.3) et « CALCULATIONS » en tête.
- Trois lignes courtes remplacent le paragraphe de description : opérateurs (+ − ×, dessinés en SVG comme les
  croix géantes du fond de l'accueil), « 3·2·1 », « 00:00 » — chacune avec son repère en orange.
- Boutons **« Start »** (remplace « Continue ») et « Cancel », inchangés dans leur mécanique (`MenuButton`).
- Le bord haut de la fenêtre est taillé en éclair sur une bande orange, au lieu de la bande droite + poignée
  grise d'avant.

**Vitesse d'ouverture**, sujet de la demande explicite de l'utilisateur (« elle n'apparaît pas assez rapidement,
cela casse la dynamique ») :
- **Diagnostic** (dans le code de Gorhom, `BottomSheet.tsx`) : au toucher, la fenêtre modale attendait trois
  mesures avant de bouger — la hauteur de l'écran, celle de sa poignée, celle de son contenu
  (`isLayoutCalculated`). Avec `enableDynamicSizing` (par défaut), cette troisième mesure ne peut se faire
  qu'après le montage du contenu réel, donc après l'ouverture.
- **Correction** : la hauteur du contenu est maintenant mesurée une fois, à l'avance, sur une copie invisible
  (`opacity: 0`, hors écran, `onLayout`) rendue dès le montage de l'accueil. Une fois cette hauteur connue,
  `snapPoints={[height]}` et `enableDynamicSizing={false}` sont passés à la fenêtre réelle : elle n'a plus rien à
  mesurer au toucher. `handleComponent={null}` retire la poignée (plus nécessaire : pas de contenu variable à
  ajuster).
- **Le ressort devient une courbe qui s'arrête net** : `SHEET_MS = 170` (contre 220ms de ressort avant), courbe
  `cubic-bezier(0.23, 1, 0.32, 1)` via `useBottomSheetTimingConfigs`, sans rebond. La case du nombre est
  tamponnée (`stampIn`) au moment où la fenêtre atterrit : c'est le point d'accroche prévu pour le futur son du
  menu (mentionné par l'utilisateur, pas encore implémenté — voir §5).
- **Non mesuré** : le gain réel n'a pas été chronométré sur téléphone, seulement raisonné à partir du code de
  Gorhom. À confirmer en release, filmé (voir §6).

### 2.5 Le titre des résultats : `pagaille-results.tsx` (le titre remplacé)

« Finished! » (lettres de rançon) devient un **verdict sur la performance**, dans le style `PlateTitle` du titre
de l'accueil :
- **« PERFECT! »** (papier du premier lettre en orange) s'il n'y a aucune faute, **« CLEAR! »** (papier blanc)
  sinon — nouvelles clés `challenge.results.perfect` / `challenge.results.clear`, à la place de
  `challenge.finished` *pour cette variante*. `challenge.finished` reste utilisé par les autres variantes du
  défi (`not-boring-challenge.tsx`, `challenge-results.tsx`) : pas touché.
- La plaque est accompagnée d'un éclat de peinture orange (SVG) à sa droite, comme le shard de la référence
  « BAN », et glisse depuis la gauche pendant que l'éclat arrive de la droite.
- Reste au-dessus du score comme avant ; le reste de l'écran de résultats (score sur sa tache, lignes, boutons)
  n'a pas changé.

### 2.6 Traductions (anglais + arabe)

- **`home.json`** : nouvelle clé `home.calculations` (« calculations » / « عملية حسابية »), pour poser le nombre
  et le mot séparément sur les cartes et la fenêtre (avant, une seule chaîne `problem_count` avec `{{count}}`).
- **`challenge.intro.*`** : `description` et `continue` retirés ; `start`, `operations`, `countdown`, `speed`
  ajoutés.
- **`challenge.results.*`** : `perfect` et `clear` ajoutés.

## 3. Fichiers à connaître

- `src/features/home/home-screen.tsx` — assemble `HomeTitle` + la liste de `ChallengeCard` + la fenêtre.
- `src/features/home/components/home-title.tsx` — le titre (§2.1). Réglages en tête : `NAME_SIZE`,
  `HEADING_SIZE`, tracé de l'éclair (`BOLT`, `SPIKE`), délais d'entrée.
- `src/features/home/components/challenge-card.tsx` — une carte de défi (§2.2). Réglages : `HEIGHT`, tracé de la
  plaque (`CUT`), trame de points (`DOT_STEP`/`DOT_RADIUS`/`DOTS_FADE`), délais d'entrée.
- `src/features/home/components/challenge-intro-sheet.tsx` — la fenêtre de choix (§2.4). Réglages : `SHEET_MS`,
  tracé du bord haut (`EDGE_PAINT`/`EDGE_PAGE`), délais.
- `src/features/home/components/count-box.tsx` — la case du nombre, partagée (§2.3).
- `src/features/challenge/prototype-not-boring/pagaille-menu.tsx` — `PlateTitle`, `Plate`, `MenuPlate`,
  `MenuButton` : les pièces de menu partagées par l'accueil et les résultats.
- `src/features/challenge/prototype-not-boring/pagaille-results.tsx` — résultats de Pagaille ; `Verdict` est le
  nouveau titre (§2.5), le reste de l'écran n'a pas bougé depuis le 14/09.
- `src/features/home/home-screen.test.tsx` — mis à jour pour « Start » et le rôle `header` du titre de la
  fenêtre (au lieu du texte de l'ancienne description).

## 4. Comment c'est vérifié (pas un test sur téléphone)

- `pnpm type-check`, `pnpm eslint --fix` sur les fichiers touchés (0 warning), `pnpm test` (77/77, tests de
  l'accueil adaptés au nouveau balisage plutôt qu'ajoutés) — après chaque étape.
- Accueil vérifié par captures d'écran dans le simulateur iOS (relance complète de l'app, pas seulement un
  rechargement à chaud, pour que la nouvelle clé de traduction `home.calculations` soit chargée).
- Fenêtre de choix et les deux titres de résultats (Perfect!/Clear!) vérifiés via une route temporaire
  (`src/app/preview-f1-r3.tsx`, montée sur `ChallengeIntroSheet` ou `PagailleResults` avec des données fixes,
  ouverte par lien direct `calculy:///preview-f1-r3?show=sheet|perfect|clear`), capturée puis **supprimée avant
  la fin de la session** (`git status` ne la montre plus).
- Un bug repéré et corrigé pendant la vérification (pas au moment de l'écriture) : la case du nombre était
  d'abord trop haute (beaucoup de vide sous les chiffres avec `lineHeight: COUNT_SIZE`) ; corrigé en gardant la
  hauteur de ligne complète mais en remontant le tout avec un `marginBottom` négatif, plutôt qu'en réduisant la
  hauteur de ligne (qui coupait le haut des chiffres sous League Gothic sur iOS).

## 5. Points ouverts pour la prochaine session

- **Le son du menu**, mentionné par l'utilisateur mais pas encore demandé explicitement pour cette session : le
  point d'accroche est posé (`SHEET_MS`, le tampon de la case à l'atterrissage de la fenêtre, dans
  `challenge-intro-sheet.tsx`), mais rien n'est généré ni branché. À reprendre avec le générateur de sons
  (`scripts/generate-challenge-sounds.mjs`) et la démarche du 13-14/09 (banc d'écoute en artifact, §5 du handoff
  du 14/09).
- **Un seul réglage de vitesse pour l'ouverture et le glisser pour fermer** : `animationConfigs` de Gorhom
  s'applique aux deux. La vitesse du doigt pendant un glisser n'est peut-être pas aussi bien reprise qu'avec un
  ressort (`dampingRatio`/`velocity`) — à juger en main.
- **Thème chrome de l'accueil** : toujours non revu (déjà noté au 14/09 §9.6) — l'accueil reste dans le look
  blanc/orange quel que soit le thème choisi ailleurs.
- **Barre d'onglets du gabarit** (Home/Feed/Style/Settings) toujours visible sous l'accueil, suit le thème
  système au lieu du thème sombre imposé de l'accueil — même point ouvert que le 14/09, pas traité cette
  session (question posée à l'utilisateur en fin de session précédente, sans réponse encore).

## 6. À tester sur un vrai téléphone (rien testé cette session)

- **Le geste de fenêtre** : ouverture au toucher d'une carte, fermeture en glissant vers le bas ou en touchant à
  côté — jamais vu en main, ni même simulé (accès Accessibilité macOS non demandé, comme au 14/09 §7.4/§9.5).
- **La vitesse d'ouverture réelle** (§2.4) : le raisonnement vient du code de Gorhom, pas d'une mesure. À
  comparer avant/après en release, filmé au ralenti.
- **Le calage du futur son** sur le tampon de la case à l'atterrissage, une fois le son ajouté (§5).
- **Toutes les animations en mouvement** : les artifacts de proposition et les captures de vérification ne
  montrent que des instants figés ou des approximations dans un navigateur, jamais le vrai rendu Reanimated sur
  device.
- **Le titre et la liste en arabe** : le repli non découpé de `PlateTitle` (`UNCUT_SIZE`) n'a été vérifié que
  dans le code, pas à l'écran.
- **Petit écran** (iPhone SE ou équivalent Android) : la fenêtre de choix a une hauteur fixe maintenant — à
  vérifier qu'elle ne dépasse pas d'un petit écran avec les safe areas.

## 7. Pour lancer

`pnpm ios` ou `pnpm android` : l'accueil, la fenêtre de choix et les résultats de Pagaille sont dans le nouveau
style. Choisir un défi ouvre directement la variante **M** (imposée par défaut depuis le 14/09 §9.1). Les onze
autres variantes restent accessibles par lien direct, par ex. `calculy://challenge/calculy-20?variant=A`.

## 8. Skills à invoquer

- `artifact-design` : pour toute nouvelle proposition visuelle avant d'écrire du code — la démarche de cette
  session (artifacts jouables, plusieurs itérations validées avant implémentation) a servi à chaque étape.
- `animate-expo` : pour le calage §2.4 (mesure à l'avance, timing sans ressort qui s'arrête net) et pour tout
  futur réglage de mouvement.
- `prototype` : l'accueil et la fenêtre de choix sont du vrai code, pas un prototype jetable, comme noté au
  14/09 §11 — seul l'écran de défi lui-même garde ses variantes en réserve.
- `touch-and-accessibility` : pour juger l'enfoncement des plaques, l'allumage d'une carte, le glisser pour
  fermer la fenêtre — rien de tout cela n'a été jugé au toucher cette session (§6).
- `ui-review` ou `code-review` : avant toute fusion, une fois testé sur téléphone.

## 9. Sons du menu façon Persona, décompte redessiné sans « GO! », premier test sur un vrai téléphone
(nouvelle session, même jour)

Reprend le point ouvert du §5 (le son du menu, pas encore demandé explicitement à l'époque). **Toujours rien
de commité.**

### 9.1 Démarche : un nouveau banc d'écoute, comme pour le défi (14/09 §5.1)

Même principe qu'au 13-14/09 : un artifact HTML jouable qui synthétise les sons en Web Audio (mêmes
instruments que le générateur, réutilisés de « Pagaille à l'oreille »), pour proposer des sons à l'oreille de
l'utilisateur sans pouvoir les entendre soi-même.
**Lien** : [Le menu à l'oreille](https://claude.ai/artifact/TQXbMPa4iu7PcHe7iNz4Sa).

- **5 moments** : Entrée (une fois par lancement), Carte (le doigt se pose), Fenêtre (la case du nombre est
  tamponnée), Start, Annuler.
- **4 directions** tirées du même groupe Acid jazz (Rythmique, Rhodes, Cuivres, Vinyle) + une colonne Silence
  (l'accueil tel qu'il était).
- **Idée harmonique retenue** : le défi est en mi (le décompte monte mi·sol♯·si) ; le menu attend en la, Start
  joue un accord de si qui appelle le mi du « 3 » — Start lance donc aussi le décompte musicalement.
- **Réglages proposés** : le niveau du menu sous le défi (−6 dB par défaut) et le moment du son de la fenêtre
  (à l'impact du tampon, 320 ms, ou à l'atterrissage de la fenêtre, 170 ms).
- Un téléphone jouable dans la page (cartes, fenêtre, Start qui enchaîne sur le vrai décompte du défi), et le
  choix enregistré dans la base de l'artifact (`menu/choice`), relu directement par Claude — pas de copier-coller.
- **Choix retenu par l'utilisateur** : Rythmique pour Entrée/Carte/Fenêtre/Annuler, Cuivres pour Start, menu à
  −6 dB, son de la fenêtre à l'impact du tampon.

### 9.2 Ce qui a été implémenté

- **`src/features/home/use-menu-sounds.ts`** (nouveau) : `useMenuSounds`, sur `use-sound-bank.ts` (14/09
  §5.2), expose `playEntry`, `playCard(step)`, `playSheet`, `playStart`, `playCancel`.
- **`scripts/generate-challenge-sounds.mjs`** étendu d'une section « The home menu » : rend les 13 sons du
  choix retenu (Rythmique + Cuivres pour Start) dans `src/features/home/sounds/`. Nivellement : chaque moment
  garde son niveau relatif du banc (Entrée −3 dB, Carte −9 dB, Fenêtre −5 dB, Start 0 dB, Annuler −8 dB), le
  tout −6 dB sous le « 3 » du décompte du défi — le premier son qu'on entend juste après Start. Les sons du
  défi (`jazz-*.wav`) ressortent inchangés (même hash) après régénération.
- **`src/features/home/components/challenge-card.tsx`** : nouveau prop `onPressIn`, joue le son propre à la
  carte dès que le doigt se pose, avant même la sélection.
- **`src/features/home/components/challenge-intro-sheet.tsx`** : deux nouveaux props — `onStamped` (au
  moment où le tampon de la case touche, `SHEET_MS + STAMP_MS` après le montage du contenu) et `onClosing`
  (dès que la fenêtre commence à se refermer, quelle qu'en soit la cause : Cancel, glisser, toucher à côté —
  via un nouveau `onAnimate` sur `BottomSheetModal`, qui détecte l'index visé). `onClosing` ne joue pas le son
  d'Annuler si c'est Start qui ferme la fenêtre (même garde `isLeaving` que le double-tap sur Start).
- **`src/features/home/home-screen.tsx`** : joue l'Entrée une fois les polices chargées, câble les nouveaux
  callbacks de son sur les cartes, la fenêtre, Start et Annuler.
- **`src/features/challenge/prototype-not-boring/pagaille-countdown.tsx`** (réécrit) : remplace l'étoile
  dessinée en Skia (14/09 §6) par une plaque noire penchée sur son ombre orange, comme les plaques des menus
  (`pagaille-menu.tsx`) — chaque chiffre (3, 2, 1) est tamponné à son tour. **Plus de « GO! » affiché**
  (demande explicite de l'utilisateur) : après le 1, la plaque disparaît et les calculs arrivent directement.
  Le prop `tilt`, plus nécessaire (plus de dessin Skia), est retiré ; `STAMP_MS` est exporté depuis
  `pagaille-style.ts` pour ce calage.
- **Tests** : `home-screen.test.tsx` simule `use-menu-sounds` et vérifie le son de l'Entrée au montage, le
  son propre à chaque carte au toucher, et Start qui ne joue qu'une fois sur un double tap.

### 9.3 Comment c'est vérifié (avant le test sur téléphone du §9.4)

`pnpm type-check`, `pnpm eslint --fix` sur les fichiers touchés (0 warning), `pnpm test` (80/80, dont 3
nouveaux), `pnpm sounds:challenge` lancé deux fois de suite : mêmes fichiers, même hash, aussi bien sur les
sons du défi que sur les 13 nouveaux du menu — la génération est reproductible.

### 9.4 Premier retour d'un vrai téléphone (Nothing Phone 2, Android) : deux bugs

Premier test de l'app sur un vrai appareil, tous sujets confondus (accueil du 15/09 §1-§8 compris) — jusqu'ici
tout n'avait été vu qu'en simulateur iOS ou raisonné à partir du code (§6 plus haut).

#### 9.4.1 Espace manquant sous les chiffres (`count-box.tsx`, et le nouveau décompte)

- **Constat de l'utilisateur** : dans la case blanche du nombre (20/30, et le nouveau décompte), il manque
  l'espace en bas des chiffres, comme si le padding du bas avait disparu.
- **Cause** : League Gothic réserve, dans sa ligne, de la place sous les chiffres pour des jambages qu'ils
  n'ont pas ; le code remonte le chiffre avec un `marginBottom` négatif (`DESCENDER`) pour compenser, réglé en
  ne regardant que le simulateur iOS (§4 plus haut, jamais vérifié sur Android). Sur Android,
  `includeFontPadding: false` retire déjà une bonne partie de cet espace réservé par la police ; le même
  réglage remonte donc le chiffre deux fois trop haut.
- **Correctif** : réglage extrait dans une seule fonction partagée, `digitRise(size)` (`pagaille-style.ts`),
  avec un ratio différent par plateforme (`Platform.select` : iOS inchangé à 14 %, Android à 6 % — **une
  première estimation, pas encore revérifiée sur l'appareil après correction**). Utilisée par `count-box.tsx`
  et par le nouveau décompte (§9.2), qui avait le même motif, pas encore testé non plus à ce moment-là.

#### 9.4.2 Aucun son dans le menu sur Android

- **Constat de l'utilisateur** : sélectionner un défi et voir la fenêtre de choix apparaître ne joue aucun son
  sur Android.
- **Cause, trouvée en lisant le code (pas en écoutant, aucun accès à l'appareil)** : chaque son de l'app — un
  motif déjà présent avant cette session, dans `use-sound-bank.ts`, `use-countdown-sounds.ts` et
  `use-results-sound.ts`, pas seulement les nouveaux sons du menu — fait `player.seekTo(0)` puis
  `player.play()` avant de jouer, pour qu'un appui rapide relance un son déjà terminé. `seekTo` est
  asynchrone dans `expo-audio` ; sur un lecteur pas encore chargé, cet appel peut entrer en course avec
  `play()` et le laisser silencieux — plus probable sur Android, dont le chargement natif est plus lent. Or
  **chaque son du menu est joué pour la première fois** à chaque lancement (les lecteurs sont recréés à
  chaque montage de l'accueil), exactement le cas qui déclenche cette course.
- **Correctif** : nouvelle fonction partagée `playFromStart(player)` (`audio-mode.ts`), qui ne rembobine que
  si le son a déjà commencé (`player.currentTime > 0`) — inutile, donc retiré, sur un lecteur tout neuf.
  Utilisée aux trois endroits ci-dessus.
- **Pas confirmé comme résolu** : à revérifier sur l'appareil. Comme le motif fautif existait déjà pour les
  sons du défi (juste/faux/décompte/résultats, jamais testés sur un vrai Android avant cette session non
  plus), il vaut la peine de vérifier s'ils étaient eux aussi silencieux avant ce correctif — ça confirmerait
  le diagnostic.

Les deux correctifs n'ont pas touché à la génération audio : seuls `pnpm type-check`, `pnpm eslint --fix` et
`pnpm test` (80/80, inchangé) ont été relancés après chacun, pas `pnpm sounds:challenge`.

### 9.5 Points ouverts pour la prochaine session

- **Les deux correctifs du §9.4 sont à revérifier sur le Nothing Phone 2** : le padding sous les chiffres
  est-il maintenant correct (sinon retoucher `digitRise` dans `pagaille-style.ts`), et le menu joue-t-il du
  son ?
- **Le son du « go »** (cymbale, cuivres — `use-countdown-sounds.ts`) **joue toujours** après le 1, alors que
  le « GO! » affiché a été retiré (§9.2) : pas tranché avec l'utilisateur, qui n'a parlé que de l'affichage.
- **`pnpm start --clear` nécessaire** pour que Metro trouve les 13 nouveaux `.wav` du menu (piège déjà noté le
  13/09 et le 14/09 pour les sons du défi).
- **Le son d'Annuler n'est couvert par aucun test** (la simulation de fenêtre des tests ne signale pas sa
  fermeture) : à essayer au doigt (Cancel, glisser vers le bas, toucher à côté).
- Les points ouverts du 15/09 restent valables (§5, §6) : thème chrome de l'accueil, barre d'onglets, réglage
  unique d'ouverture/fermeture de la fenêtre, tout le mouvement en vrai — au-delà des deux bugs trouvés ici.

### 9.6 Fichiers à connaître (en plus de §3)

- `src/features/home/use-menu-sounds.ts` — les sons du menu (§9.2).
- `src/features/home/sounds/*.wav` — les 13 sons générés (§9.2), et `scripts/generate-challenge-sounds.mjs`
  qui les produit (section « The home menu »).
- `src/features/challenge/audio-mode.ts` — `playFromStart`, partagé par tous les sons de l'app (§9.4.2).
- `src/features/challenge/prototype-not-boring/pagaille-countdown.tsx` — le décompte réécrit (§9.2).
- `src/features/challenge/prototype-not-boring/pagaille-style.ts` — `digitRise` (§9.4.1), `STAMP_MS` exporté.
- Artifact [Le menu à l'oreille](https://claude.ai/artifact/TQXbMPa4iu7PcHe7iNz4Sa) (§9.1) ; choix enregistré
  dans sa base (`menu/choice`).

### 9.7 Skills à invoquer

- `artifact-design` : pour le banc d'écoute (§9.1), comme au 13/09 et au 14/09.
- `diagnosing-bugs` : pour les deux bugs du §9.4, tous deux diagnostiqués depuis le code seul, sans accès à
  l'appareil.
- `touch-and-accessibility` : le son d'Annuler et le geste de fenêtre restent à juger au doigt (§9.5, comme au
  §8 plus haut).

## 10. Haptics façon game feel dans le nouveau menu (nouvelle session, même jour)

L'utilisateur a demandé de regarder où poser des retours haptiques dans le nouveau menu, pour le game feel de
l'app. `keyTapHaptic` (clavier) et `answerHaptic` (correct/faux à la validation) existaient déjà avant cette
session, dans `src/features/challenge/haptics.ts`, câblés dans les deux variantes de défi
(`challenge-board.tsx`, `not-boring-challenge.tsx`) — rien touché de ce côté. **Toujours rien de commité.**

### 10.1 Démarche : un audit du code, pas un banc d'essai

Contrairement aux sons (§9.1) ou au visuel (§1), pas moyen de proposer un artifact jouable : un artifact HTML
ne fait pas vibrer un téléphone. La démarche a donc été un audit direct du code — repérer ce qui avait déjà un
haptique (clavier, validation) et les endroits du nouveau menu façon Persona (cartes de l'accueil, fenêtre de
choix, boutons, décompte, streak) qui n'en avaient encore aucun. Liste proposée et validée par l'utilisateur
avant d'écrire du code, pas de retour en arrière.

### 10.2 Ce qui a été implémenté

- **`haptics.ts`** étendu de 5 fonctions, même recette que les deux déjà là (Android par
  `performAndroidHapticsAsync`, iOS par `impactAsync`/`notificationAsync`) : `menuTapHaptic` (léger),
  `sheetLandHaptic`, `countdownTickHaptic`, `countdownGoHaptic` (un cran au-dessus de `countdownTickHaptic`),
  `streakMilestoneHaptic` (impact `Heavy`, pour se démarquer de `answerHaptic` sur une réponse juste ordinaire).
- **`pagaille-menu.tsx`** (`MenuButton`) : `menuTapHaptic` au press-in — un seul point qui couvre Start, Cancel
  (fenêtre de choix, §2.4) et Restart, Back (résultats de Pagaille, §2.5/§9.2), tous construits sur ce
  composant.
- **`challenge-card.tsx`** : `menuTapHaptic` au press-in de chaque carte de l'accueil, à côté du son déjà câblé
  (§9.2).
- **`challenge-intro-sheet.tsx`** : `sheetLandHaptic` au même moment que `onStamped` (le tampon de la case du
  nombre à l'atterrissage de la fenêtre, §2.4/§9.2) — posé dans le même `setTimeout`, pas délégué au parent.
- **`gloss-pressable.tsx`** : `menuTapHaptic` au press-in — couvre Quit et les boutons Restart/Choisir un défi
  de l'écran de résultats **standard** (l'autre composant de bouton partagé, à côté de `MenuButton`).
- **`not-boring-challenge.tsx`** (`useCountdown`) : `countdownTickHaptic` à chaque 3/2/1, `countdownGoHaptic`
  au go (juste après le retrait du « GO! » affiché, §9.2).
- **`use-streak-effects.ts`** : `streakMilestoneHaptic` quand un palier de streak est atteint
  (`status.atMilestone`) — posé dans le hook lui-même plutôt que dans `not-boring-challenge.tsx`, qui dépassait
  sinon la limite de lignes du linter (`max-lines-per-function`).

### 10.3 Comment c'est vérifié (pas un test sur téléphone)

`pnpm type-check`, `pnpm eslint --fix` sur les fichiers touchés (0 warning), `pnpm test` (80/80, inchangé —
aucun test ne couvre le haptique, ni avant ni après cette session).

### 10.4 Points ouverts pour la prochaine session

- **Rien de tout ça n'a été senti au doigt** : pas simulable sur simulateur, pas encore essayé sur le Nothing
  Phone 2 du §9.4. L'intensité relative choisie (`Light`/`Medium`/`Heavy` côté iOS, effets
  `Virtual_Key`/`Confirm`/`Clock_Tick` côté Android) n'est raisonnée qu'à partir de la documentation
  d'expo-haptics, comme le §2.4 l'avait été pour la vitesse d'ouverture de la fenêtre avant test.
- Le clavier et la validation (`keyTapHaptic`/`answerHaptic`) n'ont pas été retouchés : jugés corrects avant
  cette session, pas remis en cause.
- Les points ouverts précédents (§5, §6, §9.5) restent valables.

### 10.5 Fichiers à connaître (en plus de §3, §9.6)

- `src/features/challenge/haptics.ts` — toutes les fonctions haptiques de l'app, nouvelles et anciennes.
- `src/features/challenge/prototype-not-boring/use-streak-effects.ts` — le haptique de palier de streak, posé
  dans le hook.

### 10.6 Skills à invoquer

- `touch-and-accessibility` : pour juger au doigt tout ce qui précède (§10.4) — encore plus vrai pour du
  haptique, qui ne se juge qu'en main, comme au §6/§9.5 pour le reste du menu.

## 11. Remplacement du son de Start du menu (nouvelle session, même jour)

Le son « Cuivres » de Start (§9.1/§9.2), retenu le même jour, ne convenait plus à l'utilisateur à l'oreille une
fois en place. **Toujours rien de commité.**

### 11.1 Démarche : un second banc, sur Start seul

Même principe qu'au §9.1, mais ciblé sur un seul moment (le reste du menu — Entrée/Carte/Fenêtre/Annuler,
direction « Rythmique » — n'était pas remis en cause) : un artifact HTML jouable, mêmes instruments Web Audio
que le générateur (Rhodes, cuivres, snap, charley, cymbale), même idée harmonique (Start appelle le mi du « 3 »
du décompte). **Lien** : [Le Start à l'oreille](https://claude.ai/artifact/77a5vF9s7jaq4SdkY5Wphm).

- **5 propositions** : l'original Cuivres (gardé pour comparer, marqué comme ne convenant plus), Stab net
  (accord resserré, filtre qui se referme vite), Riff montant (trois notes de Rhodes montantes avant l'accord),
  Cymbale + Cuivres (la cymbale s'ouvre avant que l'accord atterrisse), Swoosh + Stab (souffle filtré puis
  accord bref).
  Un téléphone jouable dans la page (carte → fenêtre → Start) enchaîne sur le vrai décompte pour juger le
  raccord harmonique en situation, comme au §9.1.
- **Choix retenu par l'utilisateur** : **Riff montant** (option C).

### 11.2 Ce qui a été implémenté

- **`scripts/generate-challenge-sounds.mjs`**, section « The home menu » : `menu-start.wav` remplacé par la
  recette du Riff montant — trois notes de Rhodes (sol#5, si5, ré#6, chacune plus forte et un peu plus longue
  que la précédente) puis l'accord de si (si5, ré#6, fa#6) sur les cuivres avec un snap, au lieu du seul accord
  à froid. Les fonctions partagées (`rhodes`, `brass`, `snap`, `hz`) existaient déjà, rien de nouveau à écrire
  côté instruments.
- `pnpm sounds:challenge` relancé : seul `src/features/home/sounds/menu-start.wav` change (375 ms, contre la
  version courte du 15/09) ; tous les autres fichiers, y compris les autres sons du menu et ceux du défi,
  ressortent avec le même hash — la génération reste reproductible et n'a affecté que ce fichier.
- Aucun changement côté `use-menu-sounds.ts` ni ailleurs : `playStart` continue de jouer `menu-start.wav`,
  seul son contenu a changé.

### 11.3 Comment c'est vérifié

`pnpm type-check`, `pnpm eslint --fix` sur `generate-challenge-sounds.mjs` (0 warning), `pnpm test` (80/80,
inchangé — aucun test ne couvre le contenu audio). Pas d'écoute possible côté agent : le choix vient entièrement
du banc d'écoute (§11.1), pas d'une vérification a posteriori du fichier généré.

### 11.4 Points ouverts pour la prochaine session

- **Le Riff montant n'a pas été entendu sur téléphone** : à confirmer au Nothing Phone 2 avec le reste du menu
  (§9.4/§9.5), en particulier que l'allongement de Start (375 ms contre le Cuivres plus court) ne retarde pas
  trop la fermeture de la fenêtre perçue.
- Les points ouverts précédents (§5, §6, §9.5, §10.4) restent valables.

### 11.5 Fichiers à connaître

- `scripts/generate-challenge-sounds.mjs` — recette de `menu-start.wav` (§11.2).
- `src/features/home/sounds/menu-start.wav` — régénéré.
- Artifact [Le Start à l'oreille](https://claude.ai/artifact/77a5vF9s7jaq4SdkY5Wphm) (§11.1) ; choix enregistré
  dans sa base (`start-sound-bench/choice`).

## 12. Le Riff montant non plus, retour à l'ancien banc, Start passe au Rhodes (nouvelle session, même jour)

Le Riff montant (§11) ne convenait pas davantage. Plutôt qu'un troisième round de propositions inédites,
l'utilisateur a demandé de rouvrir l'ancien banc à quatre directions du 15/09 (§9.1,
[Le menu à l'oreille](https://claude.ai/artifact/TQXbMPa4iu7PcHe7iNz4Sa)) : Start n'y avait été essayé que sur
**Cuivres** (§9-§11) ; restaient **Rythmique** (une version plus légère du même accord, jamais essayée),
**Rhodes** (l'accord égrené au piano électrique) et **Vinyle** (la platine qui démarre). **Choix retenu : Rhodes.**
Toujours rien de commité.

### 12.1 Ce qui a été implémenté

- **`scripts/generate-challenge-sounds.mjs`**, `menu-start.wav` : remplacé par la recette Rhodes de l'ancien
  banc — un si13 sans fondamentale (la5, ré#6, sol#6) égrené en 5 ms sur l'électrique (`rhodes`, `g: 0.19,
  decay: 0.5, index: 1.4`) plus un claquement de doigts (`snap`), au lieu de l'accord aux cuivres. `pnpm
  sounds:challenge` relancé : seul ce fichier change (512 ms) ; tout le reste (défi et menu) ressort avec le
  même hash.
- **Aucun autre fichier touché pour le Restart** : la recherche a confirmé que `not-boring-challenge.tsx`
  (`RESTART_SOUND = [menuStartSound]`, `useResultsSounds`) fait déjà rejouer `menu-start.wav` sur le Restart de
  l'écran de résultats — un choix déjà pris avant cette session (commentaire du fichier : « the results
  screen's Restart and back-to-challenges, with the home menu's own Start and Cancel sounds »). Changer la
  recette du fichier suffit donc à mettre à jour Start (accueil) et Restart (résultats) en même temps, sans
  toucher au code React.

### 12.2 Comment c'est vérifié

`pnpm type-check`, `pnpm eslint --fix` sur `generate-challenge-sounds.mjs` (0 warning), `pnpm test` (80/80,
inchangé). Toujours aucune écoute possible côté agent : le choix vient entièrement de l'ancien banc (§9.1), pas
d'une vérification a posteriori du fichier généré.

### 12.3 Points ouverts pour la prochaine session

- **Le Rhodes n'a été entendu ni sur Start ni sur Restart, ni en simulateur ni sur téléphone** : à confirmer au
  doigt, y compris que 512 ms (plus long que Cuivres) ne retarde pas la fermeture de la fenêtre ni le rythme du
  Restart, qui enchaîne directement sur un nouveau défi.
- Si le Rhodes ne convient pas non plus, il reste **Rythmique** (version légère du même accord de cuivres,
  jamais essayée) et **Vinyle** (la platine) dans le même ancien banc — pas besoin d'un nouvel artifact.
- Les points ouverts précédents (§5, §6, §9.5, §10.4, §11.4) restent valables.

### 12.4 Fichiers à connaître (en plus de §11.5)

- `src/features/challenge/prototype-not-boring/not-boring-challenge.tsx` — `RESTART_SOUND`, `useResultsSounds`
  (partage `menu-start.wav` entre Start et Restart, déjà en place avant cette session).

## 13. Start (et Restart) essaient le son Fenêtre de Rhodes (nouvelle session, même jour)

Le Rhodes de Start (§12) ne convenait pas non plus. Plutôt qu'une direction complète de plus, l'utilisateur a
demandé d'essayer, pour Start (et donc Restart, qui partage le même fichier — §12.1), le son que Rhodes jouait
pour un **autre** moment : **Fenêtre**, l'arpège sur lequel la case du nombre est tamponnée à l'atterrissage de
la fenêtre de choix. Toujours rien de commité, pas encore de choix retenu — l'utilisateur voulait d'abord
« voir ce que ça donne ».

### 13.1 Ce qui a été implémenté

- **`scripts/generate-challenge-sounds.mjs`**, `menu-start.wav` : recette remplacée par l'arpège Fenêtre de
  Rhodes — l'accord la maj7 (la5, do#6, mi6, sol#6) roulé sur 18 ms (`rhodes`, `g: 0.15, decay: 0.55, index:
  1.1`, un pas de 6 ms entre les notes) avec le tampon (`stamp(0, 0.22)`) par-dessous, au lieu de l'accord
  Start propre à Rhodes (§12). `pnpm sounds:challenge` relancé : seul ce fichier change (570 ms) ; tout le
  reste (défi et menu, y compris `menu-sheet.wav` qui garde sa propre recette batterie/Rythmique, jamais
  touchée) ressort avec le même hash.
- Restart en hérite automatiquement, comme au §12.1 : aucun autre fichier changé.

### 13.2 Comment c'est vérifié

`pnpm type-check`, `pnpm eslint --fix` sur `generate-challenge-sounds.mjs` (0 warning), `pnpm test` (80/80,
inchangé).

### 13.3 Points ouverts pour la prochaine session

- **Pas de choix arrêté cette fois** : l'utilisateur voulait entendre ce que donne le son Fenêtre sur Start
  avant de trancher. À rejouer sur téléphone (Start et Restart, jamais testés du tout jusqu'ici — §11.4/§12.3)
  et à confronter, si besoin, aux directions encore non essayées pour Start dans l'ancien banc (Rythmique,
  Vinyle — §12.3).
- Les points ouverts précédents restent valables (§5, §6, §9.5, §10.4, §11.4, §12.3).
