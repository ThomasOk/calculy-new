# Handoffs

Notes de passation entre sessions de travail avec Claude Code : ce qui a été fait, les décisions prises,
où on en est et ce qui reste à faire. Pour reprendre le travail, démarrer une session par :
« lis le dernier handoff dans docs/handoffs ».

## Convention

- Un fichier par session, nommé `AAAA-MM-JJ-sujet-court.md`. Le plus récent fait foi.
- On ne réécrit pas un ancien handoff : un nouveau handoff remplace le précédent et y renvoie si besoin.
- Pas de secrets ni de données personnelles.
- On référence le code, les commits et les issues par chemin ou URL plutôt que de les recopier.

## Index

| Date | Sujet |
| --- | --- |
| 2026-09-16 | [Crash intermittent en fin de défi (Pagaille) : geste du clavier reconstruit sous le doigt au dernier `=`, corrigé ; sources audio jamais déconnectées, corrigées par prudence ; piste Skia écartée faute de log de crash ; clavier remonté (plus d'espace en bas)](2026-09-16-challenge-crash-fix.md) |
| 2026-09-15 | [Restructuration en monorepo pnpm (`apps/mobile` + `packages/domain` + `packages/supabase` + `supabase/`, sur le modèle de `molio`), backend Supabase branché (client, types générés) ; alignement de l'identité de l'app (bundle id, projet EAS) sur l'ancienne app publiée `gg.calculy.app` ; config Google/Apple Sign-In portée (sans le code) ; bug `pnpm ios` cassé par le hoisting pnpm corrigé (chemins de polices `expo-font`) ; PR #1 mergée](2026-09-15-monorepo-supabase-migration.md) |
| 2026-09-15 | [Refonte du titre et de la liste de l'accueil façon menu Persona (bouton MENU/BAN), fenêtre de choix ouverte à l'avance pour ne plus attendre au toucher, Finished des résultats devenu un verdict Perfect!/Clear! ; puis sons du menu façon Persona et décompte redessiné sans « GO! » ; puis, au premier test sur un vrai téléphone Android, deux bugs corrigés (espace manquant sous les chiffres, sons silencieux) ; puis haptics posés dans tout le nouveau menu (cartes, boutons, fenêtre, décompte, paliers de streak) pour le game feel](2026-09-15-home-screen-persona.md) |
| 2026-09-14 | [Variante « Pagaille » (M) : design façon menu Persona, clavier resserré, passe de performance ; puis sons du défi, nouvelle direction « Acid jazz » ; puis décompte et résultats façon menu Persona ; puis disposition du clavier à deux pouces (= dédoublé, 4ᵉ colonne pour ⌫) ; puis barre de progression de Pagaille à la place du « 1/20 » ; puis accueil et choix du défi façon menu Persona, M par défaut, pastille de prototypage retirée](2026-09-14-pagaille-variant.md) |
| 2026-09-13 | [Prototype « Not Boring » : variante I retenue, sons du défi, effets de série et clavier](2026-09-13-not-boring-prototype.md) |
