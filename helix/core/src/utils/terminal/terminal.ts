/**
 * What a terminal frame computes on both platforms: the chords it takes for
 * itself, the bytes a key press sends a program, and its screen as runs of
 * text with a search through them. The web's frame reads the chords, and a
 * phone's frame, which draws its own screen, reads them all.
 */
export * from './encode.js'
export * from './keys.js'
export * from './screen.js'
