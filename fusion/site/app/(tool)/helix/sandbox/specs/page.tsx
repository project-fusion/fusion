import { SpecFrame } from './spec-frame'

/**
 * The document the sandbox's spec runner loads.
 *
 * A route rather than a `srcdoc`, for the reason the preview frame is one: it
 * needs the style layers, and those are bundled under URLs that change with
 * every build.
 */
export default function SandboxSpecsPage() {
  return <SpecFrame />
}
