/* Each Sandbox and Terminal tag as the native component of that name. A
   sandbox's preview is the web's alone, and draws nothing on a phone. */
import {
  HelixSandbox,
  HelixSandboxConsole,
  HelixSandboxPreview,
  HelixSandboxSource,
  HelixSandboxStatusBar,
  HelixSandboxToolbar,
} from '../sandbox/index.native'
import { HelixTerminal } from '../terminal/index.native'

export const CODE_TAGS: Readonly<Record<string, unknown>> = {
  'helix-sandbox': HelixSandbox,
  'helix-sandbox-console': HelixSandboxConsole,
  'helix-sandbox-preview': HelixSandboxPreview,
  'helix-sandbox-source': HelixSandboxSource,
  'helix-sandbox-status-bar': HelixSandboxStatusBar,
  'helix-sandbox-toolbar': HelixSandboxToolbar,
  'helix-terminal': HelixTerminal,
}
