import { getFamilies } from '../../../../lib/catalog'
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
  return <SandboxWorkbench families={getFamilies()} />
}
