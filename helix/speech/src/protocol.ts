/** The model sizes an engine can load, smallest first. */
export type MoonshineModel = 'medium' | 'small' | 'tiny'

/** What the page tells the worker. */
export type ToWorker =
  | {
      /** Where the model files load from, or the Moonshine CDN when absent. */
      models?: string
      model: MoonshineModel
      type: 'load'
    }
  | { id: number; type: 'start' }
  | { id: number; samples: Float32Array; type: 'audio' }
  | { id: number; type: 'stop' }

/** What the worker tells the page. */
export type FromWorker =
  | { fraction: number; type: 'progress' }
  | { type: 'loaded' }
  | { message: string; type: 'failed' }
  | { id: number; text: string; type: 'partial' }
  | { id: number; text: string; type: 'final' }
  | { id: number; type: 'stopped' }
  | { id: number; message: string; type: 'error' }
