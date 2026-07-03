# MoveKit Exercise Coverage

Generated: 2026-07-02T22:07:14.433Z

## Sources

- Local catalog: `src/data/exerciseCatalog.ts`
- App seed wrapper: `src/data/mockExercises.ts`
- MoveKit public source: `https://movekit.com/sitemap.xml` and public exercise HTML pages only
- Important: no MoveKit media assets were downloaded or committed. Asset URLs from metadata were intentionally ignored.

## Catalog Inventory

- Local exercises: 276
- MoveKit public exercise pages found: 206

### Local Count By Category

| category | count |
| --- | --- |
| cardio | 26 |
| mobility | 28 |
| strength | 222 |

### Local Count By Primary Muscle

| primaryMuscle | count |
| --- | --- |
| back | 47 |
| biceps | 20 |
| chest | 33 |
| glutes | 32 |
| legs | 48 |
| quads | 34 |
| shoulders | 41 |
| triceps | 21 |

## Summary

| metric | count |
| --- | --- |
| local exercises | 276 |
| MoveKit exercises found | 206 |
| exact_slug | 21 |
| exact_alias_or_title | 7 |
| renamed_match | 15 |
| reusable_asset | 106 |
| needs_manual_review | 10 |
| not_found | 117 |
| covered total | 149 |
| covered percent | 54.0% |

Coverage means `exact_slug + exact_alias_or_title + renamed_match + reusable_asset`.

## Coverage By Category

| category | total | covered | coverage | exact_slug | exact_alias_or_title | renamed_match | reusable_asset | needs_manual_review | not_found |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| strength | 222 | 147 | 66.2% | 19 | 7 | 15 | 106 | 10 | 65 |
| cardio | 26 | 2 | 7.7% | 2 | 0 | 0 | 0 | 0 | 24 |
| mobility | 28 | 0 | 0.0% | 0 | 0 | 0 | 0 | 0 | 28 |

## Coverage By Muscle Group

| muscle | total | covered | coverage | exact_slug | exact_alias_or_title | renamed_match | reusable_asset | needs_manual_review | not_found |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| back | 47 | 30 | 63.8% | 2 | 2 | 1 | 25 | 0 | 17 |
| biceps | 20 | 17 | 85.0% | 2 | 0 | 2 | 13 | 1 | 2 |
| chest | 33 | 22 | 66.7% | 7 | 2 | 5 | 8 | 1 | 10 |
| glutes | 32 | 12 | 37.5% | 1 | 0 | 2 | 9 | 1 | 19 |
| legs | 48 | 21 | 43.8% | 2 | 1 | 1 | 17 | 0 | 27 |
| quads | 34 | 22 | 64.7% | 1 | 1 | 2 | 18 | 2 | 10 |
| shoulders | 41 | 20 | 48.8% | 6 | 0 | 2 | 12 | 0 | 21 |
| triceps | 21 | 5 | 23.8% | 0 | 1 | 0 | 4 | 5 | 11 |

## Top Missing Groups

| muscle | total | covered | coverage |
| --- | --- | --- | --- |
| triceps | 21 | 5 | 23.8% |
| glutes | 32 | 12 | 37.5% |
| legs | 48 | 21 | 43.8% |
| shoulders | 41 | 20 | 48.8% |
| back | 47 | 30 | 63.8% |

## Recommendation

MoveKit has meaningful coverage for common strength movements, especially barbell, dumbbell, cable, bodyweight, and machine basics. Based on the public library count (206) versus our broader catalog (276), Full Library Pack may be useful, but it will not fully cover the current catalog by itself.

Use MoveKit for exact and high-confidence strength clips first. Keep `reusable_asset` entries as temporary placeholders only, because weighted/assisted/unilateral/angle-specific variants may not match coaching intent. For `needs_manual_review`, verify the actual visual before purchase/integration. For `not_found`, plan another source, custom illustrations, or a smaller fallback icon/diagram strategy.

Aliases worth adding later are mostly provider-style names: plural bodyweight names (`pull-ups`, `chin-ups`, `diamond-push-ups`), equipment-first cable/machine names, and reordered bench press variants such as `barbell incline bench press`.

## Exact Match Examples

