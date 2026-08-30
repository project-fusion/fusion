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
    body: 'What it does, who uses it, and what is in front of them today. A repository or a staging link says this faster than a description of it.',
    name: 'The thing you are building',
  },
  {
    body: 'The interface, the intelligence layer, or both. If you do not know which, say what is going wrong and we will tell you which it is.',
    name: 'Which part you need',
  },
  {
    body: 'A date it has to work by, or the absence of one. Both are answers, and the second is more common than anybody admits in a first email.',
    name: 'When it matters',
  },
  {
    body: 'A range is enough. It decides whether an audit, an engagement or neither is the honest answer, and saying it early saves the two weeks it takes to find out.',
    name: 'What you can spend',
  },
]

/** What happens after it is sent. */
export const NEXT = [
  {
    body: 'From a person who read it, not an autoresponder. If it will be longer than that, the reply says so and gives a date.',
    name: 'Two working days',
  },
  {
    body: 'We say no when the work is outside what we do well, and we say who to ask instead when we know. A slow no is worse than a fast one.',
    name: 'A plain yes or no',
  },
  {
    body: 'Two weeks, priced in full before it starts, ending in a written finding you keep whether or not anything follows it.',
    name: 'If yes, an audit first',
  },
]

export const CONTACT: PageCopy = {
  blocks: [
    { items: INCLUDE, title: 'What to include' },
    { items: NEXT, title: 'What happens next' },
  ],
  lede: 'One address, read by the people who would do the work. What follows is what to put in the first message and what happens after you send it, so neither is a thing you have to guess at.',
  title: 'Tell us what you need built',
}
