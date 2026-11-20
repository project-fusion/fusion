import type { RendererKind } from '../types.generated.js'
import type { Renderer } from './contract.generated.js'

/** A renderer capability whose answers a spec sets. */
export interface FakeRenderer extends Renderer {
  /** The kinds `available` answers yes for. */
  draws: Set<RendererKind>
}

/** A fake that answers yes for `kinds`, every kind until a spec says otherwise. */
export const fakeRenderer = (
  kinds: readonly RendererKind[] = ['map', 'terminal'],
): FakeRenderer => {
  const fake: FakeRenderer = {
    available: (kind) => fake.draws.has(kind),
    draws: new Set(kinds),
  }
  return fake
}
