/**
 * Déclaration de types du preset Tailwind Kebrane (KB-12).
 *
 * Le preset est un module CommonJS (`.cjs`) — Tailwind charge sa configuration
 * hors du pipeline du bundler. Sans cette déclaration, une app en `allowJs:false`
 * (c'est le cas de GermanPass, plus stricte qu'`apps/kebrane`) échoue au
 * typecheck sur `TS7016: implicitly has an 'any' type`.
 *
 * Le typer ici plutôt que d'assouplir le tsconfig de l'app : le preset est un
 * artefact PUBLIC du design system, consommé par toutes les apps de la maison.
 */
import type { Config } from "tailwindcss";

declare const preset: Config;
export default preset;
