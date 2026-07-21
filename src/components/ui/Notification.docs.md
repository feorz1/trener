# Notification

## Purpose

`Notification` is a compact glass status pill for transient workout feedback, matching the Figma `Notification` component set.

## Anatomy

- `root`: pill-shaped liquid glass surface with a soft white edge.
- `icon`: optional status icon, defaulting to `check filled`.
- `label`: single-line message using `Typography/Body/MD`.

## Props

- `text`: message text. Whitespace is normalized for stable pill width.
- `variant`: `default` shows the status icon; `plain` is text-only.
- `showIcon`: overrides icon visibility when a caller needs a custom state.
- `iconName`: icon from the canonical `Icon` component.
- `effect`: liquid glass effect, forwarded to `@callstack/liquid-glass`.
- `interactive`: enables native glass interaction when supported.
- `style`, `contentStyle`, `testID`: standard view hooks.

## Token Usage

- Surface fallback: `theme.colors.background.canvas`
- Text: `theme.colors.content.ink`
- Status icon: `theme.colors.status.positive`
- Typography: `theme.typography.body.md`
- Radius: `theme.radius.xl`
- Spacing: `theme.spacing.sm`, `theme.spacing.md`, `theme.spacing.lg`
- Sizes: `theme.sizes.notificationMinHeight`, `theme.sizes.notificationIcon`
- Edge: `theme.shadows.notification`

## Figma

- Component set: `Notification`
- Component node: `912:13243`
- Storyboard reference: `912:13513`, `912:13356`

## Do / Don't

- Do use it for short, transient workout feedback.
- Do keep text short enough to fit inside a top navigation area.
- Don't use it as a persistent alert or form validation message.
