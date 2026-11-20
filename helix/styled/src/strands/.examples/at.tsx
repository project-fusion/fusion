import './at.css'

export function Example() {
  return (
    <div className="pair">
      <helix-strands
        at={0.25}
        pattern="bend"
        style={{ blockSize: '16rem' }}
      ></helix-strands>
      <helix-strands
        at={0.75}
        pattern="bend"
        style={{ blockSize: '16rem' }}
      ></helix-strands>
    </div>
  )
}
