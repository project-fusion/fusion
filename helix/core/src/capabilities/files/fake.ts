import type { FilePick, FileSave, Picked, Saved } from '../types.generated.js'
import type { Files } from './contract.generated.js'

/** A files capability that keeps each request, and answers with what a spec sets. */
export interface FakeFiles extends Files {
  /** What the next picks give. Nothing is chosen until a spec sets it. */
  next: Picked
  /** The options of every pick, in order. */
  readonly picks: readonly FilePick[]
  /** What the next saves give, as a browser, a phone's sheet, or a platform that cannot save would. */
  saves: Saved
  /** Every file the platform took or opened its sheet for, in order. */
  readonly saved: readonly FileSave[]
}

/** A fake that keeps each pick and save, gives `next` for a pick, and gives `saves` for a save, `saved` unless told otherwise. */
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
      if (fake.saves !== 'unavailable') {
        saved.push(file)
      }
      return Promise.resolve(fake.saves)
    },
    saved,
    saves: 'saved',
  }
  return fake
}
