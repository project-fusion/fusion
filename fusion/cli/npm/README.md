# @fusion.dev/cli

The npm shim for the `fusion` command. **Private**: it is how this workspace's
own checks reach a Rust binary from a `bun run` line.

```sh
bun run fusion workspace       # the rules a workspace is held to
bun run fusion prose check     # every doc block, judged
bun run fusion spec check      # the spec rules
```

**A near-copy of `helix/cli/npm/bin.mjs`, deliberately.** Sharing one would put
a file in the fusion domain on the publish path of a helix package, and
per-domain lockstep exists so a release of either does not wait on the other.

**Resolution order, each step for a reason.** `FUSION_BIN` first, because a
caller that knows better should not have to argue. Then the cargo target
directory, release before debug, honoring `CARGO_TARGET_DIR`. Then `PATH`. Only
then a build, and only when cargo is present. What that last step replaces is a
check dying with `spawn fusion ENOENT`, which tells a reader nothing about which
of four causes they have.
