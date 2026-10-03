import type { ShapeField } from '../shapes/shape-field.js'
import { shapeFromTriangles, type TriangleOptions } from '../shapes/triangles.js'

/**
 * A solid field from a glTF model, the web's standard format for one: a
 * URL to a `.glb` or `.gltf` file, or the file's bytes. Every mesh in it is
 * read, placed as the model places it, and where it has two meshes or more,
 * each is a part of the field, named as the model names it, which a
 * stencil's `regions` sends groups to. A mesh the model leaves unnamed is
 * named as three.js names it, `mesh_0` and on.
 *
 * **three.js reads the file**, imported when this is first called, so a page
 * that draws no model never downloads a loader. It is an optional peer of
 * this package. A model that cannot be fetched or read is an error that
 * names it, the loader's own error as its `cause`.
 */
export const shapeFromModel = async (
  source: string | ArrayBuffer,
  options: TriangleOptions = {},
): Promise<ShapeField> => {
  const which = typeof source === 'string' ? `The model ${source}` : 'The model given as bytes'
  const [{ GLTFLoader }, { Mesh, Vector3 }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three'),
  ]).catch((cause: unknown) => {
    throw new Error(
      `${which} could not be read, because three.js could not be loaded. Install three alongside @fusion.dev/helix-graph.`,
      { cause },
    )
  })
  const loader = new GLTFLoader()
  const model = await (typeof source === 'string'
    ? loader.loadAsync(source)
    : loader.parseAsync(source, '')
  ).catch((cause: unknown) => {
    throw new Error(`${which} could not be read as a glTF model: ${String(cause)}`, { cause })
  })
  model.scene.updateMatrixWorld(true)
  const corners: number[] = []
  /* **Each mesh a named part**, by its node's name or its mesh's, so a page
     can send a group to it: `{ Vision: 'occipital' }`. three.js names a
     node and its mesh as the file does, the characters a name cannot hold
     in an animation path replaced. */
  const names: string[] = []
  const ofTriangle: number[] = []
  const point = new Vector3()
  model.scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return
    }
    const geometry = object.geometry
    const place = geometry.getAttribute('position')
    if (!place) {
      return
    }
    const name = object.name || (geometry.name as string) || ''
    let part = names.indexOf(name)
    if (name && part < 0) {
      part = names.push(name) - 1
    }
    const index = geometry.getIndex()
    const count = index ? index.count : place.count
    for (let at = 0; at < count; at++) {
      point.fromBufferAttribute(place, index ? index.getX(at) : at).applyMatrix4(object.matrixWorld)
      corners.push(point.x, point.y, point.z)
    }
    for (let triangle = 0; triangle < Math.floor(count / 3); triangle++) {
      ofTriangle.push(part)
    }
  })
  /* Parts only where there are two or more, since one part leaves nothing to choose. */
  const named = names.length > 1 && !ofTriangle.includes(-1)
  return shapeFromTriangles(corners, null, {
    ...options,
    ...(named ? { regions: { names, ofTriangle } } : {}),
  })
}
