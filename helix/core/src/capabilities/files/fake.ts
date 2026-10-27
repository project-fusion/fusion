import type { FilePick, FileSave, Picked } from '../types.generated.js'
import type { Files } from './contract.generated.js'

/** A files capability that keeps each request, and answers with what a spec sets. */
export interface FakeFiles extends Files {
  /** What the next picks give. Nothing is chosen until a spec sets it. */
  next: Picked
  /** The options of every pick, in order. */
  readonly picks: readonly FilePick[]
  /** Every file saved, in order, while `saves` holds. */
  readonly saved: readonly FileSave[]
  /** Whether the next saves are taken, as a platform without room or permission refuses them. */
  saves: boolean
}

/** A fake that keeps each pick and save, gives `next` for a pick, and takes every save while `saves` holds. */
export const fakeFiles = (): FakeFiles => {
  const picks: FilePick[] = []
  const saved: FileSave[] = []
  const fake: FakeFiles = {
    next: { files: [], outcome: 'dismissed' },
    pick: (options) => {
      picks.push(options)
      return Promise.resolve(fake.next)
    },
    picks,
    save: (file) => {
      if (!fake.saves) {
        return Promise.resolve(false)
      }
      saved.push(file)
      return Promise.resolve(true)
    },
    saved,
    saves: true,
  }
  return fake
}
