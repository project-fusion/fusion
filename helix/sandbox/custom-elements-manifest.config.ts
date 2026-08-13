import type { Config } from '@custom-elements-manifest/analyzer'
import { createHelixCemConfig } from '@helix-io/cem'

const config: Config = createHelixCemConfig({
  jsxTypes: true,
  packageName: '@helix-io/sandbox',
  tier: 'styled',
})

export default config
