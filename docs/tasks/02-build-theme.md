# Task 02: Build Theme

Goal: align `src/theme` with `DESIGN.md` and Figma local variables.

Required shape:

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

Run:

```bash
npm run tokens:build
npm run design:audit
```

Theme work is complete only when `src/theme`, `tokens.design.json`, and `figma-token-map.md` agree on the same nested `theme.*` shape.
