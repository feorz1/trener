# Design Tokens

Figma variables are the source of truth for the app theme.

## Sync Flow

1. Update variables in Figma.
2. Export the light mode variables as JSON.
3. Replace `design-tokens/figma-light.json` with the exported file.
4. Run `npm run tokens:build`.
5. Check the app and run `npm run typecheck`.

The generator reads DTCG-like Figma tokens, resolves aliases such as `{color.brand.primary}`, converts Figma colors to hex or rgba strings, and writes TypeScript theme files into `src/theme`.
