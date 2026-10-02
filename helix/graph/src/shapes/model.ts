import type { ShapeField } from '../connect-graph/shape-field.js'
import { shapeFromTriangles, type TriangleOptions } from './triangles.js'

/**
 * A solid field from a glTF model, the web's standard format for one: a
 * URL to a `.glb` or `.gltf` file, or the file's bytes. Every mesh in it is
 * read, placed as the model places it.
 *
 * **three.js reads the file**, imported when this is first called, so a page
 * that draws no model never downloads a loader. It is an optional peer of
 * this package.
 */
export const shapeFromModel = async (
  source: string | ArrayBuffer,
  options: TriangleOptions = {},
): Promise<ShapeField> => {
  const [{ GLTFLoader }, { Mesh, Vector3 }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three'),
  ])
  const loader = new GLTFLoader()
  const model =
    typeof source === 'string'
      ? await loader.loadAsync(source)
      : await loader.parseAsync(source, '')
  model.scene.updateMatrixWorld(true)
  const corners: number[] = []
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
    const index = geometry.getIndex()
    const count = index ? index.count : place.count
    for (let at = 0; at < count; at++) {
      point.fromBufferAttribute(place, index ? index.getX(at) : at).applyMatrix4(object.matrixWorld)
      corners.push(point.x, point.y, point.z)
    }
  })
  return shapeFromTriangles(corners, null, options)
}
