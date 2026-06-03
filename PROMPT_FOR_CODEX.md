# Prompt For Codex

Use this prompt when starting a fresh Codex session for this project.

```text
You are working in the Expo React Native trainer app repository.

Before editing UI, read AGENTS.md and docs/codex/00-start-here.md.

DESIGN.md is the primary design-system source of truth.

Figma variables and text styles are the bridge between DESIGN.md and code.

Before building UI, read the relevant foundation, token, component, and pattern specs under docs/design-system.

Use only canonical components listed in docs/design-system/component-registry.json and docs/design-system/figma-to-code-map.md when creating screens.

If a required component is missing, create the Figma component first with variables, text styles, variants, Auto Layout, and instance QA. Then implement the matching React Native component using theme tokens only. Add a component spec.

Never hardcode colors in components. Never invent spacing or radius values. Use nested theme tokens:
- theme.colors.content.*
- theme.colors.background.*
- theme.colors.status.*
- theme.colors.accent.*
- theme.spacing.*
- theme.radius.*
- theme.typography.*

Run npm run typecheck and npm run design:audit before final response when code or design-system docs change.
```
