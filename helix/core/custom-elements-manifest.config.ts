import type { Config } from '@custom-elements-manifest/analyzer'
import { createHelixCemConfig } from '@helix-io/cem'

const config: Config = createHelixCemConfig({ tier: 'core' })

export default config
