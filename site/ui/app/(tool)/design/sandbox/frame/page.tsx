import { PreviewFrame } from './preview-frame'

/**
 * The document a sandbox preview loads.
 *
 * A route rather than a `srcdoc`, because the frame needs the style layers and
 * the element definitions, and both are bundled: a document written by hand
 * would have to name chunk URLs that change with every build. A route imports
 * them the way any page does and the bundler resolves it.
 */
export default function SandboxFramePage() {
  return <PreviewFrame />
}
