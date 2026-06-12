# Task Completion

- For design-system/component/screen changes, run `npm run typecheck` and `npm run design:audit`.
- Zero design audit errors are required; warnings should be fixed or documented in the relevant spec.
- For visual UI changes, capture/check the relevant simulator or Storybook screen when feasible.
- Before reporting, inspect `git status --short` and distinguish current-task edits from pre-existing dirty files.
- Serena memory references can be sanity-checked from the project root with `serena memories check`.