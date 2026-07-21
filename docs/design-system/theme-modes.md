# Theme Modes

## Scope

The trainer app supports three stored preferences:

- `system`: follows the device appearance and reacts to changes while the app is running.
- `light`: always uses the light palette.
- `dark`: always uses the dark palette.

`system` is the default for new and existing installations without a saved value.

## Architecture

- Concrete palettes: `src/theme/palettes.ts`
- Adaptive semantic colors: `src/theme/colors.ts`
- Provider and hook: `src/theme/ThemeProvider.tsx`
- Persistence: `src/theme/themePreference.ts`
- Android day/night resources: `android/app/src/main/res/values*/colors.xml`

Components continue to consume `theme.colors.*`; they must not receive component-level `isDark` props. Use `useAppTheme()` only when a native API requires an explicit `light` or `dark` value, such as the status bar, keyboard, native menu, tab blur, or Liquid Glass.

## Palette Strategy

- Dark backgrounds, inactive controls, separators, text, and general-purpose icons use neutral graphite values.
- Surface hierarchy comes from lightness: the base app background is darkest, content surfaces are slightly brighter, and secondary/control surfaces are brighter again.
- `content.controlAccent` restores the bright green treatment for primary actions, selected controls, and focus indicators without tinting the rest of the interface.
- Green also remains a deliberate accent for selected content, progress, and positive status feedback.
- The existing `system`, `light`, and `dark` choices are intentionally sufficient; adding near-duplicate dark variants would make appearance selection harder to understand.

## Startup

The stored preference is loaded before the authenticated application shell is mounted. The branded splash surface remains dark green in both modes, avoiding a white transition when the saved preference is dark.

## Persistence

Preference key: `trainer-app:theme-preference:v1`.

Invalid or unavailable stored values fall back to `system`. Storage failures never block rendering or theme selection.

## Verification

```bash
npm run typecheck
npm run theme:contrast
npm run design:audit
```

The contrast test covers primary/body/muted text, action pairs, selection, positive, warning, negative, and cyan-accent text in both palettes.
