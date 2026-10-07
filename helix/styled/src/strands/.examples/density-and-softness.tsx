import './density-and-softness.css'

export function Example() {
  return (
    <div className="pair">
      <div className="stage">
        <helix-strands
          density={0.2}
          softness={0}
        ></helix-strands>
      </div>
      <div className="stage">
        <helix-strands
          density={1}
          softness={0.9}
          spread={1.4}
        ></helix-strands>
      </div>
    </div>
  )
}
