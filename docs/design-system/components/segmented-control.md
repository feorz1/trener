# SegmentedControl

## Status

- Figma: ready
- Code: ready
- Docs: ready

## Purpose

`SegmentedControl` switches between a small set of mutually exclusive views or filters. It is used for compact trainer workflows such as period switches, workout filters, and simple mode selectors.

## Anatomy

- Root: Auto Layout horizontal pill container.
- Segment: pressable option container with selected and unselected visual states.
- Label: text node using `Typography/Body/SM Strong`.

## Props

| Prop | Type | Required | Description |
|---|---|---:|---|
| `items` | `Array<{ label: string; value: string }>` | yes | Two or three options. |
| `value` | `string` | yes | Currently selected option. |
| `onChange` | `(value: string) => void` | yes | Selection callback. |
| `size` | `"md"` | no | Current supported size. Defaults to `md`. |
| `width` | `number \| "full"` | no | Optional preview/layout width. Defaults to the canonical Figma width for two or three items. Use `"full"` when the control should stretch to its parent. |

## Variants

| Figma variant |
|---|
| `items=Two, selected=First, size=md` |
| `items=Two, selected=Second, size=md` |
| `items=Three, selected=First, size=md` |
| `items=Three, selected=Second, size=md` |
| `items=Three, selected=Third, size=md` |

## Token Usage

| Usage | Figma token | Code token |
|---|---|---|
| root background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| selected segment background | `color/content/primary` | `theme.colors.content.primary` |
| unselected segment background | `color/background/canvas` | `theme.colors.background.canvas` |
| selected label | `color/content/on-primary` | `theme.colors.content.onPrimary` |
| unselected label | `color/content/body` | `theme.colors.content.body` |
| root padding | `spacing/xs` | `theme.spacing.xs` |
| segment vertical padding | `spacing/sm` | `theme.spacing.sm` |
| segment horizontal padding | `spacing/md` | `theme.spacing.md` |
| gap | `spacing/xs` | `theme.spacing.xs` |
| min height | `spacing/3xl` | `theme.spacing["3xl"]` |
| default two-item width | component size token | `theme.sizes.segmentedControlTwoWidth` |
| default three-item width | component size token | `theme.sizes.segmentedControlThreeWidth` |
| radius | `radius/pill` | `theme.radius.pill` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |

## Figma QA

- Variables applied: yes
- Text styles applied: yes
- Auto Layout: yes
- Instances tested: yes
- Component set node: `96:613`

## Code QA

- Typecheck: passed
- Dev-kit examples: Storybook mobile route and Storybook web stories use the component
- Hardcoded color audit: passed
