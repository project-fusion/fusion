import { getFamilies } from '../../../../content/catalog/catalog'
import { INSIGHTS } from '../../../../content/insights'
import { SandboxWorkbench } from './workbench'

/**
 * One sandbox, not one page per example.
 *
 * The example is a query parameter rather than a route segment, so switching
 * examples is a state change instead of a navigation: the pane sizes, the
 * preview theme, and anything typed survive it. It also makes the URL the whole
 * share format.
 */
export default function SandboxPage() {
  const families = getFamilies()
  /* **Built here, on a server, and handed down**, which is the same thing
     `(site)/layout.tsx` does for `SiteNav` and for the same reason: the
     catalog reads the manifest off disk and the insight registry is the whole
     of the writing, so a palette that imported either would pull it into the
     browser to display a list of names. What crosses is the list.
   *
     A component row carries the sandbox as its second destination, which is
     what `alternate` on `Option` is for. From inside the sandbox that is the
     one row where the two destinations genuinely differ: Enter goes to the
     reference and the modifier stays here with a different component loaded. */
  return (
    <SandboxWorkbench
      families={families}
      findable={[
        {
          group: 'Components',
          items: families.map((family) => ({
            alternate: `/helix/sandbox?family=${family.slug}`,
            alternateLabel: 'Open in the sandbox',
            href: `/helix/components/${family.slug}`,
            label: family.label,
          })),
        },
        {
          group: 'Writing',
          items: INSIGHTS.map((insight) => ({
            href: `/insights/${insight.slug}`,
            label: insight.title,
          })),
        },
      ]}
    />
  )
}
