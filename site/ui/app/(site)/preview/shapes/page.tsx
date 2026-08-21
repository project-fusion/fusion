import { ShapeLab } from './shape-lab'
import './shapes.css'

export const metadata = { title: 'Shape bench' }

/**
 * Five candidate background shapes, one program, and a pointer.
 *
 * A bench rather than a proposal: the point is to see them beside each other in
 * the real palette at real size, which no amount of describing them does. The
 * winner gets folded back into `preview/pillar` and the rest are deleted.
 */
export default function Page() {
  return <ShapeLab />
}
