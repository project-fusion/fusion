/**
 * Every page's MDX, inlined by `bun run content`. Do not edit: the files in
 * `content/` are the source, and `bun run check:content` fails when this
 * module and they disagree.
 */
export const sitePageSources: Record<string, string> = {
  'a-palette-from-one-brand-color': `---
author: Ross Sheppard
date: 2026-08-11
description: A spreadsheet of hexes is a set of decisions nobody can check. Deriving the palette makes contrast a property of the system rather than a review step.
kicker: Insights
kind: Essay
path: /insights/a-palette-from-one-brand-color
title: A palette from one brand color
topic: Design
---

Most design systems ship a palette as a spreadsheet: eleven steps of grey,
eleven of the brand, a handful of status colors, each one a hex somebody picked
and nobody can check. The file is authoritative because it is the file, not
because anything about it is true.

The problem is not that the numbers are wrong. It is that there is no procedure
by which they could be found wrong. A contrast failure in step 400 against step
50 is discovered by a person running an audit, at which point the fix is a new
hex, which is another number nobody can check. Accessibility becomes a review
step that happens after the design, and review steps get skipped under deadline.

## Deriving instead

Helix takes one brand color and computes the rest. Every step is a
transformation in a perceptual color space, so lightness means the same thing at
every hue, and the contrast between any two steps is a consequence of how far
apart they are rather than a coincidence somebody has to verify.

What that buys is not a prettier palette. It is that the palette cannot drift. A
designer who wants a warmer brand changes one value and the whole system moves
with it, still accessible, because accessibility was never a property of the
individual hexes. It was a property of the derivation.

The second thing it buys is smaller and matters more day to day: there is
nothing to choose. A component asks for \`--helix-color-foreground-muted\` and
gets the right value in light mode, dark mode, and against whatever brand the
consumer set. Consistency stops being a thing the team maintains and becomes a
thing the system cannot avoid.

## The cost

Derivation is worse than hand-picking at exactly one job, which is hitting a
specific color a brand guideline names. If your brand book says the disabled
state is this grey and no other, a derived system will fight you. We think that
trade is correct for a design system and would not be correct for a brand
identity, which is a different artifact with a different purpose.
`,
  'helix-ships-as-one-open-tier': `---
author: Ross Sheppard
date: 2026-08-18
description: No pro components and no paywalled API surface. The architectural reason is stronger than the economic one.
kicker: Insights
kind: Decision
path: /insights/helix-ships-as-one-open-tier
title: Helix ships as one open tier
topic: Design
---

Decided 18 August 2026. Helix ships as one open tier: no pro components, no
paywalled API surface, no enterprise build with three extra things in it.

The economic argument for a paid tier is real and we are not pretending
otherwise. The free-versus-pro component libraries monetize the two or three
components a team cannot afford to build, sold across a distribution base large
enough that a low conversion rate is still real money. Helix has neither the
components nor the base, and acquiring both is a different company than this
one.

## The architectural reason is stronger

Under cheap generation, a design system's value is being the constraint that
generated interface code converges on. One vocabulary of names, tokens, and
types, legible to whatever is writing against it. That mechanism is the whole
asset.

A paywalled component is a component those agents do not know about. Split the
API surface and you have not created a revenue line with a small cost attached:
you have damaged the thing that makes the system worth adopting at all. The
generated code routes around the paid components, badly, using the free ones,
and the output is worse than if the paid ones had never existed.

There is a version of this that only bites at scale, and it is worth being
precise about why we think it bites immediately. An agent writing against a
partial vocabulary does not report that the vocabulary is partial. It produces
something plausible from what it has. The failure is silent, it looks like the
system being merely mediocre, and by the time anyone traces it back to the tier
split the adoption decision is already made.

## Where payment lives

In the engagement. Helix is the credential that makes a design system sprint
sellable, and the sprint is the thing with a price on it. That keeps the
incentive pointed the right way: we are paid for applying the system, so making
the system easier to apply is aligned with revenue rather than opposed to it.

Open core is not ruled out forever. It is ruled out for Helix, and kept for a
later product whose paid layer is not its API surface.
`,
  'lockstep-per-domain': `---
author: Ross Sheppard
date: 2026-07-14
description: Full-repo lockstep would publish a Cortex fix as a new version of the Helix docs. Per-domain keeps the only property that matters.
kicker: Insights
kind: Decision
path: /insights/lockstep-per-domain
title: Lockstep versioning, one domain at a time
topic: Engineering
---

Every package inside a domain shares one version. Domains move independently.
Helix goes to 1.4.0 as a set; Cortex is on whatever number Cortex is on.

The obvious alternative is full-repo lockstep, one version for everything, which
is simpler to explain and simpler to automate. It is wrong here for a specific
reason: the docs packages carry the version of the thing they document.
Publishing a Cortex fix under full-repo lockstep would bump \`@helix-io/docs\` to
a version in which nothing about Helix changed, and a reader landing on those
docs would be reading a version number that describes an unrelated repair to an
unrelated product.

Per-domain keeps the property that actually matters, which is that
\`@helix-io/headless@x\` works with \`@helix-io/web@x\`. That is the guarantee a
consumer needs. Everything else about the numbering is bookkeeping.

## The version lives in the tag

Every manifest in the repository holds \`0.0.0-dev\`. The release stamps the real
number in CI seconds before packing, and never commits it back.

Committing it back would require a bot whose push access outranks branch
protection, in order to record something \`git tag\` already holds. The tag is the
record. \`helix-v1.4.0\` means a release that promoted, and \`helix-attempt-v1.4.0\`
means a number that was spent and did not, so version computation reads both. A
failed release burns a number rather than poisoning the next one.

## The split that has not happened yet

The Rust workspace holds only Cortex crates today, which means
\`[workspace.package] version\` is the Cortex version by accident of there being
nothing else in it. The day Helix gains a Rust crate, that has to split, or the
two domains are silently back in full lockstep with nothing reporting it.

Writing this down is most of the mitigation. A constraint that holds because of
a current absence is not a constraint, it is a coincidence, and coincidences do
not survive the commit that ends them.
`,
  services: `---
appends: services
description: What we take on, and what it costs.
kicker: Services
lede: 'Everything else on this site is being built. This is the work we take on now: interface and intelligence work the substrates make faster to do well. Three offers, in the order they usually happen. Most start with the audit, which is two weeks at a fixed price, and the rest is scoped from what it finds.'
path: /services
title: The part of this you can buy today
---

## You are not acquiring a dependency

Your repository, your license, your infrastructure. Handover is a condition of
the work rather than a phase at the end of it, and the architecture decisions
are written down with their trade-offs rather than just made. If an engagement
would leave you unable to continue without us on a retainer, it is not one we
will take.

## Start with the audit

Two weeks and a fixed price, and the honest answer at the end of it may be that
you do not need the larger engagement. Say plainly what you are trying to do and
we will tell you whether we are the right people.
`,
  'sovereignty-at-every-scale': `---
author: Ross Sheppard
date: 2026-06-16
description: Cheap intelligence and cheap energy are arriving together. That pairing is what moves sovereignty from a principle you agree with to a thing you can run.
kicker: Insights
kind: Essay
path: /insights/sovereignty-at-every-scale
title: Sovereignty at every scale
topic: Sovereignty
---

Two things forced a person to depend on an institution: the cost of thinking at
scale and the cost of power. Both are falling, fast, at the same time. That is
the whole thesis, and everything else we do is downstream of it.

Neither halving is interesting alone. Cheap intelligence without cheap energy is
a rented capability that runs in somebody else's building. Cheap energy without
cheap intelligence is a lower utility bill. Together they are the first moment
where the full stack a person or an organization needs in order to not depend on
anyone can actually be owned and run.

## The ladder

The same argument runs at three scales, and it is the same stack each time.

**Personal.** Your own keys, your own data, your own hardware. The model runs
where you put it and the memory it accumulates is a file you hold. Nothing about
your working life is recoverable by a company that changes its pricing.

**Organizational.** The same properties, with more people and an audit trail. A
company that cannot be held hostage by a vendor's roadmap, because the substrate
is one it runs and the data is one it holds.

**National.** The same properties again, with the stakes that follow from a
country's capability living on infrastructure it does not control. This rung is
a written thesis and not a product, and we say so.

## What we are actually building

Two substrates, and neither is a product you buy. Helix is the design system,
the DNA every interface is built from. Cortex is memory and provenance, what a
system knows and where it learned it. Products build on top of them.

The reason to start at the substrate rather than at a product is that the
sovereignty property has to be true all the way down. A sovereign application on
a rented substrate is not sovereign, it is a nicely worded dependency. Building
the bottom first is slower and it is the only order that produces the thing we
said we would produce.

We are one person, and the stages on this site say exactly where each piece is.
That is not modesty. It is the same honesty the constraint demands, applied to
ourselves.
`,
  'stage-labels-are-honest': `---
author: Ross Sheppard
date: 2026-07-29
description: Active ships with users. Building is real work with nothing shipped. Declared is committed direction with no work started. Why we refuse to soften them.
kicker: Insights
kind: Note
path: /insights/stage-labels-are-honest
title: Stage labels are honest
topic: Business
---

Three labels, and they mean what they say.

**Active** ships with users. **Building** is real work with nothing shipped.
**Declared** is committed direction with no work started.

Most of what we have is Building. Two of the four verticals are Declared, which
means there is a thesis and a name and no code. Both of those appear on the site
anyway, with the label on them, because a roadmap that shows only the parts
going well is a brochure.

## The pressure to soften

The instinct while pre-launch is to blur this. Call Declared something like
Exploring, call Building something like Early access, and the map suddenly reads
as a company with four things in flight rather than two things being built and
two things written down.

We are not going to, and the reason is not principle for its own sake. Our
entire pitch is that a user can trust what we hand them and can leave whenever
they want. A company that will not tell you which of its products exist has
already answered the question about whether it will tell you anything else.

Visible honesty about maturity is a product demonstration. It costs a little
credibility with someone skimming for momentum and buys the only kind of
credibility that matters with someone deciding whether to depend on us.

## What it does to the roadmap

The useful side effect is internal. A stage label that cannot be softened is a
label that has to be earned, so moving something from Building to Active is a
real event with a real precondition rather than a decision made in a planning
document. It puts a floor under what shipping means.
`,
  'the-sovereignty-constraint': `---
author: Ross Sheppard
date: 2026-06-30
description: No Fusion product may create a dependency its user cannot exit. One sentence, and it forecloses most of the business models available to us.
kicker: Insights
kind: Essay
path: /insights/the-sovereignty-constraint
title: The Sovereignty Constraint
topic: Sovereignty
---

> No Fusion product may create a dependency its user cannot exit. The user holds their own keys, data, and hardware. Fusion may operate a control plane, never a chokepoint.

That is the whole rule. It is short because it has to be usable during an
argument about a feature, and it is a law rather than a value because values
lose to quarterly pressure and laws do not.

## The test

Every proposal gets one question: *what happens to the user if Fusion shuts down
tomorrow?* If the answer is that they lose the thing, it is not a Fusion
product. Not a risky Fusion product, not a Fusion product with a migration path
on the roadmap. Not one.

The test is deliberately brutal because the failure mode it guards against is
gradual. Very few companies decide to build a chokepoint. They build a
convenience, then a second convenience that assumes the first, and four years
later the export button produces a file nothing can read. Each step was
reasonable. The test is what makes the first step visible.

## What it forecloses

This is expensive and we should say what it costs rather than presenting it as
free principle. The constraint rules out lock-in, data moats, and usage rent.
Those are not marginal business models, they are most of the good ones in
software.

What is left, and what we have actually committed to: services now, which is the
only thing that pays this year. A hosted control plane later, sold as
convenience and never as dependency. Hardware margin eventually, which is the
one model fully native to sovereignty, because you sell it and they own it.

A control plane is allowed and a chokepoint is not, and the line between them is
exactly the exit test. If our control plane goes dark and your system keeps
running on your hardware with your keys, it was a control plane. If it goes dark
and you are stopped, it was never the thing we said it was.

## Why write it down

Because a constraint that lives in someone's head is a preference. Written down,
with a test attached, it survives the meeting where it is inconvenient, which is
the only meeting where it does any work.
`,
  thesis: `---
description: Sovereignty at every scale, and the mechanism that makes it practical.
kicker: Thesis
path: /thesis
title: Sovereignty is the goal. Abundance is the mechanism.
---

Cheap intelligence and cheap energy are collapsing in cost at the same moment.
That is not primarily a productivity story. The two things that historically
forced a person or a nation to depend on a larger institution were the cost of
thinking at scale and the cost of power, and both are falling.

## What makes anything sovereign, at any scale

Derived rather than invented. Each layer is something a subject either controls
or rents.

| Layer | Sovereign over |
| --- | --- |
| [Interface](/helix) | the tools you build with |
| [Cognitive](/cortex) | your intelligence, memory and reasoning |
| [Informational](/cortex) | your records and where they came from |
| [Energy](/energy) | your own power |
| [Financial](/capital) | your own capital |

Energy is the missing floor, and every layer above it presumes power. It is
also why the company is called Fusion: fuel from seawater, no import, no cartel,
no grid dependency. The name states the destination rather than the position.

## One stack, shipped to progressively larger subjects

### Personal

Own your mind, your keys and your power. The model runs where you put it and
the memory it accumulates is a file you hold. The subject is the individual.

### Organizational

Operate without platform dependence. A company that cannot be held hostage by a
vendor roadmap, because it runs the substrate and holds the data. The subject is
a company or a community.

### National

Energy independence and institutional capability. A state that generates its own
power and runs its own intelligence has different options than one that does
not. The subject is the state.

This is the growth path and the go-to-market sequence at once. It is not seven
unrelated markets: it is one stack and one architectural commitment, sold to a
larger subject each time.

## Why it is a law and not a value

**No Fusion product may create a dependency its user cannot exit.**

The user holds their own keys, data and hardware. Fusion may operate a control
plane, never a chokepoint. Every product must be able to keep working if Fusion
disappears.

The cost is real and worth stating plainly: it forecloses the highest margin
patterns in software, which are lock-in, the data moat and usage rent. What is
left is services now, a hosted control plane sold as convenience later, and
hardware margin eventually, which is the one model fully native to sovereignty
because you sell it and they own it.

### It is testable

For any proposal: what happens to the user if Fusion shuts down tomorrow? If the
answer is that they lose the thing, it is not a Fusion product. That single
question is a real filter on breadth.

### It is the only defensible one

Model quality is rented and commoditising. An architectural commitment
competitors structurally cannot copy, because their business model requires the
chokepoint, is not.

### It makes the verticals cohere

Energy, capital and cognition are obviously the same company under this
constraint. Without it they are a conglomerate.
`,
  trust: `---
description: The finite checklist every Fusion product clears before it ships, and an honest account of what has been tested so far.
kicker: Trust
path: /trust
title: What has to be true before anything ships
---

Six things. The number matters more than the contents: a bar that is never
written down can be raised forever, and a company that keeps raising one never
launches. Counted and published, it becomes something that can actually be met,
and something you can hold us to.

## The exit test, answered in writing

A written answer to the question every proposal is tested against: what happens
to you if Fusion shuts down tomorrow. Published with the product rather than
available on request.

## Data handling stated before collection

What is stored, where it lives, how long it is kept and what causes it to be
deleted. Stated before a product collects anything, not in a policy revised
afterwards.

## Keys held by you

Yours, generated where you are, never escrowed. A product that can read your
data without your key is a product that can be compelled to.

## A stop that leaves you whole

You can stop it and keep everything. Not an account closure that starts a
countdown, and not an export that produces a file nothing else can read.

## Outside review where the stakes are real

Anything touching credentials, money or another person's records is reviewed by
someone who does not work here before it ships. Named in the release, not
asserted.

## The stage label is the true one

Active means it ships with users. Building means real work with nothing shipped.
Declared means committed direction with no work started. No product is described
as further along than it is.

## None of it has been tested, because nothing has shipped

Helix is Building and Cortex is Building, which means there is no product yet
that has had to clear this list. Publishing the bar before there is anything to
hold against it is the point: written first, it is a commitment. Written
afterwards, it is a description of whatever we happened to do.

If something we ship does not clear one of these, that is worth telling us
about, and the list is short enough that the check is a real one.
`,
}
