import type { Config } from '@custom-elements-manifest/analyzer'
import { createHelixCemConfig } from '@fusion.dev/helix-cem'

const config: Config = createHelixCemConfig({
  frameworkTypes: true,
  packageName: '@fusion.dev/helix',
  tier: 'styled',
})

export default config
