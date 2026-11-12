import './density-and-softness.css'

export function Example() {
  return (
    <div className="pair">
      <helix-strands
        density={0.2}
        softness={0}
        style={{ blockSize: '16rem' }}
      ></helix-strands>
      <helix-strands
        density={1}
        softness={0.9}
        spread={1.4}
        style={{ blockSize: '16rem' }}
      ></helix-strands>
    </div>
  )
}
