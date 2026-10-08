# @fusion.dev/proof

Fusion Proof is a visual regression testing tool for web projects. It takes
pictures of your pages and components in a real browser, compares each one to
a baseline kept in your git repository, and fails the run when a picture
changes.

**Fusion Proof is in development.** This package installs the `proof` command,
and the command has no verbs yet: `proof --version` and `proof --help` are what
works today. The rest of this page describes what we are building.

```sh
npm install --save-dev @fusion.dev/proof
```

The command is a native binary, and npm installs the build for your machine
beside this package: macOS and Linux on Arm and x86-64, and Windows on x86-64.
An install that skips optional dependencies skips it too, and `proof` then
names the package it is missing. `PROOF_BIN` names a binary to run instead.

## How it works

- **Local-first.** Proof runs on your machine and in your CI. It needs no
  hosted service, and no picture leaves your machine unless you turn that on.
- **Baselines in git.** Each baseline is a file in your repository. A retake
  writes only the pictures the comparison rejects, and the pull request that
  carries them is where you review the change.
- **Three shots by default.** A wide width, a phone width, and the dark color
  scheme, each compared to its own baseline.
- **The environment is part of the baseline.** The browser version, the
  operating system image, and the installed fonts are recorded beside the
  baselines, and a run on a different environment stops and names what differs.
- **A Rust core and a Playwright driver.** The `proof` binary reads the config,
  finds what to picture, shards the work, decodes and compares the images, and
  writes the report. Capture runs in a small Node driver that runs Playwright,
  and the driver ships in this package.

## Roadmap

| Phase | What it adds |
|---|---|
| 1. Core | `proof test` and `proof update` on plain HTML sources. The config file, the environment fingerprint, the pixel diff, exceptions with their measurements, deterministic shards, and capture that waits for the page to hold still, refuses requests to other origins, and takes all three shots from one page load |
| 2. Ship | Server and Storybook sources, a perceptual diff, the HTML report behind `proof report`, the GitHub Action with its `check` and `retake` modes, documentation, and the first public `0.x` |
| 3. Checks | Differential checks with no baseline, such as server rendering against client rendering. Page checks on the render that was pictured: unhighlighted code blocks, clipped text, overlapping elements, and contrast. Accessibility snapshots stored beside each picture, and each changed region traced to the elements under it |
| 4. Triage | A model that groups and explains changes, only on a failed comparison and only when you configure one. Off by default, text-only first, local or hosted models, and a cost cap per run |
| GitHub App | Opens the baselines pull request for a retake so your required checks run on it, without a token you create and store. Planned after phase 2 |

MIT
