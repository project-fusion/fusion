import './at.css'

export function Example() {
  return (
    <div className="pair">
      <div className="stage">
        <helix-strands
          at={0.25}
          variant="bend"
        ></helix-strands>
      </div>
      <div className="stage">
        <helix-strands
          at={0.75}
          variant="bend"
        ></helix-strands>
      </div>
    </div>
  )
}
