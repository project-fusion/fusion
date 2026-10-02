export {
  fieldFromInside as shapeFromInside,
  fieldFromPath as shapeFromPath,
  inflate,
  type ShapeField,
} from '../connect-graph/shape-field.js'
export { type ImageOptions, shapeFromImage, shapeFromSvg } from './flat.js'
export { shapeFromModel } from './model.js'
export { box, onSphere, sphere, torus } from './solids.js'
export { shapeFromTriangles, type TriangleOptions } from './triangles.js'
