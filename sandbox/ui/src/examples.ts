/**
 * Slot content for each component's preview.
 *
 * **The only hand-written data in the sandbox.** Everything else, every
 * property, slot, part, event, and CSS custom property, is read from the
 * manifest, so a new component appears here with its full API and no edit to
 * this file.
 *
 * Examples cannot be derived: nothing in the manifest knows that an accordion
 * wants items inside it or that a card reads better with a heading. So this map
 * holds content only, never API surface, and a component with no entry still
 * renders with the fallback below.
 */
export interface Example {
  /** Inner HTML for the preview, including any slotted children. */
  content: string
  /** Attributes to set on the preview beyond the generated controls. */
  wrapper?: 'block' | 'inline'
}

const EXAMPLES: Record<string, Example> = {
  'helix-accordion': {
    content: `
      <helix-accordion-item>
        <span slot="summary">What happens if Fusion shuts down?</span>
        Nothing you depend on stops working. You hold your own keys and data.
      </helix-accordion-item>
      <helix-accordion-item>
        <span slot="summary">What is the stack?</span>
        Rust for the backend and substrate cores, TypeScript for the front.
      </helix-accordion-item>
      <helix-accordion-item>
        <span slot="summary">How many substrates are there?</span>
        Two: Helix for design, Cortex for memory and provenance.
      </helix-accordion-item>`,
  },
  'helix-accordion-item': {
    content: `
      <span slot="summary">A section that opens</span>
      Content stays in the markup when closed, so it is present for a crawler
      and can animate rather than appearing all at once.`,
  },
  'helix-app-header': {
    content: `
      <span slot="brand">Fusion</span>
      <a href="#work">Work</a>
      <a href="#writing">Writing</a>
      <helix-button slot="actions" appearance="primary" size="sm">Get in touch</helix-button>`,
  },
  'helix-avatar': { content: '', wrapper: 'inline' },
  'helix-breadcrumbs': {
    content: `
      <helix-breadcrumbs-item href="#">Home</helix-breadcrumbs-item>
      <helix-breadcrumbs-item href="#">Design</helix-breadcrumbs-item>
      <helix-breadcrumbs-item current>Helix</helix-breadcrumbs-item>`,
  },
  'helix-breadcrumbs-item': { content: 'Helix', wrapper: 'inline' },
  'helix-button': { content: 'Start a conversation', wrapper: 'inline' },
  'helix-callout': {
    content: 'Stage labels are honest. Building means real work with nothing shipped yet.',
  },
  'helix-card': {
    content: `
      <h3 slot="header">Fusion Design</h3>
      Helix, the design system and the theming engine behind it.
      <helix-button slot="footer" appearance="subtle" size="sm">Learn more</helix-button>`,
  },
  'helix-divider': { content: '' },
  'helix-icon': { content: '', wrapper: 'inline' },
  'helix-tag': { content: 'Building', wrapper: 'inline' },
}

/** Example for a tag, falling back to plain text for anything unlisted. */
export const exampleFor = (tagName: string): Example =>
  EXAMPLES[tagName] ?? { content: 'Example content' }
