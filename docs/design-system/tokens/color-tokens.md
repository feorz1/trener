# Color Tokens

See `docs/design-system/figma-token-map.md` for the full table.

## Groups

- `theme.colors.content.*`
- `theme.colors.background.*`
- `theme.colors.status.*`
- `theme.colors.accent.*`

## Background Additions

- `theme.colors.background.border` mirrors Figma `color/background/border`.
- `theme.colors.background.cardDivider` mirrors Figma `card-divider`.

## Control Accent

- `theme.colors.content.controlAccent` mirrors Figma `color/content/control-accent`.
- Use it for primary control fills, selected indicators, and focus rings. General-purpose icons continue to use neutral content tokens.

## Rule

Components cannot use raw color literals.

## Modes

- `src/theme/palettes.ts` contains concrete `lightColors` and `darkColors` values.
- `src/theme/colors.ts` exposes platform-adaptive values at the existing `theme.colors.*` paths.
- Native components that require an explicit scheme use `useAppTheme()` and `resolvedColorScheme`.
- Preference values are `system`, `light`, and `dark`; `system` is the default.
- `npm run theme:contrast` verifies representative text and status pairs against WCAG AA.
- The contrast test also guards dark neutral roles against accidental brand tinting.
