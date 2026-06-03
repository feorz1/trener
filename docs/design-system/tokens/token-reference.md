# Token Reference

This is the master reference for the current token layer.

Primary source:

- `DESIGN.md`

Generated/static mirrors:

- `docs/design-system/tokens.design.json`
- `docs/design-system/figma-token-map.md`
- `src/theme`

## Required Code Shape

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

## Closed Token Rule

Component code must choose from this closed token layer. If a needed visual value is missing, add or update a token first. Do not hardcode a local value in the component.

