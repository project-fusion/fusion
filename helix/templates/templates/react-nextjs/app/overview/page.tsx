import { Overview } from '../overview'

/**
 * A server component, rendering custom elements directly.
 *
 * **The rows cross the boundary as a plain array**, which is worth saying because
 * React drops object and function props on both halves of a server render: the
 * server writes nothing for a prop whose value is an object, and the hydrate path
 * applies none either. `HelixElement` assigns them itself once it upgrades, so
 * the data view takes its data as an ordinary prop and this page needs no
 * `'use client'`.
 *
 * **The cell values still do not server-render**, which is a different limit.
 * Reading a cell needs the columns, and the columns are markup children the
 * server render does not hand the table, so the first paint is a labeled shell.
 * Reach for `helix-table` where the values have to be in the served HTML.
 *
 * What never crosses is a handler. Anything with one is a client component, the
 * same as in any other React app, which is what `signup-form.tsx` is.
 */
export default function Page() {
  return <Overview />
}
