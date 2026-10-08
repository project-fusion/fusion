/*
 * The turns of a chat drawn from data: `@fusion.dev/helix-headless/chat/turns`.
 *
 * Its own entry, so a chat whose turns are its children carries none of it.
 * Importing it gives every chat of this tier what `turns` draws: a long
 * transcript, one window at a time.
 */
import { addFeature } from '@fusion.dev/helix-core'
import { HelixHeadlessChat } from '../root/chat-root.js'
import { drawTurns, followTurns, revealTurn } from './chat-turns.js'

addFeature(HelixHeadlessChat, { drawTurns, followTurns, revealTurn })

export { drawTurns, followTurns, revealTurn } from './chat-turns.js'
