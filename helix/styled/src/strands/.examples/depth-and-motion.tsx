import './depth-and-motion.css'

export function Example() {
  return (
    <div className="pair">
      <div className="stage">
        <helix-strands
          contrast={0}
          depth={0}
          drift={0}
        ></helix-strands>
      </div>
      <div className="stage">
        <helix-strands></helix-strands>
      </div>
    </div>
  )
}
