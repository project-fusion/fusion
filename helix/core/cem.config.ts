import type { Config } from '@custom-elements-manifest/analyzer'
import { createHelixCemConfig } from '@fusion.dev/helix-cem'

const config: Config = createHelixCemConfig({ tier: 'core' })

export default config
