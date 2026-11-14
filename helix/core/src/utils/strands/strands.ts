/**
 * Strands' drawing, as numbers: the forms the ribbon's centerline takes, in a
 * box or down a page, its arc lengths and the stretch of it on screen, and the
 * palette read off the canvas's colors. The web element hands them to its
 * WebGL pipeline, and a phone to its GPU drawing, so both lay one ribbon. A
 * phone lays the strands themselves from `ribbonMesh`, the web's vertex
 * shaders in arithmetic.
 */
export * from './centerline.js'
export * from './palette.js'
export * from './path.js'
export * from './ribbon.js'
