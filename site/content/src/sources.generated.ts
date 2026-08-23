/**
 * Every page's MDX, inlined by `bun run content`. Do not edit: the files in
 * `content/` are the source, and `bun run check:content` fails when this
 * module and they disagree.
 */
export const sitePageSources: Record<string, string> = {
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
