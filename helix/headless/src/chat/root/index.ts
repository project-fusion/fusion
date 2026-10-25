/*
 * The conversation: `@fusion.dev/helix-headless/chat/root`.
 *
 * Its own entry, because a page that writes a chat imports its composer
 * beside it from `chat/composer`, and a transcript that takes no new turns
 * carries none of the composer's code. Importing it registers the chat and
 * the message it draws turns with.
 */
export * from './chat-root.js'
