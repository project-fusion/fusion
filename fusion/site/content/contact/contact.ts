import type { PageCopy } from '@/content/copy/copy'

/*
 * The contact page, as data.
 *
 * Two lists, and both are the substance rather than decoration: what to put in
 * a first message, and what happens after it. A `mailto:` carries neither,
 * which is why this page exists instead of a bare address.
 */

/** What to put in the first message. */
export const INCLUDE = [
  {
    body: 'What it does, who uses it, and what they use today. A link to a repository or a staging site is often the quickest way to show us.',
    name: 'What you are building',
  },
  {
    body: 'The interface, the AI layer, or both. If you are not sure, tell us what is going wrong and we will tell you which part it is.',
    name: 'Which part you need',
  },
  {
    body: 'The date it has to work by, or that there is no fixed date. Both answers help.',
    name: 'When you need it',
  },
  {
    body: 'A range is enough. It tells us whether an audit, a larger engagement, or neither fits, and saves two weeks of finding out.',
    name: 'Your budget',
  },
]

/** What happens after it is sent. */
export const NEXT = [
  {
    body: 'A person who read your message replies within two working days. If the full answer will take longer, the reply gives a date.',
    name: 'Two working days',
  },
  {
    body: 'If the work is outside what we do well, we say so quickly, and we suggest who to ask when we know.',
    name: 'A clear yes or no',
  },
  {
    body: 'Up to two weeks, with the full price agreed before it starts. It ends in a written report that you keep, whether or not you hire us for more.',
    name: 'If yes, an audit first',
  },
]

export const CONTACT: PageCopy = {
  blocks: [
    { items: INCLUDE, title: 'What to include' },
    { items: NEXT, title: 'What happens next' },
  ],
  lede: 'The people who would do the work read every message. Below is what to include in your first message and what happens after you send it.',
  title: 'Tell us what you need built',
}
