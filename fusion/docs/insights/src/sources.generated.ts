/**
 * Every page's MDX, inlined by `turbo run content`. Do not edit: the files in
 * `content/` are the source, and `turbo run content -- --check` fails when this
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

Most design systems ship a palette as a spreadsheet: eleven steps of gray,
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
state is this gray and no other, a derived system will fight you. We think that
trade is correct for a design system and would not be correct for a brand
identity, which is a different artifact with a different purpose.
`,
  'acceptable-use': `---
description: What the sandbox will run, what it will not, and why the limits are so few.
kicker: Acceptable use
path: /acceptable-use
title: What you may run here
---

Last updated 26 August 2026. This covers \`/helix/sandbox\` and \`/helix/theme\`,
the two pages that execute code you write. It is short because the architecture
does most of the work that a policy would otherwise have to do in words.

## Your code does not run on our machine

The sandbox renders inside an iframe declared \`sandbox="allow-scripts
allow-forms"\` with \`allow-same-origin\` deliberately absent. Your code runs in
your browser against an opaque origin: it cannot read our storage, cannot call
our origin, and cannot reach anything of ours. Nothing you type is sent to a
server, which is why there is no submission to moderate and no stored artifact to
remove.

So most of what an acceptable use policy usually forbids is not forbidden here,
it is unreachable. We are not being generous. There is nothing to be generous
with.

## What is actually prohibited

Three things, and each one is a case the architecture does not already answer:

- **Do not use these pages to attack anyone**, including us. Scanning, probing,
  or using the frame as a step toward reaching some other system is out, however
  little of it can work.
- **Do not automate them at a scale that degrades them for other people.** The
  documentation is published as plain markdown beside every page and as
  \`llms.txt\`; that path is cheaper for you and for us than driving a browser.
- **Do not hold this out as yours.** Do not present the sandbox, or output from
  it, as a Fusion endorsement, and do not imply we reviewed something we have
  never seen.

## What we ask rather than require

**Do not paste a secret into the sandbox.** Not because we would read it, but
because you have no reason to take our word for that, and the habit is worth
keeping whatever the page. An API key in a code sample is a key in your clipboard
history, your browser session, and any screenshot you take afterwards.

## What we may do

We may change or withdraw either page at any time, and we may rate-limit or block
traffic that is degrading the site. There is no account to suspend and no content
to take down, so those are the only levers, and they are aimed at load rather
than at authorship.

## If this ever becomes hosting

Everything above holds because the sandbox is a page rather than a service. **If
Fusion ever runs the sandbox on someone else's behalf, storing their code or
executing it server-side, that is a different arrangement and it will need a
different policy**, along with terms about retention, deletion and the law that
applies to what is stored. Saying so now is cheaper than discovering it later.

## Reaching us

Anything here, or a report of abuse, goes to the address on the
[contact](/contact) page.
`,
  announcements: `---
description: Helix is the first thing Fusion ships, and this is what it is.
kicker: Announcements
lede: Helix is first. It is a design system that ships as custom elements, and it is close.
path: /announcements
title: Helix is what comes first
---

Fusion is five layers, and the top one is the only one anybody can use today.
So that is the one being finished first: the interface layer, shipped as a
design system rather than as a framework, because a design system is the part
of an interface that a company can actually own.

## What it is

Every component is a custom element. Not a React component with a wrapper
generated for other frameworks, and not a set of primitives a team assembles
into components themselves. The element is the artifact, and React, Vue and
Svelte consume the same one.

It arrives in two tiers. The headless tier is behavior with no stylesheet at
all: state, focus, keyboard, form participation, the accessibility contract.
The styled tier is those components with a derived visual system on top. A team
that needs different pixels drops a tier rather than copying a file, which is
the difference between a fork with a supported destination and a fork nobody is
assigned to.

## What you get out of it

One brand color goes in and a full palette comes out, and the engine refuses a
palette it cannot make readable. Contrast stops being an audit somebody
schedules and becomes a property of the derivation.

Every tag, property and event is in one manifest at a URL, and every page
answers as Markdown. That was built for agents before it was fashionable to say
so: the document a model reads is the document a person reads, and there is no
second, worse copy of the API written for either of them.

It is MIT, in your repository, and it runs whether or not we are still
involved. That is the whole of the exit test and it is not a marketing line: if
the answer were no, it would not be a Fusion product.

## What we do around it

Three offers, in the order they usually happen. An audit, two weeks at a fixed
price, to find out what is worth building at all. A design system sprint, which
is Helix applied to your product and shipped into your repository rather than
drawn in a design tool. And a build, for work whose shape is still moving,
which is most of the work worth doing.

[What each one involves](/services) is written out, including what you keep at
the end of it.

## What comes after

Cortex, which is the layer under this one: memory and provenance, so what a
company knows is an asset it holds rather than something rented back to it a
quarter at a time. It is real work with nothing shipped, and it will appear here
when that stops being true.

Nothing on this page is a forecast.
`,
  'exit-cost-belongs-on-the-balance-sheet': `---
author: Ross Sheppard
date: 2026-06-30
description: Procurement prices the entry and ignores the exit. The exit is usually the larger number, and it is why the renewal was never a negotiation.
kicker: Insights
kind: Essay
path: /insights/exit-cost-belongs-on-the-balance-sheet
title: Exit cost belongs on the balance sheet
topic: Business
---

A three-year total cost model for enterprise software has a line for licenses,
a line for implementation, a line for training and a line for support. It has
no line for what it costs to stop.

That number exists. It is usually larger than the licenses, it grows every
quarter without being reviewed, and it is the reason the renewal conversation
was never a negotiation. Both sides knew it. Only one side had it written down.

## Nobody buys lock-in

This is the part worth being careful about, because the vendor is usually not
the villain of the story and treating them as one produces the wrong control.

A company buys a convenience. Then a second convenience that assumes the first.
Then an integration, because the integration is obviously correct and takes a
week. Four years later the export button produces a file that nothing else can
read, and no individual step in that sequence was unreasonable. Each was
approved by someone competent, on the merits, at the time.

The cost accrued between the decisions rather than in them, which is why no
governance process catches it. Governance reviews decisions.

## Three mechanisms, worth naming separately

**Format.** The data is exportable, and the export is a shape only the vendor's
software consumes. This is the mechanism people expect, and it is the mildest
of the three, because a determined engineering team can usually parse anything.

**Behavior.** The organization's processes have taken the shape of the tool.
The approval flow exists because the tool has approvals. The team is organized
around the tool's object model. Leaving is not a migration, it is a
reorganization, and it is priced accordingly by everyone who would have to live
through it.

**Position.** The tool sits between the company and other things. It holds the
identity, or the routing, or the integration surface everything else was
plumbed into. The migration is not one project. It is forty, run concurrently,
by teams whose roadmaps were committed elsewhere.

Format is the one that gets asked about in procurement. The other two are the
ones that actually hold.

## Why intelligence makes this sharper

The per-seat charge for artificial intelligence is being added, in most cases,
to software the company already licensed, already deployed and already built
its processes around. The switching cost was paid years ago, by someone who has
since left.

Repricing against a base that cannot leave is not a hypothetical risk. It is
the observed behavior of the market over the last two years, applied by
companies with entirely conventional obligations to their shareholders. It
would be strange if they did anything else.

The relevant question for a buyer is therefore not whether a vendor intends to
do this. It is what happens if they do.

## Contracts are the wrong instrument

The usual response is a better contract: price protection, an exit clause, a
data portability commitment, an escrow arrangement. These are worth having and
they do not solve the problem, because a contract prices a risk rather than
removing one. The clause is enforceable against a company that still exists,
still cares, and has not been acquired by someone who does not.

The control that works is architectural. Buy things whose failure mode is that
you keep running. Then the exit clause is a formality rather than the only
thing standing between the company and a very bad quarter.

## The one-question test

For any system under evaluation: *what happens to us if this vendor shuts down
tomorrow?*

If the answer is that operations degrade and something has to be replaced on a
schedule, that is a tool, and tools are fine. If the answer is that the company
loses the thing, that is a dependency, and it should be priced, minuted and
reviewed as one, whatever the sales process called it.

We hold ourselves to the same question, in the inverted form, and it is written
down as a rule rather than a value because values lose to quarterly pressure
and rules do not:

> No Fusion product may create a dependency its user cannot exit. The user
> holds their own keys, data and hardware. Fusion may operate a control plane,
> never a chokepoint.

What that forecloses for us is worth stating rather than presenting as free
principle. It rules out lock-in, the data moat and usage rent, which are not
marginal business models. They are most of the good ones in software. What is
left is services now, a hosted control plane later sold as convenience, and
hardware margin eventually, which is the one model fully native to sovereignty,
because you sell it and they own it.

The line between a control plane and a chokepoint is exactly the test above. If
ours goes dark and your system keeps running on your hardware with your keys,
it was a control plane. If it goes dark and you are stopped, it was never the
thing we said it was.
`,
  'generated-code-needs-somewhere-to-land': `---
author: Ross Sheppard
date: 2026-08-11
description: Writing a component stopped being the expensive part. Converging on one way to write it is now the whole problem, and a design system is the only artifact that solves it.
kicker: Insights
kind: Essay
path: /insights/generated-code-needs-somewhere-to-land
title: Generated code needs somewhere to land
topic: Intelligence
---

The cost of producing interface code has collapsed. The cost of agreeing on
what it should look like has not moved at all. Most of what an enterprise is
currently experiencing as an artificial intelligence problem is that ratio
changing by an order of magnitude while nothing downstream of it changed.

## A model writes what the codebase makes plausible

This is the mechanism, and it is worth being precise about, because it is
usually described as a quality problem and it is not one.

A model generating a component reads the surrounding code and produces
something consistent with it. It has no preference of its own to impose. If a
repository contains four ways to build a form, the output is a fifth way that
resembles all four. If a repository contains one way, the output is that way.

The variance this produces is not random noise, which would be easy to catch.
It is plausible. Every individual diff is defensible on its own terms, written
in the local idiom, passing the tests it came with. It survives review because
there is nothing in it to object to. It accumulates because there is nothing
in it to object to.

An organization that could previously absorb its own drift, because drift
arrived at the rate people could type, is now receiving it at the rate the
budget allows.

## What that does to the value of a design system

The old argument for a design system was labor. It saves each team from writing
a button, a dialog, a date picker. That argument is now close to worthless,
because writing a button is close to free, and a system justified on those
grounds is being outcompeted daily by generation.

The remaining argument is much stronger and it is a different argument. A
design system is a constraint. It is a named, finite vocabulary that generated
code can converge on, and convergence is the only property that is now scarce.

Put another way: the design system has stopped being a productivity tool for
people and become something closer to a type system for interface decisions.
Its job is to make one output the obvious one and the alternatives visibly
wrong.

## Three things that follow, and most systems fail all three

**The vocabulary has to be complete.** A model writing against a partial
vocabulary does not report that it is partial. It produces something plausible
out of what it has, using the wrong primitive competently. The failure is
silent and it reads as the system being mediocre. This is the whole reason
Helix ships as one open tier: a paywalled component is a component the
generation does not know exists, and the code routes around it badly.

**It has to be legible without a person reading it.** Documentation written for
onboarding is a different artifact from a manifest something can consume. Prose
explaining when to use a card is not a machine-readable statement that a card
takes these props, in these combinations, with these tokens. Both are worth
having. Only one of them constrains anything.

**It has to be checkable.** Convergence you cannot measure is convergence you
are asserting. If nothing in the build can say that a stylesheet reached past a
component's declared surface, or that a hardcoded hex appeared where a token
belongs, then the constraint is a convention, and a convention under generation
pressure is a suggestion.

## The uncomfortable arithmetic

Most enterprises let their design system decay over the last several years for
entirely reasonable reasons. It was expensive, its return was diffuse, and the
teams that used it were producing acceptable interfaces without it.

That decay was affordable when the system's job was saving keystrokes. It is
not affordable now that the system's job is being the thing generated code
converges on, because the alternative to convergence is not slower delivery. It
is a codebase that grows a new dialect every sprint, each of them defensible,
none of them removable.

The thing worth buying or building is no longer a component library. It is a
vocabulary with a check attached.
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
Publishing a Cortex fix under full-repo lockstep would bump \`@fusion.dev/helix-docs\` to
a version in which nothing about Helix changed, and a reader landing on those
docs would be reading a version number that describes an unrelated repair to an
unrelated product.

Per-domain keeps the property that actually matters, which is that
\`@fusion.dev/helix-headless@x\` works with \`@fusion.dev/helix@x\`. That is the guarantee a
consumer needs. Everything else about the numbering is bookkeeping.

## The version lives in the tag

Every manifest in the repository holds \`0.0.0-dev\`. The release stamps the real
number in CI seconds before packing, and never commits it back.

Committing it back would require a bot whose push access outranks branch
protection, in order to record something \`git tag\` already holds. The tag is the
record. \`helix-v1.4.0\` means a release that promoted, and \`helix-attempt-v1.4.0\`
means a number that was spent and did not, so version computation reads both. A
failed release burns a number rather than poisoning the next one.

## The split that has now happened

The Rust workspace held only Cortex crates, so \`[workspace.package] version\`
was the Cortex version by accident of there being nothing else in it, and the
day Helix gained a Rust crate the two domains would have been silently back in
full lockstep.

Helix has two Rust crates now, and the field is gone. \`[workspace.package]\`
keeps the edition, the license and the toolchain floor, which are facts about
the workspace; each crate declares its own \`0.0.0-dev\`, which is a fact about a
domain. Three identical lines whose whole purpose is to be able to differ, and a
check that fails both on a crate inheriting a version and on the workspace
declaring one at all.

The split was made ahead of the crate rather than with it, which is the order
worth keeping: a constraint that holds because of a current absence is not a
constraint, it is a coincidence, and coincidences do not survive the commit that
ends them.
`,
  privacy: `---
description: Three preference keys, no cookies, no analytics, and nothing that identifies you.
kicker: Privacy
path: /privacy
title: What this site stores, which is almost nothing
---

Last updated 26 August 2026. This is short because there is little to describe,
and it describes what the site actually does rather than reserving rights we do
not exercise.

## We collect nothing you type

There is no form anywhere on this site. The [contact](/contact) page is a
\`mailto:\` link, so writing to us opens your own mail client and the message
travels from you to us without passing through anything of ours. Nothing you
type into the site reaches us, because there is no path for it to take.

The sandbox is the same story from the other direction: the code you write there
runs in your browser against an opaque origin and is never sent to a server. See
the [terms](/terms) for how that is built.

## Three keys in local storage, all of them preferences

The site writes three values to your browser's local storage:

| Key | What it holds |
| --- | --- |
| \`fusion-color-mode\` | Whether you chose light or dark |
| \`fusion-api-tier\` | Whether you prefer the styled or headless API tables |
| \`fusion-sandbox-arrangement\` | How you left the sandbox panes arranged |

That is the complete list. None of them identifies you, none is sent anywhere,
and all three are readable and deletable by you in your browser's developer
tools. Clearing site data removes them and costs you nothing but the three
choices.

**No cookies. No session storage. No analytics.** There is no tracking script on
this site, first-party or third-party, and no pixel, tag manager, or advertising
identifier. We do not know how many of you there are.

## What our host sees

The site is served by a hosting provider, and like every web server theirs
records requests: an IP address, a URL, a user agent, a timestamp. We do not use
those logs to build a profile and we have not turned on any product that would.
This is worth stating rather than omitting, because "we collect nothing" would be
a claim about somebody else's infrastructure that we are not in a position to
make.

Fonts are served from this site rather than from a font CDN, so loading a page
does not tell a third party that you did.

## Why the policy is this short

The Sovereignty Constraint is the company's stated test: no Fusion product may
create a dependency its user cannot exit. A company whose test is what happens to
you if Fusion disappears tomorrow cannot ship a policy claiming the right to hold
what it does not hold. If the answer is *nothing happens, you keep everything*,
the policy has to be short enough to prove it.

If that changes, this page changes with it, and the previous wording stays in the
repository's history.

## Reaching us

Questions, or a request to remove something, go to the address on the
[contact](/contact) page.
`,
  services: `---
appends: services
description: The interface and intelligence work we take on now, and what you have at the end of it.
kicker: Services
lede: Most start with the audit, which is two weeks at a fixed price, and the rest is scoped from what it finds.
path: /services
title: The work we take on now
---

## What you have at the end

Working software in your repository, under your license, running whether or not
we are still involved. The architecture decisions are written down with their
trade-offs, so the next person to touch it can see why it is shaped the way it
is rather than guessing.

Handover is part of the work rather than a phase bolted on at the end of it. You
get the code, the reasoning and the ability to keep going.

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
  terms: `---
description: What we offer, what we do not, and the one clause the sandbox makes specific.
kicker: Terms
path: /terms
title: Terms of use
---

Last updated 26 August 2026. These terms cover this website. They do not cover
the software: every package Fusion publishes is MIT licensed, and the \`LICENSE\`
file in the repository is the whole of that agreement.

## The site is documentation, offered as-is

Everything here is reference material and writing. We make no promise that it is
complete, current, or correct, and nothing on the site is advice you should act
on without checking it. If a page and the code disagree, the code is right.

We may change or remove any of it at any time. Nothing here is an offer, and
reading it creates no relationship between us. Engagement terms for paid work
are agreed separately and in writing.

## The sandbox runs your code, not ours

\`/helix/sandbox\` and \`/helix/theme\` execute whatever you type into them. This is
the clause worth stating precisely rather than disclaiming in general terms,
because how it is built is the substance of it.

Your code runs inside an iframe declared \`sandbox="allow-scripts allow-forms"\`.
\`allow-same-origin\` is deliberately absent, so the document runs against an
opaque origin: it cannot read our cookies or storage, cannot call our origin, and
cannot reach anything of ours. It is your code in your browser.

Two consequences follow, and they run in both directions. We do not receive what
you type: the source you edit is never sent to a server, so we could not keep it
if we wanted to and do not. And we are not responsible for what your code does
in your own browser. Do not paste a secret into it, for the same reason you would
not paste one into a browser console: it is not that we would read it, it is that
you have no reason to take our word for that.

## What you may not do

Do not use the site to attack it or anyone else, to break the law, or to
misrepresent yourself as us. Do not scrape it in a way that degrades it for other
people; the documentation is also published as plain markdown beside every page
and as \`llms.txt\`, which is the cheaper path for both of us.

## Liability, in the terms we can honestly offer

We provide the site without warranties of any kind. To the extent the law allows,
Fusion Development Group is not liable for loss arising from your use of it. We
are a small company; this is the limit we can honestly stand behind rather than
the largest one a template would reserve.

## Governing law, and changing these terms

These terms are governed by the law of the State of Delaware, United States. If
we change them, the date at the top changes, and the previous wording stays in
the repository's history where anyone can read it.

## Reaching us

Questions about these terms go to the address on the [contact](/contact) page.
`,
  'the-design-system-you-already-paid-for': `---
author: Ross Sheppard
date: 2026-08-25
description: A platform team, a component library, eighteen months and a launch. Then adoption stalls, and nobody can name the quarter it died.
kicker: Insights
kind: Essay
path: /insights/the-design-system-you-already-paid-for
title: The design system you already paid for
topic: Business
---

Almost every company past a few hundred engineers has built a design system.
There was a platform team, a Figma library, a published component package, a
governance forum, and eighteen months of work. It launched. There was a deck.

Then, over the two years that followed, it stopped being the thing interfaces
were actually built from, and nobody can name the quarter that happened. The
package is still installed. The team is still funded, or was until the last
reorganization. What is on screen is something else.

## The number being reported is not adoption

The reported number is coverage: how many components the system publishes,
sometimes weighted by how many repositories install it. Coverage is a fact
about the platform team's output. It says nothing about what a user sees.

The number that matters is what share of a shipped interface is built out of
the system without local overrides. That number is always lower, often by a
lot, and the gap is not a reporting failure. The two measure different things,
and only one of them is the asset the company thinks it bought.

## Three parallel truths

A mature system usually exists three times over. There is the Figma library,
which the design organization maintains and treats as authoritative. There is
the published package, which the platform team maintains and treats as
authoritative. There is the code running in the products, which nobody
maintains as a whole and which is the only one of the three that users
encounter.

Each is correct according to the group that owns it. None of them agree.
Reconciling them is a project proposed every planning cycle and funded
approximately never, because it has a large number attached and no
user-visible outcome to defend it with.

## The fork is a rational decision

A product team is two weeks from a launch. The system's table component does
not pin columns. The platform team's intake queue is six weeks deep and the
request will be ranked against nine others.

Copying the component into the product repository takes an afternoon. Every
incentive in the organization points at the afternoon. The copy ships, the date
is met, and the company now owns a component nobody is assigned to, that will
not receive the accessibility fix landing upstream next month, and that no
audit will find, because it looks exactly like the thing it was copied from.

This is not a discipline problem, and treating it as one is why the usual
remedy fails. A review board raises the cost of compliance without touching the
cost of the fork. It widens the gap it was convened to close.

## Then the system freezes

The other half of the failure happens on the consumer side. An application
needs a variant the system does not offer, so it writes a rule that reaches
past the component's surface into its internals: a descendant selector, or a
class name that was never promised to anyone.

Multiply that by forty applications over three years. The system can no longer
change, because any internal change breaks consumers in ways its own tests
cannot see. Deprecations stop being issued. The major version stops being cut.
The artifact built to make change cheap has become the reason change is
expensive.

The failure is invisible from outside. Install counts are high, the pipeline is
green, and nothing is on fire.

## The diagnosis is architectural, not organizational

Every failure above has one shape. The property the system needed was held by a
person noticing, and people stop noticing under deadline pressure. Where
nothing structural holds a property, drift is not a risk to be managed. It is
the resting state.

That gives a short test worth applying before adopting a system or funding a
rebuild of one:

- When a color pair fails contrast, is that found by an audit or by the build?
- When a consumer needs a variant, is there a supported surface to reach for,
  or only internals?
- When a team needs different pixels, is there anything to adopt short of a
  copy?
- Can the system state what share of the product is built out of it, or is that
  a survey?

A system whose answer to all four is *someone checks* is not a system. It is a
library with a maintenance agreement, and the agreement is with a team whose
priorities are set somewhere else.

None of this was urgent while interface code was expensive to write, because
drift accumulated at the speed a person could type. That stopped being true
last year, and what it does to the arithmetic is the thing worth looking at
next.
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

> No Fusion product may create a dependency its user cannot exit. The user
> holds their own keys, data, and hardware. Fusion may operate a control plane,
> never a chokepoint.

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
| Energy | your own power |
| Financial | your own capital |

Energy is the missing floor, and every layer above it presumes power. It is
also why the company is called Fusion: fuel from seawater, no import, no cartel,
no grid dependency. The name states the destination rather than the position.

## One stack, shipped to progressively larger subjects

### Personal

Own your mind, your keys and your power. The model runs where you put it and
the memory it accumulates is a file you hold.

### Organizational

Operate without platform dependence. A company that cannot be held hostage by a
vendor roadmap, because it runs the substrate and holds the data.

### National

Energy independence and institutional capability. A state that generates its own
power and runs its own intelligence has different options than one that does
not.

This is the growth path and the go-to-market sequence at once. It is not seven
unrelated markets: it is one stack and one architectural commitment, sold to a
larger subject each time.

## Why it is a law and not a value

> No Fusion product may create a dependency its user cannot exit.

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

Model quality is rented and commoditizing. An architectural commitment
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

Six things. The number matters more than the contents: a bar
that is never written down can be raised forever, and a company that keeps
raising one never launches. Counted and published, it becomes something that can
actually be met, and something you can hold us to.

1. **The exit test, answered in writing.** A written answer to the question every
   proposal is tested against: what happens to you if Fusion shuts down tomorrow.
   Published with the product rather than available on request.

2. **Data handling stated before collection.** What is stored, where it lives, how
   long it is kept and what causes it to be deleted. Stated before a product
   collects anything, not in a policy revised afterwards.

3. **Keys held by you.** Yours, generated where you are, never escrowed. A product
   that can read your data without your key is a product that can be compelled
   to.

4. **A stop that leaves you whole.** You can stop it and keep everything. Not an
   account closure that starts a countdown, and not an export that produces a
   file nothing else can read.

5. **Outside review where the stakes are real.** Anything touching credentials,
   money or another person's records is reviewed by someone who does not work
   here before it ships. Named in the release, not asserted.

6. **The stage label is the true one.** Active means it ships with users. Building
   means real work with nothing shipped. Declared means committed direction with
   no work started. No product is described as further along than it is.

## Nothing has cleared this list yet

Helix is Building and Cortex is Building, which means there is no product yet
that has had to clear this list. Publishing the bar before there is anything to
hold against it is the point: written first, it is a commitment. Written
afterwards, it is a description of whatever we happened to do.

If something we ship does not clear one of these, that is worth telling us
about, and the list is short enough that the check is a real one.
`,
  'what-your-company-knows': `---
author: Ross Sheppard
date: 2026-07-14
description: The model is rented and repriced every quarter. What accumulates value is the context around it, and that currently lives in somebody else's account.
kicker: Insights
kind: Essay
path: /insights/what-your-company-knows
title: What your company knows, and who holds it
topic: Engineering
---

The enterprise purchase so far has been seats. A per-seat assistant, deployed
across a division, reading a context window and forgetting it. The line item is
legible, the pilot is easy to approve, and the thing being bought is the model.

The model is the part that is commoditizing. Capability is converging across
vendors, prices fall every few months, and any advantage in the weights is
rented for as long as the contract runs. Nobody is going to hold a durable
position there, including the companies currently selling it.

What accumulates is everything around the model: the corrections, the retrieved
documents, the decisions and the reasons for them, the accumulated institutional
knowledge of why a system is the way it is. That is the asset. In most
organizations it is currently being deposited into a vendor's account, under
their retention policy, in their schema.

## Two consequences that read the same in a boardroom

**Concentration.** The operational knowledge of the company comes to sit in a
system it does not run, priced by someone else, on a roadmap it does not
control. This is the same exposure as any critical vendor dependency, except
that it is being accrued without a decision, one convenient integration at a
time, and it does not appear on the risk register because nobody bought it.

**Audit.** When a decision was made partly by a model, and the decision was
material, the question is on what basis. Regulators are converging on that
question across jurisdictions and the answer has to be producible after the
fact.

A chat log is not an answer. It records what was said and not what was read.
Reconstructing the basis of a decision from a transcript requires knowing which
version of which document was in front of the model, which retrieval returned
it, which prior correction was still in effect, and who made that correction
when. None of that is in the transcript, and in most deployments none of it is
anywhere.

## Provenance is the half nobody sells

Memory is the part that gets attention, because it is the part a demo shows.
Provenance is harder and it is the part that makes memory usable in a regulated
setting.

Provenance means every claim the system holds carries a lineage: where it came
from, at what version, through which step, corrected by whom. Not a citation
appended to an answer after the fact, which is a presentation detail, but a
recorded edge that existed before the answer did and survives the model being
replaced.

The test is whether you can ask, eighteen months later, why the system believed
a thing, and get a chain rather than a paragraph. Almost nothing in production
today can answer that, and the reason is that provenance has to be designed in
at the substrate rather than added at the surface.

## Which is why Cortex is a substrate

Cortex is memory and provenance, run where you put it. What a system knows, and
where it learned it, held as records you hold, with a lineage on every claim.
Engram is the memory, Trace is the provenance, and Recall is the question of
what to put in front of a model and why that. Engram and Trace are Building,
Recall is Declared, and those labels mean what this site says they mean.

The reason to build it as a substrate rather than as a product is the same
reason the design system had to be a constraint rather than a library. An
application built on rented memory is not sovereign whatever its own
architecture says, because the property has to be true all the way down or it
is not true. A well-worded dependency is still a dependency.

The practical version of that, for a company evaluating any of this: the model
is replaceable and should be treated as replaceable. What must not be
replaceable, and must not be somebody else's, is the record of what your
organization has learned.
`,
  'why-helix-has-two-tiers': `---
author: Ross Sheppard
date: 2026-07-28
description: A large company does not have one brand or one framework, and a single styled component library serves exactly one of its surfaces. The rest fork.
kicker: Insights
kind: Essay
path: /insights/why-helix-has-two-tiers
title: Why Helix has two tiers
topic: Design
---

An enterprise does not have one brand. It has a marketing site, six product
surfaces on three different release cadences, an acquisition still running on
whatever stack it was bought with, a partner portal somebody built in a hurry,
and a brand refresh every three years that arrives as a PDF.

A single styled component library serves exactly one of those well. Everything
else either accepts pixels that are wrong for it, or forks. This is the
structural reason component libraries fail inside large organizations, and it
is upstream of every governance conversation about it.

Helix is shaped around that fact rather than around the demo.

## Two tiers, one vocabulary

The headless tier is behavior with no opinion about appearance: state, focus
management, keyboard interaction, the accessibility contract, the parts that
are genuinely hard and genuinely universal. The styled tier is the same
components with a derived visual system on top of them.

They are not two products. They are one vocabulary with two levels of
commitment. The same component names, the same parts, the same props, the same
events, whichever tier a team is on.

What that buys is not flexibility for its own sake. It is that the fork now has
a supported destination. A team that needs different pixels drops a tier
instead of copying a file, and the copy is what the previous essay describes as
the thing nobody is assigned to and no audit finds. Dropping a tier keeps the
team inside the vocabulary, keeps the accessibility work, and keeps the
upgrade path. Copying a file gives up all three at once.

For an enterprise this is the difference between one system with two adoption
levels and two systems with a migration between them.

## Tokens are derived, not authored

Most systems ship a palette as a spreadsheet: eleven steps of gray, eleven of
the brand, a handful of status colors, each of them a hex somebody picked and
nobody can check. The file is authoritative because it is the file, not because
anything about it is true.

The problem is not that the values are wrong. It is that there is no procedure
by which they could be found wrong. A contrast failure between two steps is
discovered by a person running an audit, and the fix is another hex nobody can
check. Accessibility becomes a review step, and review steps are what a
deadline removes first.

Helix takes one brand color and computes the rest in a perceptual space, so
lightness means the same thing at every hue and the contrast between two steps
is a consequence of how far apart they are rather than a coincidence somebody
verified once. A component asks for a named foreground and gets a correct value
in light mode, in dark mode, and against whatever brand the consumer set.

The enterprise consequence is the one worth stating plainly: a rebrand becomes
a value change rather than a project, and the accessibility posture survives it
without a re-audit, because accessibility was never a property of the
individual hexes. It was a property of the derivation.

## Overrides land on a declared surface

Every real adoption needs to change something. The question is only whether the
change lands somewhere with a contract.

A Helix component owns its surface and names the variables that tune it. A
consumer sets those. A stylesheet reaching past them into internals is a
finding the command line reports, not a clever workaround that ships and then
freezes the system three years later.

That is the whole mechanism that makes a version bump safe. The system can
change its internals because no consumer was ever supposed to depend on them,
and the difference between a system that can be upgraded and one that cannot is
exactly whether that sentence is enforced or merely believed.

## Web components, so the framework question stops mattering

The four stacks in the paragraph at the top of this essay are the normal
condition of a large company, not a symptom of poor planning. A React-only
system asks that company to either standardize first, which is a multi-year
program with no user-facing outcome, or to maintain a second system for
everything else.

Helix ships web components with framework wrappers over them. React, Vue,
Svelte, Angular, and no bundler at all are adoption paths rather than ports.
The acquisition on a different stack gets the same vocabulary on the day it is
acquired.

## One open tier, and what that costs us

No pro components, no paywalled API surface, no enterprise build with three
extra things in it. The economic argument for a paid tier is real and we are
not pretending otherwise: it is how most component libraries fund themselves.

The architectural argument against it is stronger. Under cheap generation a
system's value is being the constraint that generated code converges on, and a
paywalled component is a component that generation does not know about. Split
the vocabulary and you have not added a revenue line with a small cost
attached. You have damaged the property that made the system worth adopting,
silently, in a way that reads as the system being mediocre.

Payment lives in the engagement instead. We are paid for applying the system,
which keeps making the system easier to apply aligned with revenue rather than
opposed to it.

## What the trade costs

Derivation is worse than hand-picking at exactly one job, which is hitting a
specific value a brand guideline names. If the book says the disabled state is
this gray and no other, a derived system will argue with you.

Web components cost some ergonomics against a shop that is genuinely
React-and-nothing-else forever, and a few of them are real rather than
imagined.

We think both trades are correct for a design system and would be wrong for a
brand identity or for a single-application component library, which are
different artifacts with different jobs. Helix is Building, not shipped, and
the stage labels on this site say so.
`,
  'why-we-started-at-the-bottom': `---
author: Ross Sheppard
date: 2026-06-16
description: Cheap intelligence and cheap energy are arriving together. Neither halving matters alone, and together they are why we build substrates before products.
kicker: Insights
kind: Essay
path: /insights/why-we-started-at-the-bottom
title: Why we started at the bottom
topic: Sovereignty
---

Two costs historically forced a person, a company or a country to depend on a
larger institution: the cost of thinking at scale, and the cost of power. Both
are falling at once, for unrelated reasons, in the same decade.

Neither halving is interesting on its own. Cheap intelligence without cheap
energy is a rented capability running in somebody else's building, which is the
arrangement most of the industry is currently scaling. Cheap energy without
cheap intelligence is a lower utility bill. Together they are the first moment
where the whole stack a subject needs in order to not depend on anyone can
actually be owned and operated by that subject.

That is the thesis. Everything Fusion builds is downstream of it, and the order
we build in is the part that takes explaining.

## What it means for a company, specifically

The abstract version of this argument is easy to nod at and hard to act on, so
here is the concrete one.

The capabilities that used to require a vendor, because they required either a
research function or a large staffed organization, are becoming things a
company can run on hardware it owns. Not all of them, not yet, and the frontier
moves. But the direction is not in dispute and the trend line is steep.

Which means the binding constraint is shifting. It used to be capability: you
could not do the thing yourself, so you rented it, and the dependency was the
price of being able to do it at all. Increasingly you can do the thing
yourself, and what stops you is architecture: your records are in a schema you
do not control, your processes are shaped around a tool you do not run, your
institutional memory is deposited in an account you do not own.

Capability is arriving faster than the architecture to hold it. That gap is the
whole opportunity and the whole risk, and most enterprise adoption over the
last two years has been widening it.

## Why substrates before products

Helix is the interface layer, the DNA every screen is built from. Cortex is
memory and provenance, what a system knows and where it learned it. Both are
Building. Products are built on top of them, and neither is a product you buy.

Starting at the substrate is slower, harder to fund and worse to demo than
starting at an application. We do it for one reason: a sovereign application
running on a rented substrate is not sovereign. It is a well-worded dependency,
and it will be discovered to be one at the worst possible moment, which is
when the substrate reprices or is acquired.

The property has to be true all the way down or it is not true. That sentence
determines the build order and nothing else does.

## The same stack, to a larger subject each time

**Personal.** Your own keys, your own data, your own hardware. The model runs
where you put it, and the memory it accumulates is a file you hold. Nothing
about your working life is recoverable by a company that changes its pricing.

**Organizational.** The same properties with more people and an audit trail. A
company that cannot be held hostage by a vendor roadmap, because it runs the
substrate and holds the records, and can answer an auditor without asking
anyone's permission.

**National.** The same properties again, with the stakes that follow from a
country's institutional capability running on infrastructure it does not
control. This rung is a declared thesis, not a product, and we say so on every
page that mentions it.

This is a growth path and a go-to-market sequence at once. It is not seven
unrelated markets. It is one stack and one architectural commitment, sold to a
larger subject each time.

## Why the name

Energy is the floor, and every layer above it presumes power. Fusion is fuel
from seawater: no import, no cartel, no grid dependency. The name states the
destination rather than the current position, which is a thing worth being
explicit about rather than letting a reader discover.

The same applies to the rest of it. We are small. The stage labels on this site
say exactly where each piece is, Active and Building and Declared, and we do
not soften them. A company whose entire argument is that you should not have to
take a vendor's word for anything does not get to ask you to take its word for
where it is.
`,
}
