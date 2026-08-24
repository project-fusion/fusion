import type { Config } from '@custom-elements-manifest/analyzer'
import { createHelixCemConfig } from '@helix-io/cem'

const config: Config = createHelixCemConfig({
  frameworkTypes: true,
  packageName: '@helix-io/styled',
  tier: 'styled',
})

export default config
