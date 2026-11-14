/* What the web's files use that no package they import declares. */

/** A stylesheet, imported for its rules. Metro bundles it on the web. */
declare module '*.css' {}

/** True in development, as Metro sets it. */
declare const __DEV__: boolean
