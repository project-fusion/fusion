# Security

## Reporting a vulnerability

**Use GitHub's private vulnerability reporting**, from the Security tab of this
repository or at
[/security/advisories/new](https://github.com/project-fusion/fusion/security/advisories/new).
It opens a draft advisory only we can read, and it is the fastest path to
someone who can fix the thing.

Do not open a public issue for a vulnerability. An issue is world readable the
moment it is filed, which tells everyone else before it tells us.

We aim to acknowledge a report within two working days and to say plainly
whether we think it is a vulnerability, what we intend to do, and by when. If
the answer is that it is not one, we say why rather than closing quietly.

## What is in scope

The eight published packages, `@fusion.dev/helix-*` and `@fusion.dev/cortex-*`, and the code in
this repository that produces them.

**`/helix/sandbox` executes whatever you type into it, and that is the design
rather than a defect.** Its frame is `sandbox="allow-scripts allow-forms"` with
`allow-same-origin` deliberately absent, so the code runs against an opaque
origin: it cannot read our cookies, our storage or our DOM, because as far as
the browser is concerned it is not us. A report that the sandbox runs arbitrary
code is a report that it works. A report that code in it reached something
outside the frame is a vulnerability and we want it.

Out of scope: findings from an automated scanner with no demonstrated impact,
missing headers on a static page with nothing behind it, and anything that
requires an attacker to already control the reader's machine.

## What we ask

Report privately and give us a chance to fix it before you publish. Do not run
denial of service tests against anything of ours, and do not access, modify or
retain data belonging to anyone else. Testing against your own checkout is
always fine and is the version we would rather read.

We do not run a bounty program. We will credit you in the advisory unless you
would rather we did not.
