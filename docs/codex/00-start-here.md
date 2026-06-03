# Start Here

This file defines the working context for Codex in this repository.

## Project

- Product: mobile app for personal trainers.
- Stack: Expo, React Native, TypeScript, Expo Router.
- Backend: none in the first phase.
- Data: local mock data until backend integration.

## Design System Contract

`DESIGN.md` is the primary source of truth.

Figma local variables/text styles must mirror `DESIGN.md`.

Code theme files must mirror the Figma token map:

- `docs/design-system/figma-token-map.md`
- `docs/design-system/rules.md`

Canonical Figma components and their code mappings live in:

- `docs/design-system/figma-to-code-map.md`
- `docs/design-system/component-registry.json`

LLM-readable specs are organized in tiers:

- foundations: `docs/design-system/foundations`
- token reference: `docs/design-system/tokens`
- components: `docs/design-system/components`
- patterns: `docs/design-system/patterns`

## Required Workflow For New Components

Use fast mode by default unless the user asks for the full design-system pipeline.

Fast mode:

1. Read the relevant Figma/design context and source-of-truth rules.
2. Implement or update the React Native component.
3. Add or update Storybook/mobile Storybook examples and controls.
4. Run the checks needed for the changed code.

Batch-sync mode, run separately when requested:

1. Define anatomy and props.
2. Create or update the Figma component set.
3. Apply local variables and text styles.
4. Add variants and states.
5. Verify instance behavior and Auto Layout.
6. Implement the React Native component.
7. Add a component spec in `docs/design-system/components`.
8. Update `docs/design-system/component-registry.json`.
9. Update `docs/design-system/figma-to-code-map.md`.
10. Add examples to `app/dev-kit.tsx` when code is implemented.

## Required Workflow For Screens

1. Check the component registry.
2. Use canonical component instances only.
3. If a missing component is needed, stop and create the component first.
4. Do not build screens from one-off boxes when a canonical component should exist.
5. Read the relevant pattern file before deciding layout spacing or composition.

## Checks

```bash
npm run typecheck
npm run design:audit
```
