/*
 * The turns of a chat drawn from data: `@fusion.dev/helix/chat/turns`.
 *
 * Its own entry, so a chat whose turns are its children carries none of it.
 * Importing it gives every chat what `turns` draws: a long transcript, one
 * window at a time. The chat's own sheet draws the turns, so the headless
 * tier's entry serves both.
 */
import '@fusion.dev/helix-headless/chat/turns'
import '../root/chat-root.js'

export { drawTurns, followTurns, revealTurn } from '@fusion.dev/helix-headless/chat/turns'
