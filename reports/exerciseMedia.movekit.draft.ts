export type MoveKitMatchStatus =
  | "exact_slug"
  | "exact_alias_or_title"
  | "renamed_match"
  | "reusable_asset"
  | "needs_manual_review"
  | "not_found";

export type MoveKitExerciseMediaDraft = {
  provider: "movekit";
  providerExerciseId?: string;
  url?: string;
  title?: string;
  matchStatus: MoveKitMatchStatus;
  confidence: number;
  notes?: string;
};

export const moveKitExerciseMediaById = {
  "barbell-bench-press": {
    provider: "movekit",
    providerExerciseId: "barbell-bench-press",
    url: "https://movekit.com/exercises/barbell-bench-press",
    title: "Barbell Bench Press",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "dumbbell-bench-press": {
    provider: "movekit",
    providerExerciseId: "dumbbell-bench-press",
    url: "https://movekit.com/exercises/dumbbell-bench-press",
    title: "Dumbbell Bench Press",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "incline-barbell-bench-press": {
    provider: "movekit",
    providerExerciseId: "barbell-incline-bench-press",
    url: "https://movekit.com/exercises/barbell-incline-bench-press",
    title: "Barbell Incline Bench Press",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "incline-dumbbell-bench-press": {
    provider: "movekit",
    providerExerciseId: "dumbbell-incline-bench-press",
    url: "https://movekit.com/exercises/dumbbell-incline-bench-press",
    title: "Dumbbell Incline Bench Press",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "decline-barbell-bench-press": {
    provider: "movekit",
    providerExerciseId: "barbell-bench-press",
    url: "https://movekit.com/exercises/barbell-bench-press",
    title: "Barbell Bench Press",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "decline-dumbbell-bench-press": {
    provider: "movekit",
    providerExerciseId: "dumbbell-decline-bench-press",
    url: "https://movekit.com/exercises/dumbbell-decline-bench-press",
    title: "Dumbbell Decline Bench Press",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "smith-machine-bench-press": {
    provider: "movekit",
    providerExerciseId: "smith-machine-incline-bench-press",
    url: "https://movekit.com/exercises/smith-machine-incline-bench-press",
    title: "Smith Machine Incline Bench Press",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "High token overlap (0.80) with provider naming."
  },
  "machine-chest-press": {
    provider: "movekit",
    providerExerciseId: "machine-chest-press",
    url: "https://movekit.com/exercises/machine-chest-press",
    title: "Machine Chest Press",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "seated-cable-chest-press": {
    provider: "movekit",
    providerExerciseId: "cable-chest-press",
    url: "https://movekit.com/exercises/cable-chest-press",
    title: "Cable Chest Press",
    matchStatus: "exact_alias_or_title",
    confidence: 0.9,
    notes: "Search alias/name equals MoveKit title or slug after normalization."
  },
  "barbell-floor-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "dumbbell-floor-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "dumbbell-fly": {
    provider: "movekit",
    providerExerciseId: "cable-bench-chest-fly",
    url: "https://movekit.com/exercises/cable-bench-chest-fly",
    title: "Cable Bench Chest Fly",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "incline-dumbbell-fly": {
    provider: "movekit",
    providerExerciseId: "dumbbell-incline-chest-fly",
    url: "https://movekit.com/exercises/dumbbell-incline-chest-fly",
    title: "Dumbbell Incline Chest Fly",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: dumbbell-incline-chest-fly (0.75); dumbbell-incline-chest-fly (0.75)."
  },
  "cable-fly": {
    provider: "movekit",
    providerExerciseId: "cable-bench-chest-fly",
    url: "https://movekit.com/exercises/cable-bench-chest-fly",
    title: "Cable Bench Chest Fly",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "high-to-low-cable-fly": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "low-to-high-cable-fly": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "pec-deck-fly": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "plate-squeeze-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "dumbbell-pullover-chest": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "push-up": {
    provider: "movekit",
    providerExerciseId: "push-up",
    url: "https://movekit.com/exercises/push-up",
    title: "Push Up",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "weighted-push-up": {
    provider: "movekit",
    providerExerciseId: "bodyweight-elevated-push-up",
    url: "https://movekit.com/exercises/bodyweight-elevated-push-up",
    title: "Bodyweight Elevated Push Up",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "knee-push-up": {
    provider: "movekit",
    providerExerciseId: "bodyweight-knee-push-ups",
    url: "https://movekit.com/exercises/bodyweight-knee-push-ups",
    title: "Bodyweight Knee Push Ups",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "incline-push-up": {
    provider: "movekit",
    providerExerciseId: "incline-push-up",
    url: "https://movekit.com/exercises/incline-push-up",
    title: "Incline Push Up",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "decline-push-up": {
    provider: "movekit",
    providerExerciseId: "decline-push-up",
    url: "https://movekit.com/exercises/decline-push-up",
    title: "Decline Push Up",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "diamond-push-up-chest": {
    provider: "movekit",
    providerExerciseId: "diamond-push-ups",
    url: "https://movekit.com/exercises/diamond-push-ups",
    title: "Diamond Push Ups",
    matchStatus: "exact_alias_or_title",
    confidence: 0.9,
    notes: "Search alias/name equals MoveKit title or slug after normalization."
  },
  "chest-dip": {
    provider: "movekit",
    providerExerciseId: "machine-dips",
    url: "https://movekit.com/exercises/machine-dips",
    title: "Machine Dips",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "weighted-chest-dip": {
    provider: "movekit",
    providerExerciseId: "machine-dips",
    url: "https://movekit.com/exercises/machine-dips",
    title: "Machine Dips",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "assisted-chest-dip-machine": {
    provider: "movekit",
    providerExerciseId: "machine-dips",
    url: "https://movekit.com/exercises/machine-dips",
    title: "Machine Dips",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "plyometric-push-up": {
    provider: "movekit",
    providerExerciseId: "push-up",
    url: "https://movekit.com/exercises/push-up",
    title: "Push Up",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "medicine-ball-chest-pass": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "pull-up": {
    provider: "movekit",
    providerExerciseId: "pull-ups",
    url: "https://movekit.com/exercises/pull-ups",
    title: "Pull Ups",
    matchStatus: "exact_alias_or_title",
    confidence: 0.9,
    notes: "Search alias/name equals MoveKit title or slug after normalization."
  },
  "weighted-pull-up": {
    provider: "movekit",
    providerExerciseId: "pull-ups",
    url: "https://movekit.com/exercises/pull-ups",
    title: "Pull Ups",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "assisted-pull-up-machine": {
    provider: "movekit",
    providerExerciseId: "pull-ups",
    url: "https://movekit.com/exercises/pull-ups",
    title: "Pull Ups",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "chin-up": {
    provider: "movekit",
    providerExerciseId: "chin-ups",
    url: "https://movekit.com/exercises/chin-ups",
    title: "Chin Ups",
    matchStatus: "exact_alias_or_title",
    confidence: 0.9,
    notes: "Search alias/name equals MoveKit title or slug after normalization."
  },
  "neutral-grip-pull-up": {
    provider: "movekit",
    providerExerciseId: "pull-ups",
    url: "https://movekit.com/exercises/pull-ups",
    title: "Pull Ups",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "scapular-pull-up": {
    provider: "movekit",
    providerExerciseId: "pull-ups",
    url: "https://movekit.com/exercises/pull-ups",
    title: "Pull Ups",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "lat-pulldown-wide-grip": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "lat-pulldown-close-grip": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "reverse-grip-lat-pulldown": {
    provider: "movekit",
    providerExerciseId: "machine-pulldown",
    url: "https://movekit.com/exercises/machine-pulldown",
    title: "Machine Pulldown",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "single-arm-lat-pulldown": {
    provider: "movekit",
    providerExerciseId: "machine-pulldown",
    url: "https://movekit.com/exercises/machine-pulldown",
    title: "Machine Pulldown",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "straight-arm-pulldown": {
    provider: "movekit",
    providerExerciseId: "machine-pulldown",
    url: "https://movekit.com/exercises/machine-pulldown",
    title: "Machine Pulldown",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "seated-cable-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "wide-grip-seated-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "single-arm-cable-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "barbell-bent-over-row": {
    provider: "movekit",
    providerExerciseId: "barbell-bent-over-row",
    url: "https://movekit.com/exercises/barbell-bent-over-row",
    title: "Barbell Bent Over Row",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "pendlay-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "underhand-barbell-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "one-arm-dumbbell-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "chest-supported-dumbbell-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "t-bar-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "landmine-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "meadows-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "machine-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "high-row-machine": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "inverted-row": {
    provider: "movekit",
    providerExerciseId: "inverted-row",
    url: "https://movekit.com/exercises/inverted-row",
    title: "Inverted Row",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "trx-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "renegade-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "dumbbell-pullover-back": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "machine-pullover": {
    provider: "movekit",
    providerExerciseId: "band-pullover",
    url: "https://movekit.com/exercises/band-pullover",
    title: "Band Pullover",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "deadlift": {
    provider: "movekit",
    providerExerciseId: "bodyweight-deadlift",
    url: "https://movekit.com/exercises/bodyweight-deadlift",
    title: "Bodyweight Deadlift",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "rack-pull": {
    provider: "movekit",
    providerExerciseId: "barbell-rack-pull",
    url: "https://movekit.com/exercises/barbell-rack-pull",
    title: "Barbell Rack Pull",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "snatch-grip-deadlift": {
    provider: "movekit",
    providerExerciseId: "barbell-deadlift",
    url: "https://movekit.com/exercises/barbell-deadlift",
    title: "Barbell Deadlift",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "back-extension": {
    provider: "movekit",
    providerExerciseId: "machine-45-degree-back-extension",
    url: "https://movekit.com/exercises/machine-45-degree-back-extension",
    title: "Machine 45 Degree Back Extension",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "hyperextension": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "weighted-hyperextension": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "superman-hold": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "bird-dog": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "dead-hang": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "barbell-overhead-press": {
    provider: "movekit",
    providerExerciseId: "barbell-overhead-press",
    url: "https://movekit.com/exercises/barbell-overhead-press",
    title: "Barbell Overhead Press",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "seated-barbell-overhead-press": {
    provider: "movekit",
    providerExerciseId: "barbell-overhead-press",
    url: "https://movekit.com/exercises/barbell-overhead-press",
    title: "Barbell Overhead Press",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "High token overlap (0.75) with provider naming."
  },
  "dumbbell-shoulder-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "standing-dumbbell-shoulder-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "arnold-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "machine-shoulder-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "smith-machine-shoulder-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "landmine-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "push-press": {
    provider: "movekit",
    providerExerciseId: "kettlebell-push-press",
    url: "https://movekit.com/exercises/kettlebell-push-press",
    title: "Kettlebell Push Press",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "dumbbell-lateral-raise": {
    provider: "movekit",
    providerExerciseId: "dumbbell-lateral-raise",
    url: "https://movekit.com/exercises/dumbbell-lateral-raise",
    title: "Dumbbell Lateral Raise",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "cable-lateral-raise": {
    provider: "movekit",
    providerExerciseId: "band-lateral-raise",
    url: "https://movekit.com/exercises/band-lateral-raise",
    title: "Band Lateral Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "machine-lateral-raise": {
    provider: "movekit",
    providerExerciseId: "band-lateral-raise",
    url: "https://movekit.com/exercises/band-lateral-raise",
    title: "Band Lateral Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "leaning-lateral-raise": {
    provider: "movekit",
    providerExerciseId: "band-lateral-raise",
    url: "https://movekit.com/exercises/band-lateral-raise",
    title: "Band Lateral Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "dumbbell-front-raise": {
    provider: "movekit",
    providerExerciseId: "dumbbell-front-raise",
    url: "https://movekit.com/exercises/dumbbell-front-raise",
    title: "Dumbbell Front Raise",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "plate-front-raise": {
    provider: "movekit",
    providerExerciseId: "dumbbell-front-raise",
    url: "https://movekit.com/exercises/dumbbell-front-raise",
    title: "Dumbbell Front Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "cable-front-raise": {
    provider: "movekit",
    providerExerciseId: "dumbbell-front-raise",
    url: "https://movekit.com/exercises/dumbbell-front-raise",
    title: "Dumbbell Front Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "rear-delt-dumbbell-fly": {
    provider: "movekit",
    providerExerciseId: "dumbbell-rear-delt-fly",
    url: "https://movekit.com/exercises/dumbbell-rear-delt-fly",
    title: "Dumbbell Rear Delt Fly",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "reverse-pec-deck": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "face-pull": {
    provider: "movekit",
    providerExerciseId: "band-high-face-pull",
    url: "https://movekit.com/exercises/band-high-face-pull",
    title: "Band High Face Pull",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "cable-rear-delt-fly": {
    provider: "movekit",
    providerExerciseId: "dumbbell-rear-delt-fly",
    url: "https://movekit.com/exercises/dumbbell-rear-delt-fly",
    title: "Dumbbell Rear Delt Fly",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "upright-row": {
    provider: "movekit",
    providerExerciseId: "band-row",
    url: "https://movekit.com/exercises/band-row",
    title: "Band Row",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "barbell-shrug": {
    provider: "movekit",
    providerExerciseId: "barbell-shrug",
    url: "https://movekit.com/exercises/barbell-shrug",
    title: "Barbell Shrug",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "dumbbell-shrug": {
    provider: "movekit",
    providerExerciseId: "dumbbell-shrug",
    url: "https://movekit.com/exercises/dumbbell-shrug",
    title: "Dumbbell Shrug",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "cuban-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "incline-y-raise": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "pike-push-up": {
    provider: "movekit",
    providerExerciseId: "push-up",
    url: "https://movekit.com/exercises/push-up",
    title: "Push Up",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "handstand-push-up": {
    provider: "movekit",
    providerExerciseId: "push-up",
    url: "https://movekit.com/exercises/push-up",
    title: "Push Up",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "handstand-hold": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "farmers-carry": {
    provider: "movekit",
    providerExerciseId: "kettlebell-farmers-carry",
    url: "https://movekit.com/exercises/kettlebell-farmers-carry",
    title: "Kettlebell Farmers Carry",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "overhead-carry": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "barbell-curl": {
    provider: "movekit",
    providerExerciseId: "barbell-curl",
    url: "https://movekit.com/exercises/barbell-curl",
    title: "Barbell Curl",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "ez-bar-curl": {
    provider: "movekit",
    providerExerciseId: "ez-bar-preacher-curl",
    url: "https://movekit.com/exercises/ez-bar-preacher-curl",
    title: "EZ Bar Preacher Curl",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "High token overlap (0.75) with provider naming."
  },
  "dumbbell-curl": {
    provider: "movekit",
    providerExerciseId: "dumbbell-curl",
    url: "https://movekit.com/exercises/dumbbell-curl",
    title: "Dumbbell Curl",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "alternating-dumbbell-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "hammer-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "cross-body-hammer-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "incline-dumbbell-curl": {
    provider: "movekit",
    providerExerciseId: "dumbbell-incline-curl",
    url: "https://movekit.com/exercises/dumbbell-incline-curl",
    title: "Dumbbell Incline Curl",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "concentration-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "preacher-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "machine-preacher-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "cable-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "rope-hammer-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "bayesian-cable-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "spider-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "reverse-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "zottman-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "drag-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "isometric-biceps-hold": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "chin-up-biceps-focus": {
    provider: "movekit",
    providerExerciseId: "chin-ups",
    url: "https://movekit.com/exercises/chin-ups",
    title: "Chin Ups",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: chin-ups (0.67)."
  },
  "close-grip-bench-press": {
    provider: "movekit",
    providerExerciseId: "barbell-bench-press",
    url: "https://movekit.com/exercises/barbell-bench-press",
    title: "Barbell Bench Press",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "ez-bar-skull-crusher": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "barbell-lying-triceps-extension": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "dumbbell-lying-triceps-extension": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "single-dumbbell-overhead-triceps-extension": {
    provider: "movekit",
    providerExerciseId: "dumbbell-seated-overhead-tricep-extension",
    url: "https://movekit.com/exercises/dumbbell-seated-overhead-tricep-extension",
    title: "Dumbbell Seated Overhead Tricep Extension",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: dumbbell-seated-overhead-tricep-extension (0.60)."
  },
  "two-dumbbell-overhead-triceps-extension": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "cable-overhead-triceps-extension": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "rope-triceps-pushdown": {
    provider: "movekit",
    providerExerciseId: "cable-rope-pushdown",
    url: "https://movekit.com/exercises/cable-rope-pushdown",
    title: "Cable Rope Pushdown",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: cable-rope-pushdown (0.67)."
  },
  "straight-bar-triceps-pushdown": {
    provider: "movekit",
    providerExerciseId: "cable-bar-pushdown",
    url: "https://movekit.com/exercises/cable-bar-pushdown",
    title: "Cable Bar Pushdown",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: cable-bar-pushdown (0.67)."
  },
  "reverse-grip-triceps-pushdown": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "single-arm-cable-triceps-pushdown": {
    provider: "movekit",
    providerExerciseId: "cable-single-arm-rope-pushdown",
    url: "https://movekit.com/exercises/cable-single-arm-rope-pushdown",
    title: "Cable Single Arm Rope Pushdown",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: cable-single-arm-rope-pushdown (0.67); cable-single-arm-rope-pushdown (0.60)."
  },
  "triceps-kickback": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "cable-triceps-kickback": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "triceps-dip": {
    provider: "movekit",
    providerExerciseId: "machine-dips",
    url: "https://movekit.com/exercises/machine-dips",
    title: "Machine Dips",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "weighted-triceps-dip": {
    provider: "movekit",
    providerExerciseId: "machine-dips",
    url: "https://movekit.com/exercises/machine-dips",
    title: "Machine Dips",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "assisted-triceps-dip-machine": {
    provider: "movekit",
    providerExerciseId: "machine-dips",
    url: "https://movekit.com/exercises/machine-dips",
    title: "Machine Dips",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "bench-dip": {
    provider: "movekit",
    providerExerciseId: "bench-dips",
    url: "https://movekit.com/exercises/bench-dips",
    title: "Bench Dips",
    matchStatus: "exact_alias_or_title",
    confidence: 0.9,
    notes: "Search alias/name equals MoveKit title or slug after normalization."
  },
  "diamond-push-up-triceps": {
    provider: "movekit",
    providerExerciseId: "diamond-push-ups",
    url: "https://movekit.com/exercises/diamond-push-ups",
    title: "Diamond Push Ups",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: diamond-push-ups (0.75); diamond-push-ups (0.75)."
  },
  "jm-press": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "machine-triceps-extension": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "barbell-back-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-banded-back-squat",
    url: "https://movekit.com/exercises/barbell-banded-back-squat",
    title: "Barbell Banded Back Squat",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "High token overlap (0.75) with provider naming."
  },
  "front-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "goblet-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "hack-squat-machine": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "leg-press": {
    provider: "movekit",
    providerExerciseId: "machine-leg-press",
    url: "https://movekit.com/exercises/machine-leg-press",
    title: "Machine Leg Press",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "single-leg-press": {
    provider: "movekit",
    providerExerciseId: "machine-leg-press",
    url: "https://movekit.com/exercises/machine-leg-press",
    title: "Machine Leg Press",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "leg-extension": {
    provider: "movekit",
    providerExerciseId: "machine-leg-extension",
    url: "https://movekit.com/exercises/machine-leg-extension",
    title: "Machine Leg Extension",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "single-leg-extension": {
    provider: "movekit",
    providerExerciseId: "machine-leg-extension",
    url: "https://movekit.com/exercises/machine-leg-extension",
    title: "Machine Leg Extension",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "smith-machine-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-banded-back-squat",
    url: "https://movekit.com/exercises/barbell-banded-back-squat",
    title: "Barbell Banded Back Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "pendulum-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "belt-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "safety-bar-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "zercher-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "overhead-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "split-squat-quad-focus": {
    provider: "movekit",
    providerExerciseId: "barbell-split-squat",
    url: "https://movekit.com/exercises/barbell-split-squat",
    title: "Barbell Split Squat",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: barbell-split-squat (0.67); bulgarian-split-squat (0.67)."
  },
  "bulgarian-split-squat-quad-focus": {
    provider: "movekit",
    providerExerciseId: "bulgarian-split-squat",
    url: "https://movekit.com/exercises/bulgarian-split-squat",
    title: "Bulgarian Split Squat",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "High token overlap (0.75) with provider naming."
  },
  "walking-lunge-quad-focus": {
    provider: "movekit",
    providerExerciseId: "lunge-walking",
    url: "https://movekit.com/exercises/lunge-walking",
    title: "Walking Lunge",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: lunge-walking (0.67)."
  },
  "step-down": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "sissy-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "weighted-sissy-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "cyclist-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "pistol-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "assisted-pistol-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "wall-sit": {
    provider: "movekit",
    providerExerciseId: "wall-sit",
    url: "https://movekit.com/exercises/wall-sit",
    title: "Wall Sit",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "spanish-squat-hold": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "jump-squat": {
    provider: "movekit",
    providerExerciseId: "jump-squats",
    url: "https://movekit.com/exercises/jump-squats",
    title: "Jump Squats",
    matchStatus: "exact_alias_or_title",
    confidence: 0.9,
    notes: "Search alias/name equals MoveKit title or slug after normalization."
  },
  "barbell-hip-thrust": {
    provider: "movekit",
    providerExerciseId: "dumbbell-figure-four-heels-elevated-hip-thrust",
    url: "https://movekit.com/exercises/dumbbell-figure-four-heels-elevated-hip-thrust",
    title: "Dumbbell Figure Four Heels Elevated Hip Thrust",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "smith-machine-hip-thrust": {
    provider: "movekit",
    providerExerciseId: "dumbbell-figure-four-heels-elevated-hip-thrust",
    url: "https://movekit.com/exercises/dumbbell-figure-four-heels-elevated-hip-thrust",
    title: "Dumbbell Figure Four Heels Elevated Hip Thrust",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "machine-hip-thrust": {
    provider: "movekit",
    providerExerciseId: "dumbbell-figure-four-heels-elevated-hip-thrust",
    url: "https://movekit.com/exercises/dumbbell-figure-four-heels-elevated-hip-thrust",
    title: "Dumbbell Figure Four Heels Elevated Hip Thrust",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "barbell-glute-bridge": {
    provider: "movekit",
    providerExerciseId: "dumbbell-feet-elevated-glute-bridge",
    url: "https://movekit.com/exercises/dumbbell-feet-elevated-glute-bridge",
    title: "Dumbbell Feet Elevated Glute Bridge",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "glute-bridge": {
    provider: "movekit",
    providerExerciseId: "dumbbell-feet-elevated-glute-bridge",
    url: "https://movekit.com/exercises/dumbbell-feet-elevated-glute-bridge",
    title: "Dumbbell Feet Elevated Glute Bridge",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "single-leg-glute-bridge": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "frog-pump": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "cable-pull-through": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "kettlebell-swing": {
    provider: "movekit",
    providerExerciseId: "kettlebell-swing",
    url: "https://movekit.com/exercises/kettlebell-swing",
    title: "Kettlebell Swing",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "sumo-deadlift": {
    provider: "movekit",
    providerExerciseId: "barbell-deadlift",
    url: "https://movekit.com/exercises/barbell-deadlift",
    title: "Barbell Deadlift",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "trap-bar-deadlift": {
    provider: "movekit",
    providerExerciseId: "barbell-deadlift",
    url: "https://movekit.com/exercises/barbell-deadlift",
    title: "Barbell Deadlift",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "romanian-deadlift-glute-focus": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "single-leg-romanian-deadlift-glute-focus": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "good-morning-glute-focus": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "bulgarian-split-squat-glute-focus": {
    provider: "movekit",
    providerExerciseId: "bulgarian-split-squat",
    url: "https://movekit.com/exercises/bulgarian-split-squat",
    title: "Bulgarian Split Squat",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "High token overlap (0.75) with provider naming."
  },
  "reverse-lunge-glute-focus": {
    provider: "movekit",
    providerExerciseId: "bodyweight-reverse-lunge",
    url: "https://movekit.com/exercises/bodyweight-reverse-lunge",
    title: "Bodyweight Reverse Lunge",
    matchStatus: "needs_manual_review",
    confidence: 0.3,
    notes: "Possible candidates need visual/manual check: bodyweight-reverse-lunge (0.67)."
  },
  "step-up-glute-focus": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "curtsy-lunge": {
    provider: "movekit",
    providerExerciseId: "dumbbell-goblet-alternating-curtsy-lunge",
    url: "https://movekit.com/exercises/dumbbell-goblet-alternating-curtsy-lunge",
    title: "Dumbbell Goblet Alternating Curtsy Lunge",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "cable-glute-kickback": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "machine-glute-kickback": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "donkey-kick": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "fire-hydrant": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "hip-abduction-machine": {
    provider: "movekit",
    providerExerciseId: "bodyweight-hip-abduction",
    url: "https://movekit.com/exercises/bodyweight-hip-abduction",
    title: "Bodyweight Hip Abduction",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "banded-lateral-walk": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "clamshell": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "cable-hip-abduction": {
    provider: "movekit",
    providerExerciseId: "band-hip-abduction",
    url: "https://movekit.com/exercises/band-hip-abduction",
    title: "Band Hip Abduction",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "forty-five-degree-hyperextension-glute-focus": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "sled-push-glute-focus": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "romanian-deadlift": {
    provider: "movekit",
    providerExerciseId: "band-romanian-deadlift",
    url: "https://movekit.com/exercises/band-romanian-deadlift",
    title: "Band Romanian Deadlift",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "dumbbell-romanian-deadlift": {
    provider: "movekit",
    providerExerciseId: "band-romanian-deadlift",
    url: "https://movekit.com/exercises/band-romanian-deadlift",
    title: "Band Romanian Deadlift",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "single-leg-romanian-deadlift": {
    provider: "movekit",
    providerExerciseId: "band-romanian-deadlift",
    url: "https://movekit.com/exercises/band-romanian-deadlift",
    title: "Band Romanian Deadlift",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "stiff-leg-deadlift": {
    provider: "movekit",
    providerExerciseId: "barbell-deadlift",
    url: "https://movekit.com/exercises/barbell-deadlift",
    title: "Barbell Deadlift",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "good-morning": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "lying-leg-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "seated-leg-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "standing-leg-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "single-leg-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "nordic-hamstring-curl": {
    provider: "movekit",
    providerExerciseId: "band-curl",
    url: "https://movekit.com/exercises/band-curl",
    title: "Band Curl",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "glute-ham-raise": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "standing-calf-raise": {
    provider: "movekit",
    providerExerciseId: "kettlebell-calf-raise",
    url: "https://movekit.com/exercises/kettlebell-calf-raise",
    title: "Kettlebell Calf Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "seated-calf-raise": {
    provider: "movekit",
    providerExerciseId: "kettlebell-calf-raise",
    url: "https://movekit.com/exercises/kettlebell-calf-raise",
    title: "Kettlebell Calf Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "leg-press-calf-raise": {
    provider: "movekit",
    providerExerciseId: "kettlebell-calf-raise",
    url: "https://movekit.com/exercises/kettlebell-calf-raise",
    title: "Kettlebell Calf Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "single-leg-calf-raise": {
    provider: "movekit",
    providerExerciseId: "dumbbell-single-leg-calf-raise",
    url: "https://movekit.com/exercises/dumbbell-single-leg-calf-raise",
    title: "Dumbbell Single Leg Calf Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "tibialis-raise": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "hip-adduction-machine": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "sumo-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "lateral-lunge": {
    provider: "movekit",
    providerExerciseId: "bodyweight-alternating-lateral-lunge",
    url: "https://movekit.com/exercises/bodyweight-alternating-lateral-lunge",
    title: "Bodyweight Alternating Lateral Lunge",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "cossack-squat": {
    provider: "movekit",
    providerExerciseId: "barbell-squat",
    url: "https://movekit.com/exercises/barbell-squat",
    title: "Barbell Squat",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "forward-lunge": {
    provider: "movekit",
    providerExerciseId: "forward-lunge",
    url: "https://movekit.com/exercises/forward-lunge",
    title: "Forward Lunge",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "reverse-lunge": {
    provider: "movekit",
    providerExerciseId: "bodyweight-reverse-lunge",
    url: "https://movekit.com/exercises/bodyweight-reverse-lunge",
    title: "Bodyweight Reverse Lunge",
    matchStatus: "renamed_match",
    confidence: 0.75,
    notes: "Same normalized tokens, different word order or provider naming."
  },
  "walking-lunge": {
    provider: "movekit",
    providerExerciseId: "lunge-walking",
    url: "https://movekit.com/exercises/lunge-walking",
    title: "Walking Lunge",
    matchStatus: "exact_alias_or_title",
    confidence: 0.9,
    notes: "Search alias/name equals MoveKit title or slug after normalization."
  },
  "step-up": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "box-jump": {
    provider: "movekit",
    providerExerciseId: "box-jump",
    url: "https://movekit.com/exercises/box-jump",
    title: "Box Jump",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "broad-jump": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "lateral-bound": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "sled-drag": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "sled-pull": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "walking-calf-raise": {
    provider: "movekit",
    providerExerciseId: "kettlebell-calf-raise",
    url: "https://movekit.com/exercises/kettlebell-calf-raise",
    title: "Kettlebell Calf Raise",
    matchStatus: "reusable_asset",
    confidence: 0.55,
    notes: "Temporary fallback: close base movement exists, but loading/modifier differs."
  },
  "stepmill-strength": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "treadmill-run": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "outdoor-run": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "easy-walk": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "incline-treadmill-walk": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "stair-climber": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "elliptical": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "exercise-bike": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "spin-bike": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "outdoor-cycling": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "rowing-machine": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "ski-erg": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "air-bike": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "assault-runner": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "jump-rope": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "battle-ropes": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "burpee": {
    provider: "movekit",
    providerExerciseId: "burpee",
    url: "https://movekit.com/exercises/burpee",
    title: "Burpee",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "mountain-climber": {
    provider: "movekit",
    providerExerciseId: "mountain-climber",
    url: "https://movekit.com/exercises/mountain-climber",
    title: "Mountain Climber",
    matchStatus: "exact_slug",
    confidence: 1,
    notes: "Catalog id equals MoveKit slug."
  },
  "high-knees": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "jumping-jacks": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "shadow-boxing": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "swimming": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "sled-push-cardio": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "sled-pull-cardio": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "step-aerobics": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "hiit-bodyweight": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "rowing-intervals": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "shoulder-circles": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "band-shoulder-dislocates": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "scapular-wall-slide": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "band-pull-apart": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "doorway-chest-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "pec-minor-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "lat-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "child-pose-lat-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "cat-cow": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "thoracic-rotation": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "thread-the-needle": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "worlds-greatest-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "hip-flexor-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "standing-quad-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "couch-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "hamstring-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "calf-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "ankle-mobility-rocks": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "pigeon-pose": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "figure-four-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "ninety-ninety-hip-switch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "deep-squat-hold": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "biceps-wall-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "triceps-overhead-stretch": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "dead-hang-mobility": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "prone-cobra-hold": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "shoulder-external-rotation-band": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  },
  "shoulder-internal-rotation-band": {
    provider: "movekit",
    matchStatus: "not_found",
    confidence: 0,
    notes: "No close public MoveKit page found by slug, alias, title, or token overlap."
  }
} satisfies Record<string, MoveKitExerciseMediaDraft>;
