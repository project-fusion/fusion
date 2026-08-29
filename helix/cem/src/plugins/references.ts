import type { HelixDeclaration, HelixMember, Plugin } from '../types.js'

/**
 * Reads `@reference <url> <label>` off a member and puts it on the manifest.
 *
 * **A property built on a platform feature should be able to say which one.**
 * `command` and `commandFor` are the Invoker Commands API and mean nothing to a
 * reader who has not met it; the same is true of `popover`, `ElementInternals`
 * and `hidden="until-found"`. A description sentence can gesture at the name
 * and cannot carry the specification, and a reference page that makes a reader
 * search for it is a reference page doing half its job.
 *
 * The tag lives on the property rather than in a table the site keeps: it
 * survives inheritance, it moves with the member, and it reaches the manifest
 * through the one channel everything else uses. A list the site maintained
 * would be a second place to forget.
 *
 * **`@reference` rather than `@see`, which does not work.** TypeScript parses
 * `@see` specially, into a name reference and a link rather than into the free
 * text every other tag here reads, so `tag.comment` comes back empty and the
 * plugin finds nothing while reporting nothing. A tag of our own is also what
 * `@status` and `@aliases` already are.
 *
 * The first token is the URL and the rest is what to call it: a bare URL
 * printed as itself is a link nobody can tell the destination of at a glance.
 */
const text = (comment: unknown): string => {
  if (typeof comment === 'string') {
    return comment.trim()
  }
  if (Array.isArray(comment)) {
    return comment
      .map((part) => (part as { text?: string }).text ?? '')
      .join('')
      .trim()
  }
  return ''
}

export const references = (): Plugin => ({
  analyzePhase({ moduleDoc, node, ts }) {
    if (!(ts.isClassDeclaration(node) || ts.isClassExpression(node))) {
      return
    }
    const found = new Map<string, { label: string; url: string }[]>()
    for (const member of node.members) {
      if (!member.name) {
        continue
      }
      const seen: { label: string; url: string }[] = []
      for (const tag of ts.getJSDocTags(member)) {
        if (tag.tagName.getText() !== 'reference') {
          continue
        }
        const [url, ...rest] = text(tag.comment).split(/\s+/).filter(Boolean)
        /* A `@reference` with no URL is somebody cross-referencing another
           member, which is not this. Left alone rather than reported, because
           it is not a mistake. */
        if (url?.startsWith('http')) {
          seen.push({ label: rest.join(' ') || url, url })
        }
      }
      if (seen.length > 0) {
        found.set(member.name.getText(), seen)
      }
    }
    if (found.size === 0) {
      return
    }

    /* Every declaration in the module, rather than the one whose name matches:
       a mixin's members are written on a class expression whose name does not
       match the declaration they land in, so matching by name would annotate
       nothing and say nothing about having failed. */
    for (const declaration of (moduleDoc.declarations ?? []) as HelixDeclaration[]) {
      for (const member of (declaration.members ?? []) as HelixMember[]) {
        const seen = member.name === undefined ? undefined : found.get(member.name)
        if (seen !== undefined) {
          member.helix = { ...member.helix, references: seen }
        }
      }
    }
  },
  name: 'helix-references',
})
