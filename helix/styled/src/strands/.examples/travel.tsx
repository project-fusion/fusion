import './travel.css'

export function Example() {
  return (
    <>
      <helix-strands travel>
        <helix-strands-stop
          for="travel-opening"
          pattern="bend"
        ></helix-strands-stop>
        <helix-strands-stop
          for="travel-closing"
          pattern="waves"
        ></helix-strands-stop>
      </helix-strands>

      <section
        className="section"
        id="travel-opening"
      >
        <helix-text
          as="h2"
          scale="title"
        >
          Automate the steps between your apps
        </helix-text>
      </section>
      <section className="section">
        <helix-text as="p">
          Between the stops, the ribbon fills the gap in its own pattern.
        </helix-text>
      </section>
      <section
        className="section"
        id="travel-closing"
      >
        <helix-text as="p">A wave crosses at the top of this section.</helix-text>
      </section>
    </>
  )
}
