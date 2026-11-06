import type { GpuDrawing } from './contract.generated.js'

/** A GPU drawing capability whose answer a spec sets. */
export interface FakeGpuDrawing extends GpuDrawing {
  /** Whether `available` answers yes. */
  draws: boolean
}

/** A fake that answers `draws`, yes until a spec says otherwise. */
export const fakeGpuDrawing = (draws = true): FakeGpuDrawing => {
  const fake: FakeGpuDrawing = {
    available: () => fake.draws,
    draws,
  }
  return fake
}
