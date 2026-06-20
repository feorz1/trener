# AGENTS

This project is an Expo React Native trainer app. Treat this repository as a design-system-led product codebase.

## Start Here

Before creating screens or components, read:

1. `docs/codex/00-start-here.md`
2. `DESIGN.md`
3. `docs/design-system/rules.md`
4. `docs/design-system/figma-token-map.md`
5. `docs/design-system/figma-to-code-map.md`
6. `docs/design-system/component-registry.json`
7. Relevant files under `docs/design-system/foundations`
8. Relevant files under `docs/design-system/tokens`
9. Relevant component spec under `docs/design-system/components`
10. Relevant pattern spec under `docs/design-system/patterns`

## Source Of Truth

`DESIGN.md` is the primary design-system source of truth.

Figma variables and text styles mirror `DESIGN.md`.

Code theme tokens must mirror the Figma token map.

Canonical components are tracked in `docs/design-system/component-registry.json` and `docs/design-system/figma-to-code-map.md`.

## Non-Negotiable Rules

- Do not create ad hoc UI if a canonical component exists.
- Do not use hardcoded colors in components.
- Do not use arbitrary spacing/radius values in components.
- Use `theme.*` tokens only for component styling.
- New Figma components must use local variables and text styles.
- New Figma components must have explicit variants and instance-safe Auto Layout.
- New code components should first be implemented in code and Storybook; component specs, registry entries, and Figma maps may be updated later in a dedicated batch-sync pass unless the user asks for the full pipeline.

## Component Workflow Modes

Default fast mode for new components:

1. Read the relevant design context and existing source-of-truth rules.
2. Implement or update the React Native component.
3. Add or update Storybook/mobile Storybook coverage.
4. Verify with TypeScript and visual checks when needed.

Batch-sync mode for design-system bookkeeping:

1. Add or update component specs in `docs/design-system/components`.
2. Update `docs/design-system/component-registry.json`.
3. Update `docs/design-system/figma-to-code-map.md`.
4. Run `npm run typecheck` and `npm run design:audit`.

## Current Token Shape

Use nested theme paths:

```ts
theme.colors.content.primary
theme.colors.background.canvas
theme.colors.status.positive
theme.colors.accent.cyan
theme.spacing.md
theme.radius.lg
theme.typography.body.md
theme.typography.button.md
```

## Validation

Run these checks after design-system or component work:

```bash
npm run typecheck
npm run design:audit
```

Zero audit errors are required. Warnings must be either fixed or documented in the relevant spec.
