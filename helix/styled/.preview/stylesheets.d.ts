/**
 * A stylesheet beside an example, loaded for its side effect.
 *
 * **Ambient, so this file must stay free of imports.** One `import` makes it a
 * module and the declaration below stops applying to anything, which reads as
 * ninety-odd "cannot find module './x.css'" errors rather than as a mistake in
 * this file.
 */
declare module '*.css' {}
