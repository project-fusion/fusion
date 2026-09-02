<!--
Write the description here, and delete this comment. Three things are worth
covering, and headings are optional:

  What this changes.  One or two sentences. What is different after this lands.
  Why.                The reasoning. If it closes an issue: "Closes #NNN".
  Look at this first. The part you are least sure about. Saying so is faster
                      than being found out.

Leave the checklist below in place. Do not tick what you did not run.
-->

## How it was checked

- [ ] `bun run verify` passes
- [ ] `cargo test --workspace` passes (if Rust changed)
- [ ] New or changed behavior has a spec
- [ ] Visual baselines retaken with `bun run visual:update` on Linux (if pixels moved)
