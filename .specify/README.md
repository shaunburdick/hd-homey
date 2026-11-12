# Project Specifications

HD Homey uses [spec-kit](https://github.com/github/spec-kit) for spec-driven development. Specifications describe intended behaviour and are the source of truth; code follows them.

## Layout

```
.specify/
├── memory/constitution.md   # Project principles. Read this before any feature work.
├── features/                # One file per feature: 001-tuner-management.md, 002-…
├── templates/               # Starter files for specs, plans, tasks, checklists
├── scripts/bash/            # spec-kit helper scripts
├── FEATURE-STATUS.md        # Index of features and their implementation status
└── README.md                # This file
```

Implementation artifacts for a feature live in `specs/<feature-id>/` at the repository root: `plan.md`, `tasks.md`, and any supporting research, data model, contracts, or quickstart files the plan earns.

## Working on a feature

1. Read `memory/constitution.md`.
2. Check `FEATURE-STATUS.md` and the existing spec before writing a new one — extending an existing capability means editing that spec, not adding a parallel one.
3. Write or amend the spec in `features/<id>-<name>.md`.
4. Plan and task it in `specs/<id>-<name>/`.
5. Update the spec and `FEATURE-STATUS.md` in the same change as the code.

Feature IDs are sequential and unique. When in doubt about which existing spec a change belongs to, ask in the issue before starting.

The full workflow, including when a change is small enough to skip the artifacts, is in [CONTRIBUTING.md](../CONTRIBUTING.md).
