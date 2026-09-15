// ESLint's flat config is resolved relative to the process's cwd, not per
// linted file — since lint-staged/husky run from the repo root, we have to
// point it at apps/mobile's config explicitly (the only package with one).
const ESLINT_CONFIG = 'apps/mobile/eslint.config.mjs';

module.exports = {
  '**/*.{js,jsx,ts,tsx}': filenames => [
    `npx eslint --config ${ESLINT_CONFIG} --fix ${filenames
      .map(filename => `"${filename}"`)
      .join(' ')}`,
  ],
  '**/*.json': filenames => [
    `npx eslint --config ${ESLINT_CONFIG} --fix ${filenames
      .map(filename => `"${filename}"`)
      .join(' ')}`,
  ],
};
