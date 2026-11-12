# Contributing to HD Homey

Thanks for helping. HD Homey is a self-hosted proxy for HDHomeRun tuners, and most of its value comes from people running it against real hardware and telling us what broke.

This file is for anyone sending a change: humans and AI agents alike. `AGENTS.md` covers repository-specific context for agents; the rules below apply to everyone.

By contributing you agree your work is licensed under the project's [AGPL-3.0](LICENSE). There is no CLA and no DCO sign-off — just don't paste code you don't have the right to contribute.

## Before you write code

- **Small fixes** — typos, a broken link, an obvious bug — just open the PR.
- **Anything else** — open or comment on an issue first and agree on the approach. It is much cheaper to redirect a plan than a 600-line diff.
- **Features** need a spec before implementation (see [Spec-driven development](#spec-driven-development)).
- **Security problems** go through [SECURITY.md](SECURITY.md), never a public issue.

## Setup

You need Node.js 22+ and npm. Docker is optional; an HDHomeRun on your network is only needed for work that touches tuners, streaming, or signal.

```bash
git clone https://github.com/shaunburdick/hd-homey.git
cd hd-homey
npm ci
cp .env-example .env          # set AUTH_SECRET, generate with: openssl rand -base64 32
npm run dev                   # http://localhost:3000
```

`npm run dev` applies database migrations before the server starts, so a fresh clone comes up with an empty database and sends you to `/get-started` to create the admin account. A production `npm start` does not do this — run `npm run db:migrate` first.

## Commands

Run these from the repository root.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Web app on `0.0.0.0:3000` |
| `npm test` | Lint, type check, and unit tests — the same gate CI uses |
| `npm run test:unit` | Unit tests only |
| `npm run test:coverage` | Unit tests with a coverage report in `apps/web/coverage/` |
| `npm run lint` | ESLint across web and docs |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run db:generate` / `db:migrate` | Drizzle migration from the schema, then apply it |
| `npm run docs:dev` / `docs:build` | Documentation site |

`npm ci` may try to download a browser for Puppeteer; set `PUPPETEER_SKIP_DOWNLOAD=true` if you are offline or on a metered connection.

## Where things live

```
apps/web/           Next.js application
apps/docs/          VitePress documentation site
apps/android/       Android TV app (Kotlin)
.specify/features/  One specification per feature
specs/              Plans, tasks, and research per feature
```

## Spec-driven development

Specifications describe behaviour; code follows them. Read [.specify/memory/constitution.md](.specify/memory/constitution.md) before your first feature.

The size of the change decides the ceremony:

**Skip the artifacts** when all three hold: you can write the acceptance criteria without asking anyone anything; nothing outside this repository breaks (API shape, database schema, auth boundary — additive is fine, changing is not); and one `git revert` undoes it. Write a clear commit message instead.

**Otherwise**: write or amend `.specify/features/<id>-<name>.md`, then `plan.md` and `tasks.md` under `specs/<id>-<name>/`, and get agreement before implementing. `/speckit.*` commands scaffold these.

Amend an existing spec when the change extends a capability it already describes. A second spec for the same capability is always wrong.

## Code standards

- TypeScript strict. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `eslint-disable` — if a rule seems wrong, raise it so the config can change, don't silence it in code.
- Add a comment only where the next reader would otherwise break the line; explain the invariant, not the syntax.
- Keep the diff to the change. No drive-by refactors, dependency bumps, or reformatting.
- A new test is worth adding when it fails without your change. Coverage percentages are not a target.
- Update the docs in the same PR when you change behaviour, configuration, or an API route: `apps/docs/features/`, `apps/docs/config/`, `apps/docs/api/`. User-visible changes also get a `CHANGELOG.md` entry under `## [Unreleased]`.

## Commits and pull requests

Branches come off `main` and are squash-merged, so the PR title becomes the commit subject. Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`.

In the PR description, say what changed, why, and how you tested it. Include screenshots for interface changes. Link the issue it closes. Keep one concern per PR — a bug fix and a feature in one diff will be asked to split.

CI runs lint, type check, unit tests, the build, and Android lint and tests. It must be green.

## AI-assisted contributions

AI-assisted work is welcome. Two conditions:

1. **You own it.** You must be able to explain every line and answer review questions about it. If you can't, the change isn't ready.
2. **Say so.** Note it in the PR description — which parts and how much. No commit trailers or special formatting required.

Agents working in this repository should read [AGENTS.md](AGENTS.md) first; it carries the project's context, conventions, and known quirks.

## What review looks at

- Does it do what the linked issue or spec says, and nothing else?
- Is the failure behaviour defined — missing tuner, device offline, expired token?
- Does it hold up on a real device, or is that untested and stated as such?
- Are the docs updated where behaviour changed?

Reviews can take a few days. A ping after a week is fair; a ping after an hour is not.

## Code of conduct

Be decent. Assume the other person is acting in good faith, criticise the code rather than the author, and make room for people who know less than you about this project. Harassment and dismissiveness are not welcome here.

Report a problem to the maintainer ([@shaunburdick](https://github.com/shaunburdick)) privately, or through GitHub's report tooling if you would rather not approach them directly.
