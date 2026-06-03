# Spacing

## Metadata

- Tier: foundations
- Source: `DESIGN.md`
- Code: `theme.spacing`

## Tokens

- `spacing/xxs` -> `theme.spacing.xxs` -> `2`
- `spacing/xs` -> `theme.spacing.xs` -> `4`
- `spacing/sm` -> `theme.spacing.sm` -> `8`
- `spacing/md` -> `theme.spacing.md` -> `12`
- `spacing/lg` -> `theme.spacing.lg` -> `16`
- `spacing/xl` -> `theme.spacing.xl` -> `24`
- `spacing/2xl` -> `theme.spacing["2xl"]` -> `32`
- `spacing/3xl` -> `theme.spacing["3xl"]` -> `48`

## Rules

- Use spacing tokens for `padding`, `margin`, `gap`, and fixed internal layout gaps.
- Do not introduce one-off spacing numbers in components.
- For trainer workflows, prefer larger touch spacing over dense layouts.

