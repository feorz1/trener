# Design System Rules

`DESIGN.md` is the primary source of truth for the trainer app design system. Figma local variables/text styles and code theme files must follow it.

Do not create new naming systems unless `DESIGN.md` is updated first.

## Token Naming

Use the current Figma naming exactly.

### Colors

All color variables use grouped `color/*` namespaces:

Content colors:

- `color/content/primary`
- `color/content/on-primary`
- `color/content/primary-active`
- `color/content/primary-neutral`
- `color/content/primary-pale`
- `color/content/ink`
- `color/content/ink-deep`
- `color/content/body`
- `color/content/mute`
- `color/content/disabled`

Background colors:

- `color/background/canvas`
- `color/background/canvas-soft`
- `card-divider`

Status colors:

- `color/status/positive`
- `color/status/positive-deep`
- `color/status/warning`
- `color/status/warning-deep`
- `color/status/warning-content`
- `color/status/negative`
- `color/status/negative-deep`
- `color/status/negative-darkest`
- `color/status/negative-bg`

Accent colors:

- `color/accent/orange`
- `color/accent/cyan`

### Spacing

Spacing variables are:

- `spacing/xxs`
- `spacing/xs`
- `spacing/sm`
- `spacing/md`
- `spacing/lg`
- `spacing/xl`
- `spacing/2xl`
- `spacing/3xl`

Do not introduce numeric spacing names or arbitrary component-local spacing values.

### Radius

Radius variables are:

- `radius/none`
- `radius/s`
- `radius/sm`
- `radius/md`
- `radius/lg`
- `radius/xl`
- `radius/pill`
- `radius/full`

### Typography

Use only these text-style namespaces:

- `Typography/Display/*`
- `Typography/Body/*`
- `Typography/Caption`
- `Typography/Button/MD`

Current text styles:

- `Typography/Display/Mega`
- `Typography/Display/XXL`
- `Typography/Display/XL`
- `Typography/Display/LG`
- `Typography/Display/MD`
- `Typography/Display/SM`
- `Typography/Display/XS`
- `Typography/Body/LG`
- `Typography/Body/MD`
- `Typography/Body/MD Strong`
- `Typography/Body/SM`
- `Typography/Body/SM Strong`
- `Typography/Caption`
- `Typography/Button/MD`


## Code Token Shape

Use this mapping logic:

```text
Figma variable/style              -> Code token
color/content/primary             -> theme.colors.content.primary
color/content/disabled            -> theme.colors.content.disabled
color/background/canvas                      -> theme.colors.background.canvas
color/status/positive                    -> theme.colors.status.positive
spacing/md                        -> theme.spacing.md
radius/lg                         -> theme.radius.lg
Typography/Body/MD                -> theme.typography.body.md
Typography/Button/MD              -> theme.typography.button.md
```

For the current Wise token set, grouped `color/*` paths map directly into semantic code groups:

- brand/content colors -> `theme.colors.content.*`
- surfaces -> `theme.colors.background.*`
- semantic states -> `theme.colors.status.*`
- illustration accents -> `theme.colors.accent.*`

## Figma Rules

- Bind fills, strokes, and text fills to `color/*` variables whenever possible.
- Bind spacing/radius variables where the Figma API and property support it.
- Apply text styles to every text node.
- Components must be Auto Layout unless there is a specific technical reason.
- Component set variant properties should map cleanly to code props.
- Do not create ad hoc screen-only components if a canonical component exists.

## Code Rules

- React Native components must import the root `theme` object from `src/theme`.
- Theme keys must use the nested `theme.*` mapping from `figma-token-map.md`.
- Keep numeric-leading spacing keys as `theme.spacing["2xl"]` and `theme.spacing["3xl"]`.
- Do not hardcode hex values in components.
- Do not use random spacing values in components.
- Do not define component-local typography scales.
- Components must use `src/components/ui/Icon.tsx` for icons. Do not import icon libraries directly in product or UI components.
- Default component delivery is fast mode: code plus Storybook first. Update docs, registry, and Figma maps later in a dedicated batch-sync pass unless the user asks for the full pipeline.

## Design Creation Rule

When creating future screens, use only canonical components that have already been processed through the component pipeline. If a required component does not exist yet, create and document the component first, then use its instances in screen design.

## Spec Consultation Rule

Before UI work, read the relevant files in this order:

1. `docs/design-system/foundations/*`
2. `docs/design-system/tokens/*`
3. `docs/design-system/components/<component>.md`
4. `docs/design-system/patterns/<pattern>.md`

Every visual decision should resolve to a token or a documented component/pattern rule.

## Drift Rule

If `DESIGN.md`, Figma variables, `tokens.design.json`, `src/theme`, or a component changes, update the related spec in the same task and run:

```bash
npm run design:audit
```
