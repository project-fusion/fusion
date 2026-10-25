/*
 * One turn in a conversation: `@fusion.dev/helix-headless/chat/message`.
 *
 * Its own entry, because a page that feeds a chat its turns as data never
 * writes one, and a page that writes turns by hand imports it beside the chat.
 * Importing it registers the element.
 */
export * from './chat-message.js'
