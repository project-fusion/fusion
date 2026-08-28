## What this changes

<!-- One or two sentences. What is different after this lands. -->

## Why

<!-- The reasoning. If it closes a queue row, name it: "Closes #NNN". A row
     number is the handle, and `fusion/docs/19-queue.md` is where the reasoning lives. -->

## How it was checked

<!-- Delete what does not apply, and do not tick what you did not run. -->

- [ ] `bun run verify` passes
- [ ] `cargo test --workspace` passes (if Rust changed)
- [ ] New or changed behavior has a spec
- [ ] Visual baselines retaken with `bun run visual:update` on Linux (if pixels moved)
- [ ] `fusion/docs/19-queue.md` updated (row closed, or a new one filed)

## Anything a reviewer should look at first

<!-- The part you are least sure about. Saying so is faster than being found out. -->
