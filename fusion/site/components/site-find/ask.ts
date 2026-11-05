/**
 * Ask, the question page inside the site palette.
 *
 * A row is a fact the site already publishes: a component tag, a docs route,
 * the install command, or a contrast figure. The ranker only reorders those
 * facts. A question that matches none of them produces an empty list.
 */

/** Which published source a row comes from. */
export type AskKind = 'component' | 'contrast' | 'doc' | 'install' | 'manifest'

/**
 * One grounded row.
 */
export interface AskFact {
  /**
   * The second line under the name.
   */
  detail: string
  /**
   * Where the row goes.
   */
  href: string
  /**
   * Stable id. The page opener and the ranker both use it.
   */
  id: string
  /**
   * Which source the row was taken from.
   */
  kind: AskKind
  /**
   * The name of the row.
   */
  label: string
  /**
   * A short mark at the end of the row, such as a component's tag.
   */
  mark?: string
  /**
   * The sandbox opened from the row's second destination, where it has one.
   */
  sandbox?: string
  /**
   * The words the ranker matches, including tags and aliases.
   */
  terms: string
}

/** The page name `helix-command` shows Ask under. */
export const ASK_PAGE = 'ask'

/**
 * The rows Ask shows before a question, in the order they are offered.
 *
 * A sequence: install, then the manifest, then contrast. Sorting it would
 * hide that order.
 */
const REST = ['install', 'manifest', 'catalog', 'contrast-target', 'contrast-results'] as const

/**
 * Paths Ask is offered on.
 *
 * Docs, the component reference, the sandbox, and the theme builder. The
 * marketing pages, including `/helix` itself, are not in the list.
 */
const ASK_PATHS = ['/helix/components', '/helix/docs', '/helix/sandbox', '/helix/theme']

/** Words that carry no Helix term, so they never rank a row. */
const STOP = new Set([
  'a',
  'about',
  'an',
  'and',
  'are',
  'can',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'please',
  'show',
  'that',
  'the',
  'this',
  'to',
  'what',
  'where',
  'which',
  'with',
  'you',
  'your',
])

/**
 * A query word that names a source we actually hold.
 *
 * The boost only reorders a row the word also matched. It never adds a row.
 */
const INTENT: Readonly<Record<string, readonly AskKind[]>> = {
  aa: ['contrast'],
  aaa: ['contrast'],
  add: ['install'],
  api: ['manifest'],
  bun: ['install'],
  catalog: ['manifest'],
  cem: ['manifest'],
  contrast: ['contrast'],
  grade: ['contrast'],
  install: ['install'],
  installation: ['install'],
  manifest: ['manifest'],
  npm: ['install'],
  palette: ['contrast'],
  sandbox: ['component'],
  scaffold: ['install'],
  tag: ['component', 'manifest'],
  tags: ['component', 'manifest'],
  theme: ['contrast', 'doc'],
  tokens: ['manifest'],
  wcag: ['contrast'],
}

/**
 * A token this common is the catalog's own prefix.
 *
 * `helix` is a segment of every tag. Ranking on it would list the whole
 * catalog in the order the files happen to be in.
 */
const GENERIC = 0.4

/** Whether Ask is offered at this path. */
export const askOnPath = (pathname: string): boolean =>
  ASK_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

/** The starter rows, skipping any id the corpus does not hold. */
export const askRest = (facts: readonly AskFact[]): AskFact[] => {
  const byId = new Map(facts.map((fact) => [fact.id, fact]))
  return REST.flatMap((id) => {
    const fact = byId.get(id)
    return fact === undefined ? [] : [fact]
  })
}

/**
 * The rows for a question, best first.
 *
 * An empty question, or one made only of words every row shares, shows the
 * starter rows. A question that names nothing in the corpus shows nothing.
 */
export const askHits = (facts: readonly AskFact[], query: string, limit = 8): AskFact[] => {
  const tokens = contentTokens(query)
  if (tokens.length === 0) {
    return askRest(facts)
  }
  const indexed = facts.map((fact, order) => ({
    fact,
    label: wordsOf(fact.label),
    order,
    words: wordsOf(`${fact.label} ${fact.detail} ${fact.mark ?? ''} ${fact.terms}`),
  }))
  const specific = tokens.filter((token) => !common(indexed, token))
  if (specific.length === 0) {
    return askRest(facts)
  }
  return indexed
    .map((row) => {
      let matched = 0
      let score = 0
      const kinds = new Set<AskKind>()
      for (const token of specific) {
        const intent = INTENT[token]
        if (intent) {
          for (const kind of intent) {
            kinds.add(kind)
          }
        }
        if (holds(row.label, token)) {
          matched += 1
          score += 8
        } else if (holds(row.words, token)) {
          matched += 1
          score += 5
        } else if (prefixed(row.words, token)) {
          matched += 1
          score += 2
        }
      }
      if (matched > 0 && kinds.has(row.fact.kind)) {
        score += 3
      }
      if (matched === specific.length && specific.length > 1) {
        score += 4
      }
      return { matched, order: row.order, row: row.fact, score }
    })
    .filter((one) => one.matched > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((one) => one.row)
}

/** Words a question contributes, with the empty ones removed. */
const contentTokens = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((token) => token.length > 1 && !STOP.has(token))

/** Words of a fact, hyphens kept so a tag stays one word and one segment list. */
const wordsOf = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((word) => word.length > 1)

/** Whether a word or one of its hyphen segments is the token. */
const holds = (words: readonly string[], token: string): boolean =>
  words.some((word) => word === token || word.split('-').includes(token))

/** Whether a word begins with the token, for a stem long enough to mean one thing. */
const prefixed = (words: readonly string[], token: string): boolean =>
  token.length >= 4 && words.some((word) => word.startsWith(token) && !holds([word], token))

/** Whether the token lands on too much of the corpus to rank by. */
const common = (indexed: readonly { words: readonly string[] }[], token: string): boolean => {
  if (indexed.length === 0) {
    return false
  }
  const count = indexed.filter(
    (row) => holds(row.words, token) || prefixed(row.words, token),
  ).length
  return count > indexed.length * GENERIC
}
