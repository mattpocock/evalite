/**
 * Welcome, traveller!
 *
 * You're seeing this file because your tsconfig.json has
 * been configured incorrectly.
 *
 * Ensure that your `tsconfig.json` has one of these
 * settings for `module` and `moduleResolution`:
 *
 * ```json
 * {
 *   // If you're transpiling with 'tsc'
 *   "module": "NodeNext", // "Node16" is also fine
 *
 *   // Otherwise (or if you're not sure)...
 *   "module": "Preserve",
 *
 *   // Delete "moduleResolution" if you find it:
 *   "moduleResolution": "Delete Me"
 * }
 * ```
 *
 * Without this step, you won't be able to import from
 * Evaluhealth's multiple entrypoints:
 * `evaluhealth/traces`, `evaluhealth/ai-sdk` etc.
 *
 * For more information, check out this
 * [cheat sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet).
 */

export * from "../dist/index";
