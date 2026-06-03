# Design System Drift

## Purpose

Track whether `DESIGN.md`, Figma variables, docs, and `src/theme` still describe the same design system.

## Current Drift Surfaces

- `DESIGN.md`
- Figma local variables and text styles
- `docs/design-system/tokens.design.json`
- `docs/design-system/figma-token-map.md`
- `src/theme`
- canonical component specs

## Rule

When any token or canonical component changes, update the related docs in the same task.

## Check

Run:

```bash
npm run design:audit
```

