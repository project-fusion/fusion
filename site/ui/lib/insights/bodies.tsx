import type { ReactNode } from 'react'

/**
 * The prose, keyed by slug.
 *
 * **Separate from the registry on purpose.** `index.ts` is metadata and crosses
 * into the client bundle so the gallery can filter; this file is imported only
 * by `/insights/[slug]`, which is a server component, so no essay is ever sent
 * to a browser that is looking at a grid of titles.
 *
 * JSX rather than MDX. `@next/mdx` is not installed, and adding a markdown
 * pipeline plus its remark plugins to render six posts would be a build
 * dependency bought against prose we already control. The day the writing
 * outgrows this, the registry is the thing that stays and only this file
 * changes.
 *
 * Every body is wrapped in `[data-prose]` by the route rather than here, so a
 * body is content and the page decides how content is themed.
 */
export const BODIES: Record<string, () => ReactNode> = {
  'a-palette-from-one-brand-color': () => (
    <>
      <p>
        Most design systems ship a palette as a spreadsheet: eleven steps of grey, eleven of the
        brand, a handful of status colors, each one a hex somebody picked and nobody can check. The
        file is authoritative because it is the file, not because anything about it is true.
      </p>
      <p>
        The problem is not that the numbers are wrong. It is that there is no procedure by which
        they could be found wrong. A contrast failure in step 400 against step 50 is discovered by a
        person running an audit, at which point the fix is a new hex, which is another number nobody
        can check. Accessibility becomes a review step that happens after the design, and review
        steps get skipped under deadline.
      </p>
      <h2>Deriving instead</h2>
      <p>
        Helix takes one brand color and computes the rest. Every step is a transformation in a
        perceptual color space, so lightness means the same thing at every hue, and the contrast
        between any two steps is a consequence of how far apart they are rather than a coincidence
        somebody has to verify.
      </p>
      <p>
        What that buys is not a prettier palette. It is that the palette cannot drift. A designer
        who wants a warmer brand changes one value and the whole system moves with it, still
        accessible, because accessibility was never a property of the individual hexes. It was a
        property of the derivation.
      </p>
      <p>
        The second thing it buys is smaller and matters more day to day: there is nothing to choose.
        A component asks for <code>--helix-color-foreground-muted</code> and gets the right value in
        light mode, dark mode, and against whatever brand the consumer set. Consistency stops being
        a thing the team maintains and becomes a thing the system cannot avoid.
      </p>
      <h2>The cost</h2>
      <p>
        Derivation is worse than hand-picking at exactly one job, which is hitting a specific color
        a brand guideline names. If your brand book says the disabled state is this grey and no
        other, a derived system will fight you. We think that trade is correct for a design system
        and would not be correct for a brand identity, which is a different artifact with a
        different purpose.
      </p>
    </>
  ),
  'helix-ships-as-one-open-tier': () => (
    <>
      <p>
        Decided 18 August 2026. Helix ships as one open tier: no pro components, no paywalled API
        surface, no enterprise build with three extra things in it.
      </p>
      <p>
        The economic argument for a paid tier is real and we are not pretending otherwise. The
        free-versus-pro component libraries monetize the two or three components a team cannot
        afford to build, sold across a distribution base large enough that a low conversion rate is
        still real money. Helix has neither the components nor the base, and acquiring both is a
        different company than this one.
      </p>
      <h2>The architectural reason is stronger</h2>
      <p>
        Under cheap generation, a design system's value is being the constraint that generated
        interface code converges on. One vocabulary of names, tokens, and types, legible to whatever
        is writing against it. That mechanism is the whole asset.
      </p>
      <p>
        A paywalled component is a component those agents do not know about. Split the API surface
        and you have not created a revenue line with a small cost attached: you have damaged the
        thing that makes the system worth adopting at all. The generated code routes around the paid
        components, badly, using the free ones, and the output is worse than if the paid ones had
        never existed.
      </p>
      <p>
        There is a version of this that only bites at scale, and it is worth being precise about why
        we think it bites immediately. An agent writing against a partial vocabulary does not report
        that the vocabulary is partial. It produces something plausible from what it has. The
        failure is silent, it looks like the system being merely mediocre, and by the time anyone
        traces it back to the tier split the adoption decision is already made.
      </p>
      <h2>Where payment lives</h2>
      <p>
        In the engagement. Helix is the credential that makes a design system sprint sellable, and
        the sprint is the thing with a price on it. That keeps the incentive pointed the right way:
        we are paid for applying the system, so making the system easier to apply is aligned with
        revenue rather than opposed to it.
      </p>
      <p>
        Open core is not ruled out forever. It is ruled out for Helix, and kept for a later product
        whose paid layer is not its API surface.
      </p>
    </>
  ),
  'lockstep-per-domain': () => (
    <>
      <p>
        Every package inside a domain shares one version. Domains move independently. Helix goes to
        1.4.0 as a set; Cortex is on whatever number Cortex is on.
      </p>
      <p>
        The obvious alternative is full-repo lockstep, one version for everything, which is simpler
        to explain and simpler to automate. It is wrong here for a specific reason: the docs
        packages carry the version of the thing they document. Publishing a Cortex fix under
        full-repo lockstep would bump <code>@helix-io/docs</code> to a version in which nothing
        about Helix changed, and a reader landing on those docs would be reading a version number
        that describes an unrelated repair to an unrelated product.
      </p>
      <p>
        Per-domain keeps the property that actually matters, which is that{' '}
        <code>@helix-io/headless@x</code> works with <code>@helix-io/web@x</code>. That is the
        guarantee a consumer needs. Everything else about the numbering is bookkeeping.
      </p>
      <h2>The version lives in the tag</h2>
      <p>
        Every manifest in the repository holds <code>0.0.0-dev</code>. The release stamps the real
        number in CI seconds before packing, and never commits it back.
      </p>
      <p>
        Committing it back would require a bot whose push access outranks branch protection, in
        order to record something <code>git tag</code> already holds. The tag is the record.{' '}
        <code>helix-v1.4.0</code> means a release that promoted, and{' '}
        <code>helix-attempt-v1.4.0</code> means a number that was spent and did not, so version
        computation reads both. A failed release burns a number rather than poisoning the next one.
      </p>
      <h2>The split that has not happened yet</h2>
      <p>
        The Rust workspace holds only Cortex crates today, which means{' '}
        <code>[workspace.package] version</code> is the Cortex version by accident of there being
        nothing else in it. The day Helix gains a Rust crate, that has to split, or the two domains
        are silently back in full lockstep with nothing reporting it.
      </p>
      <p>
        Writing this down is most of the mitigation. A constraint that holds because of a current
        absence is not a constraint, it is a coincidence, and coincidences do not survive the commit
        that ends them.
      </p>
    </>
  ),
  'sovereignty-at-every-scale': () => (
    <>
      <p>
        Two things forced a person to depend on an institution: the cost of thinking at scale and
        the cost of power. Both are falling, fast, at the same time. That is the whole thesis, and
        everything else we do is downstream of it.
      </p>
      <p>
        Neither halving is interesting alone. Cheap intelligence without cheap energy is a rented
        capability that runs in somebody else's building. Cheap energy without cheap intelligence is
        a lower utility bill. Together they are the first moment where the full stack a person or an
        organization needs in order to not depend on anyone can actually be owned and run.
      </p>
      <h2>The ladder</h2>
      <p>The same argument runs at three scales, and it is the same stack each time.</p>
      <p>
        <strong>Personal.</strong> Your own keys, your own data, your own hardware. The model runs
        where you put it and the memory it accumulates is a file you hold. Nothing about your
        working life is recoverable by a company that changes its pricing.
      </p>
      <p>
        <strong>Organizational.</strong> The same properties, with more people and an audit trail. A
        company that cannot be held hostage by a vendor's roadmap, because the substrate is one it
        runs and the data is one it holds.
      </p>
      <p>
        <strong>National.</strong> The same properties again, with the stakes that follow from a
        country's capability living on infrastructure it does not control. This rung is a written
        thesis and not a product, and we say so.
      </p>
      <h2>What we are actually building</h2>
      <p>
        Two substrates, and neither is a product you buy. Helix is the design system, the DNA every
        interface is built from. Cortex is memory and provenance, what a system knows and where it
        learned it. Products build on top of them.
      </p>
      <p>
        The reason to start at the substrate rather than at a product is that the sovereignty
        property has to be true all the way down. A sovereign application on a rented substrate is
        not sovereign, it is a nicely worded dependency. Building the bottom first is slower and it
        is the only order that produces the thing we said we would produce.
      </p>
      <p>
        We are one person, and the stages on this site say exactly where each piece is. That is not
        modesty. It is the same honesty the constraint demands, applied to ourselves.
      </p>
    </>
  ),
  'stage-labels-are-honest': () => (
    <>
      <p>Three labels, and they mean what they say.</p>
      <p>
        <strong>Active</strong> ships with users. <strong>Building</strong> is real work with
        nothing shipped. <strong>Declared</strong> is committed direction with no work started.
      </p>
      <p>
        Most of what we have is Building. Two of the four verticals are Declared, which means there
        is a thesis and a name and no code. Both of those appear on the site anyway, with the label
        on them, because a roadmap that shows only the parts going well is a brochure.
      </p>
      <h2>The pressure to soften</h2>
      <p>
        The instinct while pre-launch is to blur this. Call Declared something like Exploring, call
        Building something like Early access, and the map suddenly reads as a company with four
        things in flight rather than two things being built and two things written down.
      </p>
      <p>
        We are not going to, and the reason is not principle for its own sake. Our entire pitch is
        that a user can trust what we hand them and can leave whenever they want. A company that
        will not tell you which of its products exist has already answered the question about
        whether it will tell you anything else.
      </p>
      <p>
        Visible honesty about maturity is a product demonstration. It costs a little credibility
        with someone skimming for momentum and buys the only kind of credibility that matters with
        someone deciding whether to depend on us.
      </p>
      <h2>What it does to the roadmap</h2>
      <p>
        The useful side effect is internal. A stage label that cannot be softened is a label that
        has to be earned, so moving something from Building to Active is a real event with a real
        precondition rather than a decision made in a planning document. It puts a floor under what
        shipping means.
      </p>
    </>
  ),
  'the-sovereignty-constraint': () => (
    <>
      {/* The component, not a bare `<blockquote>`.
          
          The base layer resets a blockquote's margin and themes nothing about
          it under `[data-prose]`, so the passage came out indistinguishable
          from the paragraph after it: the one sentence on the page that is
          quoted law read as ordinary prose. `Blockquote` is the design
          system's answer and sets it on the display face, which is the rule
          that an app reaches for a component rather than a raw tag. */}
      <helix-blockquote>
        No Fusion product may create a dependency its user cannot exit. The user holds their own
        keys, data, and hardware. Fusion may operate a control plane, never a chokepoint.
      </helix-blockquote>
      <p>
        That is the whole rule. It is short because it has to be usable during an argument about a
        feature, and it is a law rather than a value because values lose to quarterly pressure and
        laws do not.
      </p>
      <h2>The test</h2>
      <p>
        Every proposal gets one question:{' '}
        <em>what happens to the user if Fusion shuts down tomorrow?</em> If the answer is that they
        lose the thing, it is not a Fusion product. Not a risky Fusion product, not a Fusion product
        with a migration path on the roadmap. Not one.
      </p>
      <p>
        The test is deliberately brutal because the failure mode it guards against is gradual. Very
        few companies decide to build a chokepoint. They build a convenience, then a second
        convenience that assumes the first, and four years later the export button produces a file
        nothing can read. Each step was reasonable. The test is what makes the first step visible.
      </p>
      <h2>What it forecloses</h2>
      <p>
        This is expensive and we should say what it costs rather than presenting it as free
        principle. The constraint rules out lock-in, data moats, and usage rent. Those are not
        marginal business models, they are most of the good ones in software.
      </p>
      <p>
        What is left, and what we have actually committed to: services now, which is the only thing
        that pays this year. A hosted control plane later, sold as convenience and never as
        dependency. Hardware margin eventually, which is the one model fully native to sovereignty,
        because you sell it and they own it.
      </p>
      <p>
        A control plane is allowed and a chokepoint is not, and the line between them is exactly the
        exit test. If our control plane goes dark and your system keeps running on your hardware
        with your keys, it was a control plane. If it goes dark and you are stopped, it was never
        the thing we said it was.
      </p>
      <h2>Why write it down</h2>
      <p>
        Because a constraint that lives in someone's head is a preference. Written down, with a test
        attached, it survives the meeting where it is inconvenient, which is the only meeting where
        it does any work.
      </p>
    </>
  ),
}
