import type { PageCopy } from './copy'

/**
 * The trust bar, as data.
 *
 * The page renders it as a numbered list with a closing note; `bun run catalog`
 * renders the same object as `/trust.md`. One set of words, two renderers.
 */

/** The six things, in the order they are published. */
export const BAR = [
  {
    body: 'A written answer to the question every proposal is tested against: what happens to you if Fusion shuts down tomorrow. Published with the product rather than available on request.',
    name: 'The exit test, answered in writing',
  },
  {
    body: 'What is stored, where it lives, how long it is kept and what causes it to be deleted. Stated before a product collects anything, not in a policy revised afterwards.',
    name: 'Data handling stated before collection',
  },
  {
    body: 'Yours, generated where you are, never escrowed. A product that can read your data without your key is a product that can be compelled to.',
    name: 'Keys held by you',
  },
  {
    body: 'You can stop it and keep everything. Not an account closure that starts a countdown, and not an export that produces a file nothing else can read.',
    name: 'A stop that leaves you whole',
  },
  {
    body: "Anything touching credentials, money or another person's records is reviewed by someone who does not work here before it ships. Named in the release, not asserted.",
    name: 'Outside review where the stakes are real',
  },
  {
    body: 'Active means it ships with users. Building means real work with nothing shipped. Declared means committed direction with no work started. No product is described as further along than it is.',
    name: 'The stage label is the true one',
  },
]

export const TRUST: PageCopy = {
  blocks: [
    {
      items: BAR,
      title: 'What has to be true before anything ships',
    },
    {
      body: [
        'Helix is Building and Cortex is Building, which means there is no product yet that has had to clear this list. Publishing the bar before there is anything to hold against it is the point: written first, it is a commitment. Written afterwards, it is a description of whatever we happened to do.',
        'If something we ship does not clear one of these, that is worth telling us about, and the list is short enough that the check is a real one.',
      ],
      kicker: 'Where this stands',
      title: 'None of it has been tested, because nothing has shipped.',
    },
  ],
  lede: 'Six things. The number matters more than the contents: a bar that is never written down can be raised forever, and a company that keeps raising one never launches. Counted and published, it becomes something that can actually be met, and something you can hold us to.',
  title: 'What has to be true before anything ships',
}
