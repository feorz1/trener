# Core

- Expo React Native trainer app for personal trainers; Expo Router routes live under `app/`.
- Design-system-led codebase: `DESIGN.md` is primary source of truth; token/code mapping lives in `docs/design-system/figma-token-map.md` and `docs/design-system/rules.md`.
- Canonical component registry/map: `docs/design-system/component-registry.json` and `docs/design-system/figma-to-code-map.md`; use these before screen work.
- Source map: app routes in `app/`; reusable components in `src/components`; mock local data in `src/data`; theme in `src/theme`; shared types in `src/types`.
- Read `mem:tech_stack` for runtime/tooling, `mem:conventions` for design/code invariants, `mem:suggested_commands` for common commands, and `mem:task_completion` before finishing code changes.