import type { ReactNode } from 'react'

/**
 * The sandbox owns the whole viewport.
 *
 * No site header and no centred column: this is a tool, and every row of chrome
 * around it is a row taken from the thing being examined.
 */
export default function SandboxLayout({ children }: { children: ReactNode }) {
  return <div className="sandboxShell">{children}</div>
}