| exerciseId | name | status | MoveKit |
| --- | --- | --- | --- |
| barbell-bench-press | Жим штанги лежа | exact_slug | [Barbell Bench Press](https://movekit.com/exercises/barbell-bench-press) |
| dumbbell-bench-press | Жим гантелей лежа | exact_slug | [Dumbbell Bench Press](https://movekit.com/exercises/dumbbell-bench-press) |
| machine-chest-press | Жим от груди в тренажере | exact_slug | [Machine Chest Press](https://movekit.com/exercises/machine-chest-press) |
| seated-cable-chest-press | Жим от груди в кроссовере сидя | exact_alias_or_title | [Cable Chest Press](https://movekit.com/exercises/cable-chest-press) |
| push-up | Отжимания от пола | exact_slug | [Push Up](https://movekit.com/exercises/push-up) |
| incline-push-up | Отжимания от опоры | exact_slug | [Incline Push Up](https://movekit.com/exercises/incline-push-up) |
| decline-push-up | Отжимания с ногами на возвышении | exact_slug | [Decline Push Up](https://movekit.com/exercises/decline-push-up) |
| diamond-push-up-chest | Узкие отжимания с акцентом на грудь | exact_alias_or_title | [Diamond Push Ups](https://movekit.com/exercises/diamond-push-ups) |
| pull-up | Подтягивания | exact_alias_or_title | [Pull Ups](https://movekit.com/exercises/pull-ups) |
| chin-up | Подтягивания обратным хватом | exact_alias_or_title | [Chin Ups](https://movekit.com/exercises/chin-ups) |

## Renamed / Reusable Examples

| exerciseId | name | status | MoveKit | notes |
| --- | --- | --- | --- | --- |
| incline-barbell-bench-press | Жим штанги на наклонной скамье | renamed_match | [Barbell Incline Bench Press](https://movekit.com/exercises/barbell-incline-bench-press) | Same normalized tokens, different word order or provider naming. |
| incline-dumbbell-bench-press | Жим гантелей на наклонной скамье | renamed_match | [Dumbbell Incline Bench Press](https://movekit.com/exercises/dumbbell-incline-bench-press) | Same normalized tokens, different word order or provider naming. |
| decline-barbell-bench-press | Жим штанги на обратно-наклонной скамье | reusable_asset | [Barbell Bench Press](https://movekit.com/exercises/barbell-bench-press) | Temporary fallback: close base movement exists, but loading/modifier differs. |
| decline-dumbbell-bench-press | Жим гантелей на обратно-наклонной скамье | renamed_match | [Dumbbell Decline Bench Press](https://movekit.com/exercises/dumbbell-decline-bench-press) | Same normalized tokens, different word order or provider naming. |
| smith-machine-bench-press | Жим лежа в Смите | renamed_match | [Smith Machine Incline Bench Press](https://movekit.com/exercises/smith-machine-incline-bench-press) | High token overlap (0.80) with provider naming. |
| dumbbell-fly | Разведение гантелей лежа | reusable_asset | [Cable Bench Chest Fly](https://movekit.com/exercises/cable-bench-chest-fly) | Temporary fallback: close base movement exists, but loading/modifier differs. |
| cable-fly | Сведение рук в кроссовере | reusable_asset | [Cable Bench Chest Fly](https://movekit.com/exercises/cable-bench-chest-fly) | Temporary fallback: close base movement exists, but loading/modifier differs. |
| weighted-push-up | Отжимания с дополнительным весом | reusable_asset | [Bodyweight Elevated Push Up](https://movekit.com/exercises/bodyweight-elevated-push-up) | Temporary fallback: close base movement exists, but loading/modifier differs. |
| knee-push-up | Отжимания с колен | renamed_match | [Bodyweight Knee Push Ups](https://movekit.com/exercises/bodyweight-knee-push-ups) | Same normalized tokens, different word order or provider naming. |
| chest-dip | Отжимания на брусьях с акцентом на грудь | reusable_asset | [Machine Dips](https://movekit.com/exercises/machine-dips) | Temporary fallback: close base movement exists, but loading/modifier differs. |

## Important Not Found Examples

| exerciseId | name | primaryMuscles | equipment |
| --- | --- | --- | --- |
| barbell-floor-press | Жим штанги с пола | chest | Штанга |
| dumbbell-floor-press | Жим гантелей с пола | chest | Гантели |
| high-to-low-cable-fly | Сведение рук в кроссовере сверху вниз | chest | Кроссовер |
| low-to-high-cable-fly | Сведение рук в кроссовере снизу вверх | chest | Кроссовер |
| pec-deck-fly | Сведение рук в тренажере бабочка | chest | Тренажер бабочка |
| plate-squeeze-press | Жим блина перед собой | chest | Блин |
| dumbbell-pullover-chest | Пуловер с гантелью с акцентом на грудь | chest | Гантель, скамья |
| medicine-ball-chest-pass | Бросок медбола от груди | chest | Медбол |
| lat-pulldown-wide-grip | Тяга верхнего блока широким хватом | back | Верхний блок |
| lat-pulldown-close-grip | Тяга верхнего блока узким хватом | back | Верхний блок, узкая рукоять |

## Risks And Limitations

- MoveKit library was collected from public sitemap and public HTML. If the client-rendered library exposes additional items not in sitemap, this report may undercount MoveKit.
- Matching is text-based. It does not verify biomechanics, camera angle, grip, range of motion, or exact equipment visually.
- Public pages include metadata and public descriptions, but purchase/licensing details may change. Verify licensing before using assets in production.
- `reusable_asset` is intentionally conservative and should not be treated as a final media mapping.
- Russian exercise names rely on existing English aliases and ids; missing aliases reduce match confidence.
