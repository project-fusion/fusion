# @fusion.dev/cortex-cli

The Cortex command line. Records your notes, distills them into facts, answers
questions from the facts, and traces each answer back to the notes it came
from. The memory is a SQLite file on your machine, and the models run in Ollama
by default.

```sh
npm install --global @fusion.dev/cortex-cli
```

The command is a native binary, and npm installs the build for your machine
beside this package: macOS and Linux on Arm and x86-64, and Windows on x86-64.
An install that skips optional dependencies skips it too. `cortex` then runs a
`cortex` on your `PATH` whose `cortex --version --json` names this package, and
otherwise names the package that is missing.

```sh
cortex ingest notes/monday.md
cortex consolidate
cortex ask "When does the release ship?"
cortex why
```

| Verb | What it does |
|---|---|
| `ingest` | Records each paragraph of a file, or standard input, as an episode |
| `consolidate` | Asks the chat model for the facts the new episodes state, and gives each fact a vector |
| `ask` | Answers a question from the facts that score highest for it, and records the answer |
| `why` | Prints how an answer was derived: the facts it was given, why, and the notes under each |
| `forget` | Removes an episode, or every episode from a file, with everything derived from it |
| `replay` | Asks another model the same question with the same facts, and compares the answers |

`--json` is on every verb. [The quickstart](https://github.com/project-fusion/fusion/blob/main/cortex/docs/content/quickstart.mdx)
runs a session from install to `forget`, and
[the command page](https://github.com/project-fusion/fusion/blob/main/cortex/docs/content/command.mdx)
walks through a week of notes.
