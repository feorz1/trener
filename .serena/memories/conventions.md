# Conventions

- New screen/component work must start from docs: `docs/codex/00-start-here.md`, `DESIGN.md`, design rules, token map, code map, registry, then relevant foundation/token/component/pattern specs.
- Do not create ad hoc UI when a canonical component exists; screen work should compose registry components.
- Components import root `theme` from `src/theme`; avoid hardcoded colors, arbitrary spacing/radius, and local typography scales.
- Theme shape uses nested paths: `theme.colors.content.*`, `theme.colors.background.*`, `theme.colors.status.*`, `theme.colors.accent.*`, `theme.spacing.*`, `theme.radius.*`, `theme.typography.*`.
- Numeric-leading spacing keys are accessed as `theme.spacing["2xl"]` / `theme.spacing["3xl"]`; zero spacing is available as `theme.spacing[0]`.
- UI icons go through `src/components/ui/Icon.tsx`; product/UI components should not import icon libraries directly.
- Default component delivery is fast mode: code + Storybook first; docs/registry/Figma maps are updated later unless full batch-sync is requested.