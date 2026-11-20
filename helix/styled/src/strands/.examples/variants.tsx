import './variants.css'

export function Example() {
  return (
    <div className="forms">
      <helix-strands
        pattern="bend"
        style={{ blockSize: '16rem' }}
      ></helix-strands>
      <helix-strands
        pattern="ribbon"
        style={{ blockSize: '16rem' }}
      ></helix-strands>
      <helix-strands
        pattern="waves"
        style={{ blockSize: '16rem' }}
      ></helix-strands>
    </div>
  )
}
