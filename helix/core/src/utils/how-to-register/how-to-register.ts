/** What `howToRegister` names: the missing element, where it was found, and its family's entry. */
export interface Unregistered {
  /** The family's entry after the package, such as `option` or `filter-input/menu`. */
  entry: string
  /** The tag of the element that holds or draws the missing one. */
  host: string
  /** The missing element's tag. */
  tag: string
  /** The host's `tier`, which says whose tag it is. */
  tier: string
}

/**
 * The sentence that ends a report of an element nobody registered: the entry
 * to import on our tiers, and on a tier of your own the tag to define, which
 * no import of ours can register.
 *
 * In every build, because some of those reports are: Filter Input says so
 * when the options `source` gave cannot be drawn.
 */
export const howToRegister = ({ entry, host, tag, tier }: Unregistered): string =>
  tier === 'helix-' || tier === 'helix-headless-'
    ? `Import '${tier === 'helix-' ? '@fusion.dev/helix' : '@fusion.dev/helix-headless'}/${entry}'.`
    : `Define <${tag}> as you defined <${host}>.`
