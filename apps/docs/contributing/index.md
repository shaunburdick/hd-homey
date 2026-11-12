# Contributing

HD Homey welcomes bug reports, fixes, features, and documentation improvements.

The full guide lives in the repository:

**[CONTRIBUTING.md on GitHub →](https://github.com/shaunburdick/hd-homey/blob/main/CONTRIBUTING.md)**

It covers the development setup, the commands that CI runs, code standards, how features go from spec to implementation, commit and pull request conventions, and the project's code of conduct.

## Quick start

```bash
git clone https://github.com/shaunburdick/hd-homey.git
cd hd-homey
npm ci
cp .env-example .env          # set AUTH_SECRET
npm run dev                   # http://localhost:3000
```

Before opening a PR, run `npm test` — it runs the same lint, type check, and unit tests as CI.

## Improving these docs

Every page has an **Edit this page on GitHub** link in the footer that opens the source in `apps/docs/`. Changes go through the same pull request process as code.

To preview locally:

```bash
npm run docs:dev      # http://localhost:5173/hd-homey/
npm run docs:build    # fails on dead internal links
```

## Reporting a problem

- Bugs and feature requests: [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)
- Security vulnerabilities: see [SECURITY.md](https://github.com/shaunburdick/hd-homey/blob/main/SECURITY.md) — do not open a public issue
