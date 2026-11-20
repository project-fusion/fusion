import './depth-and-motion.css'

export function Example() {
  return (
    <div className="pair">
      <helix-strands
        contrast={0}
        depth={0}
        drift={0}
        style={{ blockSize: '16rem' }}
      ></helix-strands>
      <helix-strands style={{ blockSize: '16rem' }}></helix-strands>
    </div>
  )
}
