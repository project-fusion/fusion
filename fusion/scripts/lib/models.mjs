/**
 * The 3D models the Graph examples draw their notes on, for a server that
 * renders the examples. A module, not a script: nothing here runs alone.
 *
 * **The site serves them at `/media/models`**, and an example names them by
 * that path, so every server that renders the examples answers it the same
 * way. A server that answered only with the frame's own files failed the
 * example that names one, on a model the site serves.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { root } from './workspace.mjs'

const MODELS = join(root, 'fusion/site/public/media/models')

/**
 * The model a request's path names, and its media type, or undefined where
 * the path names no model. A file name only: no folder, so nothing outside
 * the models is reachable.
 */
export const modelFile = (path) => {
  const match = /^\/media\/models\/([\w.-]+\.glb)$/.exec(path)
  if (!match) {
    return undefined
  }
  try {
    return { body: readFileSync(join(MODELS, match[1])), type: 'model/gltf-binary' }
  } catch {
    return undefined
  }
}
