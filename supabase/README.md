# Supabase

Ce dossier contient la configuration locale et les migrations SQL du projet.

Lier le projet avec la CLI Supabase (`supabase login` puis `supabase link`) avant d'ajouter la première migration. Les types générés doivent ensuite être écrits dans `packages/supabase/src/database.types.ts` (`supabase gen types typescript --linked`).
