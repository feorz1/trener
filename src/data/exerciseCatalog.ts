// Built-in exercise catalog for the local seed data.
// Uses only muscle keys currently supported by the Exercises UI.

import type { Exercise, WorkoutResultType } from "@/types";

export type ExerciseCatalogItem = Omit<Exercise, "ownerId" | "source" | "archivedAt" | "createdAt" | "updatedAt"> & {
  resultType: WorkoutResultType;
};

export const exerciseCatalog = [

  // Грудь (chest)
  {
      "id": "barbell-bench-press",
      "name": "Жим штанги лежа",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Штанга, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "жим лежа",
          "bench press",
          "barbell bench press"
      ]
  },
  {
      "id": "dumbbell-bench-press",
      "name": "Жим гантелей лежа",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Гантели, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "жим гантелей",
          "dumbbell bench press"
      ]
  },
  {
      "id": "incline-barbell-bench-press",
      "name": "Жим штанги на наклонной скамье",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders",
          "triceps"
      ],
      "equipment": "Штанга, наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "наклонный жим",
          "incline bench press"
      ]
  },
  {
      "id": "incline-dumbbell-bench-press",
      "name": "Жим гантелей на наклонной скамье",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders",
          "triceps"
      ],
      "equipment": "Гантели, наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "наклонный жим гантелей",
          "incline dumbbell press"
      ]
  },
  {
      "id": "decline-barbell-bench-press",
      "name": "Жим штанги на обратно-наклонной скамье",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Штанга, обратно-наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "decline bench press",
          "жим вниз головой"
      ]
  },
  {
      "id": "decline-dumbbell-bench-press",
      "name": "Жим гантелей на обратно-наклонной скамье",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Гантели, обратно-наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "decline dumbbell press",
          "жим гантелей вниз головой"
      ]
  },
  {
      "id": "smith-machine-bench-press",
      "name": "Жим лежа в Смите",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Тренажер Смита, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "жим в смите",
          "smith bench press"
      ]
  },
  {
      "id": "machine-chest-press",
      "name": "Жим от груди в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Тренажер для жима от груди",
      "resultType": "weight_reps",
      "searchAliases": [
          "chest press",
          "хаммер жим грудь"
      ]
  },
  {
      "id": "seated-cable-chest-press",
      "name": "Жим от груди в кроссовере сидя",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Кроссовер, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable chest press",
          "жим в кроссовере"
      ]
  },
  {
      "id": "barbell-floor-press",
      "name": "Жим штанги с пола",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "floor press",
          "жим с пола"
      ]
  },
  {
      "id": "dumbbell-floor-press",
      "name": "Жим гантелей с пола",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "dumbbell floor press",
          "жим гантелей с пола"
      ]
  },
  {
      "id": "dumbbell-fly",
      "name": "Разведение гантелей лежа",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Гантели, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "разводка гантелей",
          "dumbbell fly"
      ]
  },
  {
      "id": "incline-dumbbell-fly",
      "name": "Разведение гантелей на наклонной скамье",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Гантели, наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "наклонная разводка",
          "incline dumbbell fly"
      ]
  },
  {
      "id": "cable-fly",
      "name": "Сведение рук в кроссовере",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Кроссовер",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable fly",
          "кроссовер грудь"
      ]
  },
  {
      "id": "high-to-low-cable-fly",
      "name": "Сведение рук в кроссовере сверху вниз",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Кроссовер",
      "resultType": "weight_reps",
      "searchAliases": [
          "high to low cable fly",
          "кроссовер сверху вниз"
      ]
  },
  {
      "id": "low-to-high-cable-fly",
      "name": "Сведение рук в кроссовере снизу вверх",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Кроссовер",
      "resultType": "weight_reps",
      "searchAliases": [
          "low to high cable fly",
          "кроссовер снизу вверх"
      ]
  },
  {
      "id": "pec-deck-fly",
      "name": "Сведение рук в тренажере бабочка",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Тренажер бабочка",
      "resultType": "weight_reps",
      "searchAliases": [
          "pec deck",
          "бабочка грудь"
      ]
  },
  {
      "id": "plate-squeeze-press",
      "name": "Жим блина перед собой",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders",
          "triceps"
      ],
      "equipment": "Блин",
      "resultType": "weight_reps",
      "searchAliases": [
          "svend press",
          "свенд пресс",
          "plate press"
      ]
  },
  {
      "id": "dumbbell-pullover-chest",
      "name": "Пуловер с гантелью с акцентом на грудь",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Гантель, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "pullover",
          "пуловер грудь"
      ]
  },
  {
      "id": "push-up",
      "name": "Отжимания от пола",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "отжимания",
          "push up",
          "push-up"
      ]
  },
  {
      "id": "weighted-push-up",
      "name": "Отжимания с дополнительным весом",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Блин или жилет",
      "resultType": "weighted_bodyweight",
      "searchAliases": [
          "отжимания с весом",
          "weighted push up"
      ]
  },
  {
      "id": "knee-push-up",
      "name": "Отжимания с колен",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "женские отжимания",
          "knee push up"
      ]
  },
  {
      "id": "incline-push-up",
      "name": "Отжимания от опоры",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Собственный вес, опора",
      "resultType": "reps_only",
      "searchAliases": [
          "incline push up",
          "отжимания от скамьи"
      ]
  },
  {
      "id": "decline-push-up",
      "name": "Отжимания с ногами на возвышении",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders",
          "triceps"
      ],
      "equipment": "Собственный вес, опора",
      "resultType": "reps_only",
      "searchAliases": [
          "decline push up",
          "отжимания ноги на скамье"
      ]
  },
  {
      "id": "diamond-push-up-chest",
      "name": "Узкие отжимания с акцентом на грудь",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "diamond push up",
          "узкие отжимания"
      ]
  },
  {
      "id": "chest-dip",
      "name": "Отжимания на брусьях с акцентом на грудь",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Брусья",
      "resultType": "reps_only",
      "searchAliases": [
          "брусья грудь",
          "chest dip"
      ]
  },
  {
      "id": "weighted-chest-dip",
      "name": "Отжимания на брусьях с весом с акцентом на грудь",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Брусья, пояс с отягощением",
      "resultType": "weighted_bodyweight",
      "searchAliases": [
          "weighted dip",
          "брусья с весом грудь"
      ]
  },
  {
      "id": "assisted-chest-dip-machine",
      "name": "Отжимания на брусьях в гравитроне с акцентом на грудь",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Гравитрон",
      "resultType": "assisted_bodyweight",
      "searchAliases": [
          "assisted dip",
          "брусья с ассистом грудь"
      ]
  },
  {
      "id": "plyometric-push-up",
      "name": "Плиометрические отжимания",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "взрывные отжимания",
          "plyo push up"
      ]
  },
  {
      "id": "medicine-ball-chest-pass",
      "name": "Бросок медбола от груди",
      "category": "strength",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "triceps",
          "shoulders"
      ],
      "equipment": "Медбол",
      "resultType": "reps_only",
      "searchAliases": [
          "medicine ball chest pass",
          "бросок мяча от груди"
      ]
  },

  // Спина (back)
  {
      "id": "pull-up",
      "name": "Подтягивания",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Турник",
      "resultType": "reps_only",
      "searchAliases": [
          "подтягивание",
          "pull up",
          "pull-up"
      ]
  },
  {
      "id": "weighted-pull-up",
      "name": "Подтягивания с дополнительным весом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Турник, пояс с отягощением",
      "resultType": "weighted_bodyweight",
      "searchAliases": [
          "подтягивания с весом",
          "weighted pull up"
      ]
  },
  {
      "id": "assisted-pull-up-machine",
      "name": "Подтягивания в гравитроне",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Гравитрон",
      "resultType": "assisted_bodyweight",
      "searchAliases": [
          "подтягивания с ассистом",
          "assisted pull up"
      ]
  },
  {
      "id": "chin-up",
      "name": "Подтягивания обратным хватом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Турник",
      "resultType": "reps_only",
      "searchAliases": [
          "chin up",
          "подтягивания на бицепс"
      ]
  },
  {
      "id": "neutral-grip-pull-up",
      "name": "Подтягивания нейтральным хватом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Турник",
      "resultType": "reps_only",
      "searchAliases": [
          "neutral grip pull up",
          "параллельный хват"
      ]
  },
  {
      "id": "scapular-pull-up",
      "name": "Лопаточные подтягивания",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Турник",
      "resultType": "reps_only",
      "searchAliases": [
          "scapular pull up",
          "подтягивания лопатками"
      ]
  },
  {
      "id": "lat-pulldown-wide-grip",
      "name": "Тяга верхнего блока широким хватом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Верхний блок",
      "resultType": "weight_reps",
      "searchAliases": [
          "верхний блок",
          "lat pulldown"
      ]
  },
  {
      "id": "lat-pulldown-close-grip",
      "name": "Тяга верхнего блока узким хватом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Верхний блок, узкая рукоять",
      "resultType": "weight_reps",
      "searchAliases": [
          "close grip pulldown",
          "тяга блока узким хватом"
      ]
  },
  {
      "id": "reverse-grip-lat-pulldown",
      "name": "Тяга верхнего блока обратным хватом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Верхний блок",
      "resultType": "weight_reps",
      "searchAliases": [
          "reverse grip pulldown",
          "обратный хват верхний блок"
      ]
  },
  {
      "id": "single-arm-lat-pulldown",
      "name": "Тяга верхнего блока одной рукой",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Верхний блок, рукоять",
      "resultType": "weight_reps",
      "searchAliases": [
          "single arm pulldown",
          "тяга блока одной рукой"
      ]
  },
  {
      "id": "straight-arm-pulldown",
      "name": "Тяга верхнего блока прямыми руками",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Кроссовер или верхний блок",
      "resultType": "weight_reps",
      "searchAliases": [
          "straight arm pulldown",
          "пуловер на блоке"
      ]
  },
  {
      "id": "seated-cable-row",
      "name": "Горизонтальная тяга блока сидя",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Нижний блок",
      "resultType": "weight_reps",
      "searchAliases": [
          "seated cable row",
          "тяга горизонтального блока"
      ]
  },
  {
      "id": "wide-grip-seated-row",
      "name": "Горизонтальная тяга широким хватом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps",
          "shoulders"
      ],
      "equipment": "Нижний блок, широкая рукоять",
      "resultType": "weight_reps",
      "searchAliases": [
          "wide grip row",
          "тяга широким хватом сидя"
      ]
  },
  {
      "id": "single-arm-cable-row",
      "name": "Тяга нижнего блока одной рукой",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Нижний блок, рукоять",
      "resultType": "weight_reps",
      "searchAliases": [
          "single arm cable row",
          "тяга блока одной рукой сидя"
      ]
  },
  {
      "id": "barbell-bent-over-row",
      "name": "Тяга штанги в наклоне",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "barbell row",
          "тяга штанги к поясу"
      ]
  },
  {
      "id": "pendlay-row",
      "name": "Тяга Пендлея",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "pendlay row",
          "тяга с пола"
      ]
  },
  {
      "id": "underhand-barbell-row",
      "name": "Тяга штанги в наклоне обратным хватом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "underhand row",
          "тяга штанги обратным хватом"
      ]
  },
  {
      "id": "one-arm-dumbbell-row",
      "name": "Тяга гантели одной рукой",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантель, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "dumbbell row",
          "тяга гантели к поясу"
      ]
  },
  {
      "id": "chest-supported-dumbbell-row",
      "name": "Тяга гантелей лежа на наклонной скамье",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps",
          "shoulders"
      ],
      "equipment": "Гантели, наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "chest supported row",
          "тяга с упором грудью"
      ]
  },
  {
      "id": "t-bar-row",
      "name": "Тяга Т-грифа",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Т-гриф",
      "resultType": "weight_reps",
      "searchAliases": [
          "t bar row",
          "тяга т грифа"
      ]
  },
  {
      "id": "landmine-row",
      "name": "Тяга штанги в упоре landmine",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Штанга, landmine",
      "resultType": "weight_reps",
      "searchAliases": [
          "landmine row",
          "тяга landmine"
      ]
  },
  {
      "id": "meadows-row",
      "name": "Тяга Медоуза",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Штанга, landmine",
      "resultType": "weight_reps",
      "searchAliases": [
          "meadows row",
          "тяга медоуза"
      ]
  },
  {
      "id": "machine-row",
      "name": "Тяга в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Тренажер для тяги",
      "resultType": "weight_reps",
      "searchAliases": [
          "machine row",
          "хаммер тяга"
      ]
  },
  {
      "id": "high-row-machine",
      "name": "Высокая тяга в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Тренажер высокая тяга",
      "resultType": "weight_reps",
      "searchAliases": [
          "high row",
          "тяга сверху в тренажере"
      ]
  },
  {
      "id": "inverted-row",
      "name": "Австралийские подтягивания",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Низкая перекладина или петли",
      "resultType": "reps_only",
      "searchAliases": [
          "inverted row",
          "горизонтальные подтягивания"
      ]
  },
  {
      "id": "trx-row",
      "name": "Тяга в петлях TRX",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "biceps"
      ],
      "equipment": "Петли TRX",
      "resultType": "reps_only",
      "searchAliases": [
          "suspension row",
          "тяга trx"
      ]
  },
  {
      "id": "renegade-row",
      "name": "Тяга гантелей в планке",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders",
          "chest"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "renegade row",
          "тяга в планке"
      ]
  },
  {
      "id": "dumbbell-pullover-back",
      "name": "Пуловер с гантелью с акцентом на спину",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "chest"
      ],
      "equipment": "Гантель, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "pullover back",
          "пуловер спина"
      ]
  },
  {
      "id": "machine-pullover",
      "name": "Пуловер в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "chest"
      ],
      "equipment": "Тренажер пуловер",
      "resultType": "weight_reps",
      "searchAliases": [
          "pullover machine",
          "пуловер тренажер"
      ]
  },
  {
      "id": "deadlift",
      "name": "Становая тяга",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "deadlift",
          "классическая становая"
      ]
  },
  {
      "id": "rack-pull",
      "name": "Тяга с плинтов",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Штанга, стойки",
      "resultType": "weight_reps",
      "searchAliases": [
          "rack pull",
          "становая с плинтов"
      ]
  },
  {
      "id": "snatch-grip-deadlift",
      "name": "Становая тяга рывковым хватом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "legs",
          "glutes"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "snatch grip deadlift",
          "становая широким хватом"
      ]
  },
  {
      "id": "back-extension",
      "name": "Разгибание спины в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Тренажер для разгибания спины",
      "resultType": "weight_reps",
      "searchAliases": [
          "back extension machine",
          "разгибание корпуса"
      ]
  },
  {
      "id": "hyperextension",
      "name": "Гиперэкстензия",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Римский стул",
      "resultType": "reps_only",
      "searchAliases": [
          "hyperextension",
          "гиперы"
      ]
  },
  {
      "id": "weighted-hyperextension",
      "name": "Гиперэкстензия с весом",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Римский стул, блин",
      "resultType": "weight_reps",
      "searchAliases": [
          "weighted hyperextension",
          "гиперэкстензия с блином"
      ]
  },
  {
      "id": "superman-hold",
      "name": "Супермен удержание",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "glutes"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "superman hold",
          "лодочка удержание"
      ]
  },
  {
      "id": "bird-dog",
      "name": "Птица-собака",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "glutes",
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "side_reps",
      "searchAliases": [
          "bird dog",
          "bird-dog"
      ]
  },
  {
      "id": "dead-hang",
      "name": "Вис на турнике",
      "category": "strength",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Турник",
      "resultType": "duration_hold",
      "searchAliases": [
          "dead hang",
          "вис"
      ]
  },

  // Плечи (shoulders)
  {
      "id": "barbell-overhead-press",
      "name": "Жим штанги стоя",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "overhead press",
          "military press",
          "армейский жим"
      ]
  },
  {
      "id": "seated-barbell-overhead-press",
      "name": "Жим штанги сидя",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Штанга, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "seated military press",
          "жим сидя"
      ]
  },
  {
      "id": "dumbbell-shoulder-press",
      "name": "Жим гантелей сидя",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Гантели, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "dumbbell shoulder press",
          "жим гантелей на плечи"
      ]
  },
  {
      "id": "standing-dumbbell-shoulder-press",
      "name": "Жим гантелей стоя",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "standing dumbbell press",
          "жим гантелей стоя"
      ]
  },
  {
      "id": "arnold-press",
      "name": "Жим Арнольда",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "arnold press",
          "жим арнольда"
      ]
  },
  {
      "id": "machine-shoulder-press",
      "name": "Жим плечами в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Тренажер для жима плечами",
      "resultType": "weight_reps",
      "searchAliases": [
          "shoulder press machine",
          "жим в тренажере плечи"
      ]
  },
  {
      "id": "smith-machine-shoulder-press",
      "name": "Жим в Смите на плечи",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Тренажер Смита, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "smith shoulder press",
          "жим смита плечи"
      ]
  },
  {
      "id": "landmine-press",
      "name": "Жим landmine одной рукой",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "chest",
          "triceps"
      ],
      "equipment": "Штанга, landmine",
      "resultType": "weight_reps",
      "searchAliases": [
          "landmine press",
          "жим штанги в угол"
      ]
  },
  {
      "id": "push-press",
      "name": "Швунг жимовой",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps",
          "quads"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "push press",
          "жимовой швунг"
      ]
  },
  {
      "id": "dumbbell-lateral-raise",
      "name": "Подъем гантелей через стороны",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "lateral raise",
          "махи в стороны"
      ]
  },
  {
      "id": "cable-lateral-raise",
      "name": "Подъем руки в сторону в кроссовере",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "equipment": "Кроссовер",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable lateral raise",
          "махи в кроссовере"
      ]
  },
  {
      "id": "machine-lateral-raise",
      "name": "Махи в стороны в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "equipment": "Тренажер для махов",
      "resultType": "weight_reps",
      "searchAliases": [
          "machine lateral raise",
          "разведение плечи тренажер"
      ]
  },
  {
      "id": "leaning-lateral-raise",
      "name": "Подъем гантели в сторону с наклоном",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "equipment": "Гантель, опора",
      "resultType": "weight_reps",
      "searchAliases": [
          "leaning lateral raise",
          "махи с наклоном"
      ]
  },
  {
      "id": "dumbbell-front-raise",
      "name": "Подъем гантелей перед собой",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "chest"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "front raise",
          "махи перед собой"
      ]
  },
  {
      "id": "plate-front-raise",
      "name": "Подъем блина перед собой",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "chest"
      ],
      "equipment": "Блин",
      "resultType": "weight_reps",
      "searchAliases": [
          "plate front raise",
          "подъем блина"
      ]
  },
  {
      "id": "cable-front-raise",
      "name": "Подъем рук перед собой в кроссовере",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "chest"
      ],
      "equipment": "Кроссовер",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable front raise",
          "передняя дельта кроссовер"
      ]
  },
  {
      "id": "rear-delt-dumbbell-fly",
      "name": "Разведение гантелей в наклоне",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "rear delt fly",
          "махи в наклоне"
      ]
  },
  {
      "id": "reverse-pec-deck",
      "name": "Обратная бабочка",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Тренажер бабочка",
      "resultType": "weight_reps",
      "searchAliases": [
          "reverse pec deck",
          "задняя дельта тренажер"
      ]
  },
  {
      "id": "face-pull",
      "name": "Тяга каната к лицу",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Кроссовер, канат",
      "resultType": "weight_reps",
      "searchAliases": [
          "face pull",
          "тяга к лицу"
      ]
  },
  {
      "id": "cable-rear-delt-fly",
      "name": "Разведение рук в кроссовере на заднюю дельту",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Кроссовер",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable rear delt fly",
          "задняя дельта кроссовер"
      ]
  },
  {
      "id": "upright-row",
      "name": "Тяга штанги к подбородку",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back",
          "biceps"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "upright row",
          "протяжка"
      ]
  },
  {
      "id": "barbell-shrug",
      "name": "Шраги со штангой",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "shrugs",
          "шраги"
      ]
  },
  {
      "id": "dumbbell-shrug",
      "name": "Шраги с гантелями",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "dumbbell shrugs",
          "шраги гантели"
      ]
  },
  {
      "id": "cuban-press",
      "name": "Кубинский жим",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "cuban press",
          "кубинский жим"
      ]
  },
  {
      "id": "incline-y-raise",
      "name": "Y-подъемы на наклонной скамье",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Гантели, наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "y raise",
          "подъемы y"
      ]
  },
  {
      "id": "pike-push-up",
      "name": "Отжимания уголком",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps",
          "chest"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "pike push up",
          "отжимания домиком"
      ]
  },
  {
      "id": "handstand-push-up",
      "name": "Отжимания в стойке на руках",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Собственный вес, стена",
      "resultType": "reps_only",
      "searchAliases": [
          "handstand push up",
          "hspu"
      ]
  },
  {
      "id": "handstand-hold",
      "name": "Стойка на руках у стены",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps"
      ],
      "equipment": "Стена",
      "resultType": "duration_hold",
      "searchAliases": [
          "handstand hold",
          "стойка на руках удержание"
      ]
  },
  {
      "id": "farmers-carry",
      "name": "Фермерская прогулка",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back",
          "legs"
      ],
      "equipment": "Гантели или гири",
      "resultType": "distance_time",
      "searchAliases": [
          "farmer carry",
          "фермерская ходьба"
      ]
  },
  {
      "id": "overhead-carry",
      "name": "Прогулка с весом над головой",
      "category": "strength",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "triceps",
          "back"
      ],
      "equipment": "Гантели или гири",
      "resultType": "distance_time",
      "searchAliases": [
          "overhead carry",
          "переноска над головой"
      ]
  },

  // Бицепс (biceps)
  {
      "id": "barbell-curl",
      "name": "Сгибание рук со штангой",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "подъем штанги на бицепс",
          "barbell curl"
      ]
  },
  {
      "id": "ez-bar-curl",
      "name": "Сгибание рук с EZ-грифом",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "EZ-гриф",
      "resultType": "weight_reps",
      "searchAliases": [
          "ez curl",
          "подъем ez на бицепс"
      ]
  },
  {
      "id": "dumbbell-curl",
      "name": "Сгибание рук с гантелями",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "dumbbell curl",
          "подъем гантелей на бицепс"
      ]
  },
  {
      "id": "alternating-dumbbell-curl",
      "name": "Попеременное сгибание рук с гантелями",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "alternating curl",
          "попеременный подъем"
      ]
  },
  {
      "id": "hammer-curl",
      "name": "Молотковые сгибания с гантелями",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "hammer curl",
          "молотки"
      ]
  },
  {
      "id": "cross-body-hammer-curl",
      "name": "Молотковые сгибания поперек корпуса",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "cross body hammer curl",
          "молотки через корпус"
      ]
  },
  {
      "id": "incline-dumbbell-curl",
      "name": "Сгибание рук с гантелями на наклонной скамье",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантели, наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "incline curl",
          "бицепс на наклонной"
      ]
  },
  {
      "id": "concentration-curl",
      "name": "Концентрированное сгибание на бицепс",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантель",
      "resultType": "weight_reps",
      "searchAliases": [
          "concentration curl",
          "концентрированный подъем"
      ]
  },
  {
      "id": "preacher-curl",
      "name": "Сгибание рук на скамье Скотта",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Скамья Скотта, EZ-гриф",
      "resultType": "weight_reps",
      "searchAliases": [
          "preacher curl",
          "скамья скотта"
      ]
  },
  {
      "id": "machine-preacher-curl",
      "name": "Сгибание рук в тренажере Скотта",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Тренажер Скотта",
      "resultType": "weight_reps",
      "searchAliases": [
          "machine preacher curl",
          "бицепс тренажер скотта"
      ]
  },
  {
      "id": "cable-curl",
      "name": "Сгибание рук на нижнем блоке",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Нижний блок",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable curl",
          "бицепс на блоке"
      ]
  },
  {
      "id": "rope-hammer-curl",
      "name": "Молотковые сгибания с канатом на блоке",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Нижний блок, канат",
      "resultType": "weight_reps",
      "searchAliases": [
          "rope hammer curl",
          "молотки с канатом"
      ]
  },
  {
      "id": "bayesian-cable-curl",
      "name": "Байесовское сгибание на бицепс",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Кроссовер",
      "resultType": "weight_reps",
      "searchAliases": [
          "bayesian curl",
          "bayesian cable curl"
      ]
  },
  {
      "id": "spider-curl",
      "name": "Паучьи сгибания на бицепс",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантели или EZ-гриф, наклонная скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "spider curl",
          "паучий подъем"
      ]
  },
  {
      "id": "reverse-curl",
      "name": "Сгибание рук обратным хватом",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Штанга или EZ-гриф",
      "resultType": "weight_reps",
      "searchAliases": [
          "reverse curl",
          "обратный подъем"
      ]
  },
  {
      "id": "zottman-curl",
      "name": "Сгибание Зоттмана",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "zottman curl",
          "подъем зоттмана"
      ]
  },
  {
      "id": "drag-curl",
      "name": "Сгибание рук drag curl",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "drag curl",
          "протяжка на бицепс"
      ]
  },
  {
      "id": "isometric-biceps-hold",
      "name": "Изометрическое удержание на бицепс",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "equipment": "Гантели или штанга",
      "resultType": "duration_hold",
      "searchAliases": [
          "biceps hold",
          "изометрия бицепс"
      ]
  },
  {
      "id": "chin-up-biceps-focus",
      "name": "Подтягивания обратным хватом с акцентом на бицепс",
      "category": "strength",
      "primaryMuscles": [
          "biceps"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Турник",
      "resultType": "reps_only",
      "searchAliases": [
          "chin up biceps",
          "подтягивания на бицепс"
      ]
  },

  // Трицепс (triceps)
  {
      "id": "close-grip-bench-press",
      "name": "Жим штанги узким хватом",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "chest",
          "shoulders"
      ],
      "equipment": "Штанга, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "close grip bench press",
          "узкий жим"
      ]
  },
  {
      "id": "ez-bar-skull-crusher",
      "name": "Французский жим лежа с EZ-грифом",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "EZ-гриф, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "skull crusher",
          "французский жим лежа"
      ]
  },
  {
      "id": "barbell-lying-triceps-extension",
      "name": "Французский жим лежа со штангой",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Штанга, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "lying triceps extension",
          "французский со штангой"
      ]
  },
  {
      "id": "dumbbell-lying-triceps-extension",
      "name": "Разгибание рук с гантелями лежа",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Гантели, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "dumbbell skull crusher",
          "разгибание гантелей лежа"
      ]
  },
  {
      "id": "single-dumbbell-overhead-triceps-extension",
      "name": "Разгибание одной гантели из-за головы",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Гантель",
      "resultType": "weight_reps",
      "searchAliases": [
          "overhead dumbbell extension",
          "гантель из-за головы"
      ]
  },
  {
      "id": "two-dumbbell-overhead-triceps-extension",
      "name": "Разгибание двух гантелей из-за головы",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "two dumbbell overhead extension",
          "разгибание гантелей из-за головы"
      ]
  },
  {
      "id": "cable-overhead-triceps-extension",
      "name": "Разгибание рук из-за головы на блоке",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Кроссовер, канат",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable overhead extension",
          "трицепс из-за головы блок"
      ]
  },
  {
      "id": "rope-triceps-pushdown",
      "name": "Разгибание рук с канатом на блоке",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Верхний блок, канат",
      "resultType": "weight_reps",
      "searchAliases": [
          "rope pushdown",
          "канат на трицепс"
      ]
  },
  {
      "id": "straight-bar-triceps-pushdown",
      "name": "Разгибание рук с прямой рукоятью на блоке",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Верхний блок, прямая рукоять",
      "resultType": "weight_reps",
      "searchAliases": [
          "bar pushdown",
          "трицепс блок прямая рукоять"
      ]
  },
  {
      "id": "reverse-grip-triceps-pushdown",
      "name": "Разгибание рук обратным хватом на блоке",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Верхний блок",
      "resultType": "weight_reps",
      "searchAliases": [
          "reverse grip pushdown",
          "обратный хват трицепс"
      ]
  },
  {
      "id": "single-arm-cable-triceps-pushdown",
      "name": "Разгибание одной руки на блоке",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Верхний блок, рукоять",
      "resultType": "weight_reps",
      "searchAliases": [
          "single arm pushdown",
          "разгибание одной рукой"
      ]
  },
  {
      "id": "triceps-kickback",
      "name": "Разгибание руки назад с гантелью",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Гантель",
      "resultType": "weight_reps",
      "searchAliases": [
          "kickback",
          "трицепс кикбэк"
      ]
  },
  {
      "id": "cable-triceps-kickback",
      "name": "Разгибание руки назад в кроссовере",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Кроссовер",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable kickback",
          "кикбэк в кроссовере"
      ]
  },
  {
      "id": "triceps-dip",
      "name": "Отжимания на брусьях с акцентом на трицепс",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "chest",
          "shoulders"
      ],
      "equipment": "Брусья",
      "resultType": "reps_only",
      "searchAliases": [
          "triceps dip",
          "брусья трицепс"
      ]
  },
  {
      "id": "weighted-triceps-dip",
      "name": "Отжимания на брусьях с весом с акцентом на трицепс",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "chest",
          "shoulders"
      ],
      "equipment": "Брусья, пояс с отягощением",
      "resultType": "weighted_bodyweight",
      "searchAliases": [
          "weighted triceps dip",
          "брусья с весом трицепс"
      ]
  },
  {
      "id": "assisted-triceps-dip-machine",
      "name": "Отжимания на брусьях в гравитроне с акцентом на трицепс",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "chest",
          "shoulders"
      ],
      "equipment": "Гравитрон",
      "resultType": "assisted_bodyweight",
      "searchAliases": [
          "assisted triceps dip",
          "брусья в гравитроне трицепс"
      ]
  },
  {
      "id": "bench-dip",
      "name": "Обратные отжимания от скамьи",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "chest",
          "shoulders"
      ],
      "equipment": "Скамья",
      "resultType": "reps_only",
      "searchAliases": [
          "bench dip",
          "обратные отжимания"
      ]
  },
  {
      "id": "diamond-push-up-triceps",
      "name": "Алмазные отжимания с акцентом на трицепс",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "chest",
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "diamond push up triceps",
          "алмазные отжимания"
      ]
  },
  {
      "id": "jm-press",
      "name": "JM-жим",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "chest",
          "shoulders"
      ],
      "equipment": "Штанга, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "jm press",
          "джей эм жим"
      ]
  },
  {
      "id": "machine-triceps-extension",
      "name": "Разгибание рук в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "triceps"
      ],
      "equipment": "Тренажер для трицепса",
      "resultType": "weight_reps",
      "searchAliases": [
          "machine triceps extension",
          "трицепс тренажер"
      ]
  },

  // Квадрицепс (quads)
  {
      "id": "barbell-back-squat",
      "name": "Приседания со штангой на спине",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Штанга, стойки",
      "resultType": "weight_reps",
      "searchAliases": [
          "back squat",
          "присед"
      ]
  },
  {
      "id": "front-squat",
      "name": "Фронтальные приседания",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Штанга, стойки",
      "resultType": "weight_reps",
      "searchAliases": [
          "front squat",
          "приседания на груди"
      ]
  },
  {
      "id": "goblet-squat",
      "name": "Гоблет-присед",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Гантель или гиря",
      "resultType": "weight_reps",
      "searchAliases": [
          "goblet squat",
          "кубковый присед"
      ]
  },
  {
      "id": "hack-squat-machine",
      "name": "Гакк-приседания",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Гакк-тренажер",
      "resultType": "weight_reps",
      "searchAliases": [
          "hack squat",
          "гакк присед"
      ]
  },
  {
      "id": "leg-press",
      "name": "Жим ногами",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Тренажер жим ногами",
      "resultType": "weight_reps",
      "searchAliases": [
          "leg press",
          "жим платформы"
      ]
  },
  {
      "id": "single-leg-press",
      "name": "Жим одной ногой в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Тренажер жим ногами",
      "resultType": "weight_reps",
      "searchAliases": [
          "single leg press",
          "жим ногой"
      ]
  },
  {
      "id": "leg-extension",
      "name": "Разгибание ног в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "equipment": "Тренажер разгибание ног",
      "resultType": "weight_reps",
      "searchAliases": [
          "leg extension",
          "разгибания ног"
      ]
  },
  {
      "id": "single-leg-extension",
      "name": "Разгибание одной ноги в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "equipment": "Тренажер разгибание ног",
      "resultType": "weight_reps",
      "searchAliases": [
          "single leg extension",
          "разгибание одной ноги"
      ]
  },
  {
      "id": "smith-machine-squat",
      "name": "Приседания в Смите",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Тренажер Смита",
      "resultType": "weight_reps",
      "searchAliases": [
          "smith squat",
          "присед в смите"
      ]
  },
  {
      "id": "pendulum-squat",
      "name": "Маятниковые приседания",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Маятниковый тренажер",
      "resultType": "weight_reps",
      "searchAliases": [
          "pendulum squat",
          "маятниковый присед"
      ]
  },
  {
      "id": "belt-squat",
      "name": "Приседания с поясом",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Тренажер belt squat",
      "resultType": "weight_reps",
      "searchAliases": [
          "belt squat",
          "поясной присед"
      ]
  },
  {
      "id": "safety-bar-squat",
      "name": "Приседания с safety bar",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Safety bar, стойки",
      "resultType": "weight_reps",
      "searchAliases": [
          "safety bar squat",
          "присед с safety bar"
      ]
  },
  {
      "id": "zercher-squat",
      "name": "Приседания Зерхера",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "zercher squat",
          "присед зерхера"
      ]
  },
  {
      "id": "overhead-squat",
      "name": "Приседания со штангой над головой",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "shoulders",
          "glutes"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "overhead squat",
          "присед над головой"
      ]
  },
  {
      "id": "split-squat-quad-focus",
      "name": "Сплит-присед с акцентом на квадрицепс",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Гантели или штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "split squat",
          "сплит присед"
      ]
  },
  {
      "id": "bulgarian-split-squat-quad-focus",
      "name": "Болгарские выпады с акцентом на квадрицепс",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Гантели, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "bulgarian split squat quad",
          "болгарский присед квадрицепс"
      ]
  },
  {
      "id": "walking-lunge-quad-focus",
      "name": "Выпады в ходьбе с акцентом на квадрицепс",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Гантели или собственный вес",
      "resultType": "weight_reps",
      "searchAliases": [
          "walking lunge quad",
          "выпады квадрицепс"
      ]
  },
  {
      "id": "step-down",
      "name": "Спуск с платформы",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Платформа",
      "resultType": "reps_only",
      "searchAliases": [
          "step down",
          "контрольный спуск"
      ]
  },
  {
      "id": "sissy-squat",
      "name": "Сисси-приседания",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "equipment": "Собственный вес или тренажер",
      "resultType": "reps_only",
      "searchAliases": [
          "sissy squat",
          "сисси присед"
      ]
  },
  {
      "id": "weighted-sissy-squat",
      "name": "Сисси-приседания с весом",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "equipment": "Блин или гантель",
      "resultType": "weight_reps",
      "searchAliases": [
          "weighted sissy squat",
          "сисси с весом"
      ]
  },
  {
      "id": "cyclist-squat",
      "name": "Приседания велосипедиста",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes"
      ],
      "equipment": "Штанга или гантель, подставка под пятки",
      "resultType": "weight_reps",
      "searchAliases": [
          "cyclist squat",
          "присед с пятками на возвышении"
      ]
  },
  {
      "id": "pistol-squat",
      "name": "Приседания пистолетиком",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "pistol squat",
          "пистолетик"
      ]
  },
  {
      "id": "assisted-pistol-squat",
      "name": "Приседания пистолетиком с ассистом",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Опора или петли",
      "resultType": "assisted_bodyweight",
      "searchAliases": [
          "assisted pistol squat",
          "пистолетик с опорой"
      ]
  },
  {
      "id": "wall-sit",
      "name": "Стульчик у стены",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes"
      ],
      "equipment": "Собственный вес, стена",
      "resultType": "duration_hold",
      "searchAliases": [
          "wall sit",
          "статический присед у стены"
      ]
  },
  {
      "id": "spanish-squat-hold",
      "name": "Испанский присед удержание",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes"
      ],
      "equipment": "Резинка или ремень",
      "resultType": "duration_hold",
      "searchAliases": [
          "spanish squat hold",
          "испанский присед"
      ]
  },
  {
      "id": "jump-squat",
      "name": "Прыжковые приседания",
      "category": "strength",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "jump squat",
          "присед с прыжком"
      ]
  },

  // Ягодицы (glutes)
  {
      "id": "barbell-hip-thrust",
      "name": "Ягодичный мост со штангой",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Штанга, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "hip thrust",
          "хип траст"
      ]
  },
  {
      "id": "smith-machine-hip-thrust",
      "name": "Ягодичный мост в Смите",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер Смита, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "smith hip thrust",
          "хип траст в смите"
      ]
  },
  {
      "id": "machine-hip-thrust",
      "name": "Ягодичный мост в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер hip thrust",
      "resultType": "weight_reps",
      "searchAliases": [
          "machine hip thrust",
          "тренажер ягодичный мост"
      ]
  },
  {
      "id": "barbell-glute-bridge",
      "name": "Ягодичный мостик со штангой с пола",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "barbell glute bridge",
          "мостик со штангой"
      ]
  },
  {
      "id": "glute-bridge",
      "name": "Ягодичный мостик",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "glute bridge",
          "мостик"
      ]
  },
  {
      "id": "single-leg-glute-bridge",
      "name": "Ягодичный мостик на одной ноге",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "single leg glute bridge",
          "мостик на одной ноге"
      ]
  },
  {
      "id": "frog-pump",
      "name": "Фрог-памп",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "equipment": "Собственный вес или резинка",
      "resultType": "reps_only",
      "searchAliases": [
          "frog pump",
          "лягушка ягодицы"
      ]
  },
  {
      "id": "cable-pull-through",
      "name": "Протяжка между ног в кроссовере",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "back"
      ],
      "equipment": "Кроссовер, канат",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable pull through",
          "тяга каната между ног"
      ]
  },
  {
      "id": "kettlebell-swing",
      "name": "Махи гирей",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "back"
      ],
      "equipment": "Гиря",
      "resultType": "weight_reps",
      "searchAliases": [
          "kettlebell swing",
          "свинг гиря"
      ]
  },
  {
      "id": "sumo-deadlift",
      "name": "Становая тяга сумо",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "back"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "sumo deadlift",
          "становая сумо"
      ]
  },
  {
      "id": "trap-bar-deadlift",
      "name": "Становая тяга с трэп-грифом",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "back"
      ],
      "equipment": "Трэп-гриф",
      "resultType": "weight_reps",
      "searchAliases": [
          "trap bar deadlift",
          "становая трап гриф"
      ]
  },
  {
      "id": "romanian-deadlift-glute-focus",
      "name": "Румынская тяга с акцентом на ягодицы",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "back"
      ],
      "equipment": "Штанга или гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "rdl glute",
          "румынская тяга ягодицы"
      ]
  },
  {
      "id": "single-leg-romanian-deadlift-glute-focus",
      "name": "Румынская тяга на одной ноге с акцентом на ягодицы",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "back"
      ],
      "equipment": "Гантель или гиря",
      "resultType": "weight_reps",
      "searchAliases": [
          "single leg rdl glute",
          "румынская на одной ноге ягодицы"
      ]
  },
  {
      "id": "good-morning-glute-focus",
      "name": "Наклоны со штангой с акцентом на ягодицы",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "back"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "good morning glute",
          "наклоны со штангой ягодицы"
      ]
  },
  {
      "id": "bulgarian-split-squat-glute-focus",
      "name": "Болгарские выпады с акцентом на ягодицы",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "quads",
          "legs"
      ],
      "equipment": "Гантели, скамья",
      "resultType": "weight_reps",
      "searchAliases": [
          "bulgarian split squat glute",
          "болгарские ягодицы"
      ]
  },
  {
      "id": "reverse-lunge-glute-focus",
      "name": "Обратные выпады с акцентом на ягодицы",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "quads",
          "legs"
      ],
      "equipment": "Гантели или собственный вес",
      "resultType": "weight_reps",
      "searchAliases": [
          "reverse lunge glute",
          "обратные выпады ягодицы"
      ]
  },
  {
      "id": "step-up-glute-focus",
      "name": "Зашагивания с акцентом на ягодицы",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "quads",
          "legs"
      ],
      "equipment": "Гантели, платформа",
      "resultType": "weight_reps",
      "searchAliases": [
          "step up glute",
          "зашагивания ягодицы"
      ]
  },
  {
      "id": "curtsy-lunge",
      "name": "Реверанс-выпады",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "quads"
      ],
      "equipment": "Гантели или собственный вес",
      "resultType": "weight_reps",
      "searchAliases": [
          "curtsy lunge",
          "выпады реверанс"
      ]
  },
  {
      "id": "cable-glute-kickback",
      "name": "Отведение ноги назад в кроссовере",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Кроссовер, манжета",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable kickback glute",
          "кикбэк ягодицы"
      ]
  },
  {
      "id": "machine-glute-kickback",
      "name": "Отведение ноги назад в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер для ягодиц",
      "resultType": "weight_reps",
      "searchAliases": [
          "glute kickback machine",
          "тренажер отведение назад"
      ]
  },
  {
      "id": "donkey-kick",
      "name": "Мах ногой назад на четвереньках",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Собственный вес или резинка",
      "resultType": "reps_only",
      "searchAliases": [
          "donkey kick",
          "ослик"
      ]
  },
  {
      "id": "fire-hydrant",
      "name": "Пожарный гидрант",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Собственный вес или резинка",
      "resultType": "side_reps",
      "searchAliases": [
          "fire hydrant",
          "отведение колена в сторону"
      ]
  },
  {
      "id": "hip-abduction-machine",
      "name": "Разведение ног в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер разведение ног",
      "resultType": "weight_reps",
      "searchAliases": [
          "hip abduction",
          "абдуктор"
      ]
  },
  {
      "id": "banded-lateral-walk",
      "name": "Боковая ходьба с резинкой",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Резинка",
      "resultType": "distance_time",
      "searchAliases": [
          "lateral band walk",
          "крабик с резинкой"
      ]
  },
  {
      "id": "clamshell",
      "name": "Ракушка",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Резинка или собственный вес",
      "resultType": "side_reps",
      "searchAliases": [
          "clamshell",
          "clam shell"
      ]
  },
  {
      "id": "cable-hip-abduction",
      "name": "Отведение ноги в сторону в кроссовере",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Кроссовер, манжета",
      "resultType": "weight_reps",
      "searchAliases": [
          "cable hip abduction",
          "отведение ноги в сторону блок"
      ]
  },
  {
      "id": "forty-five-degree-hyperextension-glute-focus",
      "name": "Гиперэкстензия 45 градусов с акцентом на ягодицы",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "back"
      ],
      "equipment": "Римский стул 45 градусов",
      "resultType": "weight_reps",
      "searchAliases": [
          "45 degree hyperextension glute",
          "гиперэкстензия ягодицы"
      ]
  },
  {
      "id": "sled-push-glute-focus",
      "name": "Толкание саней с акцентом на ягодицы",
      "category": "strength",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "quads",
          "legs"
      ],
      "equipment": "Сани",
      "resultType": "distance_time",
      "searchAliases": [
          "sled push glute",
          "толкание саней"
      ]
  },

  // Ноги (legs)
  {
      "id": "romanian-deadlift",
      "name": "Румынская тяга",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "back"
      ],
      "equipment": "Штанга или гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "romanian deadlift",
          "rdl",
          "румынка"
      ]
  },
  {
      "id": "dumbbell-romanian-deadlift",
      "name": "Румынская тяга с гантелями",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "back"
      ],
      "equipment": "Гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "dumbbell rdl",
          "румынская с гантелями"
      ]
  },
  {
      "id": "single-leg-romanian-deadlift",
      "name": "Румынская тяга на одной ноге",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "back"
      ],
      "equipment": "Гантель или гиря",
      "resultType": "weight_reps",
      "searchAliases": [
          "single leg rdl",
          "тяга на одной ноге"
      ]
  },
  {
      "id": "stiff-leg-deadlift",
      "name": "Тяга на прямых ногах",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "back"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "stiff leg deadlift",
          "становая на прямых"
      ]
  },
  {
      "id": "good-morning",
      "name": "Наклоны со штангой",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "back"
      ],
      "equipment": "Штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "good morning",
          "гуд морнинг"
      ]
  },
  {
      "id": "lying-leg-curl",
      "name": "Сгибание ног лежа",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер сгибание ног",
      "resultType": "weight_reps",
      "searchAliases": [
          "lying leg curl",
          "сгибания ног лежа"
      ]
  },
  {
      "id": "seated-leg-curl",
      "name": "Сгибание ног сидя",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер сгибание ног сидя",
      "resultType": "weight_reps",
      "searchAliases": [
          "seated leg curl",
          "сгибания ног сидя"
      ]
  },
  {
      "id": "standing-leg-curl",
      "name": "Сгибание ноги стоя",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер сгибание ног стоя",
      "resultType": "weight_reps",
      "searchAliases": [
          "standing leg curl",
          "сгибание ноги стоя"
      ]
  },
  {
      "id": "single-leg-curl",
      "name": "Сгибание одной ноги в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер сгибание ног",
      "resultType": "weight_reps",
      "searchAliases": [
          "single leg curl",
          "сгибание одной ноги"
      ]
  },
  {
      "id": "nordic-hamstring-curl",
      "name": "Скандинавские сгибания",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes"
      ],
      "equipment": "Собственный вес, фиксация стоп",
      "resultType": "assisted_bodyweight",
      "searchAliases": [
          "nordic curl",
          "нордик"
      ]
  },
  {
      "id": "glute-ham-raise",
      "name": "Подъем корпуса в GHD",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "back"
      ],
      "equipment": "GHD-тренажер",
      "resultType": "reps_only",
      "searchAliases": [
          "glute ham raise",
          "ghr"
      ]
  },
  {
      "id": "standing-calf-raise",
      "name": "Подъемы на носки стоя",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер или гантели",
      "resultType": "weight_reps",
      "searchAliases": [
          "standing calf raise",
          "икры стоя"
      ]
  },
  {
      "id": "seated-calf-raise",
      "name": "Подъемы на носки сидя",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер для икр сидя",
      "resultType": "weight_reps",
      "searchAliases": [
          "seated calf raise",
          "икры сидя"
      ]
  },
  {
      "id": "leg-press-calf-raise",
      "name": "Подъемы на носки в жиме ногами",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер жим ногами",
      "resultType": "weight_reps",
      "searchAliases": [
          "leg press calf raise",
          "икры в жиме ногами"
      ]
  },
  {
      "id": "single-leg-calf-raise",
      "name": "Подъем на носок одной ногой",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Собственный вес или гантель",
      "resultType": "reps_only",
      "searchAliases": [
          "single leg calf raise",
          "икры на одной ноге"
      ]
  },
  {
      "id": "tibialis-raise",
      "name": "Подъем носков на переднюю большеберцовую",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Собственный вес или тренажер",
      "resultType": "reps_only",
      "searchAliases": [
          "tibialis raise",
          "подъем носков"
      ]
  },
  {
      "id": "hip-adduction-machine",
      "name": "Сведение ног в тренажере",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Тренажер сведение ног",
      "resultType": "weight_reps",
      "searchAliases": [
          "hip adduction",
          "аддуктор"
      ]
  },
  {
      "id": "sumo-squat",
      "name": "Сумо-присед",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Гантель, гиря или штанга",
      "resultType": "weight_reps",
      "searchAliases": [
          "sumo squat",
          "присед сумо"
      ]
  },
  {
      "id": "lateral-lunge",
      "name": "Боковые выпады",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Гантели или собственный вес",
      "resultType": "weight_reps",
      "searchAliases": [
          "lateral lunge",
          "выпад в сторону"
      ]
  },
  {
      "id": "cossack-squat",
      "name": "Казачьи приседания",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "cossack squat",
          "казачий присед"
      ]
  },
  {
      "id": "forward-lunge",
      "name": "Выпады вперед",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "quads",
          "glutes"
      ],
      "equipment": "Гантели или собственный вес",
      "resultType": "weight_reps",
      "searchAliases": [
          "forward lunge",
          "выпад вперед"
      ]
  },
  {
      "id": "reverse-lunge",
      "name": "Обратные выпады",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Гантели или собственный вес",
      "resultType": "weight_reps",
      "searchAliases": [
          "reverse lunge",
          "выпад назад"
      ]
  },
  {
      "id": "walking-lunge",
      "name": "Выпады в ходьбе",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Гантели или собственный вес",
      "resultType": "weight_reps",
      "searchAliases": [
          "walking lunges",
          "ходьба выпадами"
      ]
  },
  {
      "id": "step-up",
      "name": "Зашагивания на платформу",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Гантели, платформа",
      "resultType": "weight_reps",
      "searchAliases": [
          "step up",
          "зашагивания"
      ]
  },
  {
      "id": "box-jump",
      "name": "Прыжки на тумбу",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Тумба",
      "resultType": "reps_only",
      "searchAliases": [
          "box jump",
          "прыжки на коробку"
      ]
  },
  {
      "id": "broad-jump",
      "name": "Прыжок в длину с места",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "broad jump",
          "прыжок в длину"
      ]
  },
  {
      "id": "lateral-bound",
      "name": "Боковые прыжки",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes"
      ],
      "equipment": "Собственный вес",
      "resultType": "side_reps",
      "searchAliases": [
          "lateral bound",
          "конькобежец"
      ]
  },
  {
      "id": "sled-drag",
      "name": "Тяга саней назад",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "quads",
          "glutes",
          "back"
      ],
      "equipment": "Сани",
      "resultType": "distance_time",
      "searchAliases": [
          "sled drag",
          "тяга саней"
      ]
  },
  {
      "id": "sled-pull",
      "name": "Тяга саней за собой",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "back"
      ],
      "equipment": "Сани, ремень",
      "resultType": "distance_time",
      "searchAliases": [
          "sled pull",
          "санки тяга"
      ]
  },
  {
      "id": "walking-calf-raise",
      "name": "Подъемы на носки в ходьбе",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Собственный вес или гантели",
      "resultType": "distance_time",
      "searchAliases": [
          "walking calf raise",
          "икры в ходьбе"
      ]
  },
  {
      "id": "stepmill-strength",
      "name": "Подъем по лестнице с отягощением",
      "category": "strength",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Степпер или лестница, гантели",
      "resultType": "distance_time",
      "searchAliases": [
          "weighted stair climb",
          "лестница с весом"
      ]
  },

  // Кардио (mixed: cardio category with allowed muscle keys)
  {
      "id": "treadmill-run",
      "name": "Бег на дорожке",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Беговая дорожка",
      "resultType": "distance_time",
      "searchAliases": [
          "бег",
          "treadmill run"
      ]
  },
  {
      "id": "outdoor-run",
      "name": "Бег на улице",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Собственный вес",
      "resultType": "distance_time",
      "searchAliases": [
          "running",
          "пробежка"
      ]
  },
  {
      "id": "easy-walk",
      "name": "Ходьба",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Собственный вес",
      "resultType": "distance_time",
      "searchAliases": [
          "walk",
          "прогулка"
      ]
  },
  {
      "id": "incline-treadmill-walk",
      "name": "Ходьба на дорожке под наклоном",
      "category": "cardio",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs",
          "quads"
      ],
      "equipment": "Беговая дорожка",
      "resultType": "distance_time",
      "searchAliases": [
          "incline walk",
          "ходьба в горку"
      ]
  },
  {
      "id": "stair-climber",
      "name": "Степпер",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Степпер",
      "resultType": "distance_time",
      "searchAliases": [
          "stair climber",
          "лестница"
      ]
  },
  {
      "id": "elliptical",
      "name": "Эллиптический тренажер",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Эллиптический тренажер",
      "resultType": "distance_time",
      "searchAliases": [
          "elliptical",
          "эллипс"
      ]
  },
  {
      "id": "exercise-bike",
      "name": "Велотренажер",
      "category": "cardio",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "legs",
          "glutes"
      ],
      "equipment": "Велотренажер",
      "resultType": "distance_time",
      "searchAliases": [
          "exercise bike",
          "bike"
      ]
  },
  {
      "id": "spin-bike",
      "name": "Сайкл",
      "category": "cardio",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "legs",
          "glutes"
      ],
      "equipment": "Сайкл-велосипед",
      "resultType": "distance_time",
      "searchAliases": [
          "spinning",
          "spin bike"
      ]
  },
  {
      "id": "outdoor-cycling",
      "name": "Велосипед на улице",
      "category": "cardio",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "legs",
          "glutes"
      ],
      "equipment": "Велосипед",
      "resultType": "distance_time",
      "searchAliases": [
          "cycling",
          "велосипед"
      ]
  },
  {
      "id": "rowing-machine",
      "name": "Гребной тренажер",
      "category": "cardio",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "legs",
          "biceps"
      ],
      "equipment": "Гребной тренажер",
      "resultType": "distance_time",
      "searchAliases": [
          "rower",
          "rowing"
      ]
  },
  {
      "id": "ski-erg",
      "name": "SkiErg",
      "category": "cardio",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back",
          "triceps"
      ],
      "equipment": "SkiErg",
      "resultType": "distance_time",
      "searchAliases": [
          "ski erg",
          "лыжный эргометр"
      ]
  },
  {
      "id": "air-bike",
      "name": "Air bike",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "shoulders",
          "quads"
      ],
      "equipment": "Air bike",
      "resultType": "cardio_extended",
      "searchAliases": [
          "assault bike",
          "эйрбайк"
      ]
  },
  {
      "id": "assault-runner",
      "name": "Механическая беговая дорожка",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Механическая дорожка",
      "resultType": "distance_time",
      "searchAliases": [
          "assault runner",
          "curved treadmill"
      ]
  },
  {
      "id": "jump-rope",
      "name": "Скакалка",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Скакалка",
      "resultType": "cardio_extended",
      "searchAliases": [
          "jump rope",
          "скакалка"
      ]
  },
  {
      "id": "battle-ropes",
      "name": "Канаты",
      "category": "cardio",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back",
          "triceps"
      ],
      "equipment": "Канаты",
      "resultType": "cardio_extended",
      "searchAliases": [
          "battle ropes",
          "боевые канаты"
      ]
  },
  {
      "id": "burpee",
      "name": "Берпи",
      "category": "cardio",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "legs",
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "reps_only",
      "searchAliases": [
          "burpees",
          "берпи"
      ]
  },
  {
      "id": "mountain-climber",
      "name": "Скалолаз",
      "category": "cardio",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "legs",
          "chest"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "mountain climber",
          "альпинист"
      ]
  },
  {
      "id": "high-knees",
      "name": "Бег с высоким подниманием колен",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "quads"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "high knees",
          "высокие колени"
      ]
  },
  {
      "id": "jumping-jacks",
      "name": "Джампинг джек",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "jumping jacks",
          "звездочка"
      ]
  },
  {
      "id": "shadow-boxing",
      "name": "Бой с тенью",
      "category": "cardio",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "chest",
          "back"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "shadow boxing",
          "бокс тень"
      ]
  },
  {
      "id": "swimming",
      "name": "Плавание",
      "category": "cardio",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back",
          "chest"
      ],
      "equipment": "Бассейн",
      "resultType": "distance_time",
      "searchAliases": [
          "swim",
          "плавание"
      ]
  },
  {
      "id": "sled-push-cardio",
      "name": "Толкание саней",
      "category": "cardio",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Сани",
      "resultType": "distance_time",
      "searchAliases": [
          "sled push",
          "толкание саней кардио"
      ]
  },
  {
      "id": "sled-pull-cardio",
      "name": "Тяга саней",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "back",
          "glutes"
      ],
      "equipment": "Сани",
      "resultType": "distance_time",
      "searchAliases": [
          "sled pull cardio",
          "тяга саней кардио"
      ]
  },
  {
      "id": "step-aerobics",
      "name": "Степ-аэробика",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "quads"
      ],
      "equipment": "Степ-платформа",
      "resultType": "duration_hold",
      "searchAliases": [
          "step aerobics",
          "степ"
      ]
  },
  {
      "id": "hiit-bodyweight",
      "name": "HIIT с собственным весом",
      "category": "cardio",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "chest",
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "completion_only",
      "searchAliases": [
          "hiit",
          "интервальная тренировка"
      ]
  },
  {
      "id": "rowing-intervals",
      "name": "Интервалы на гребном тренажере",
      "category": "cardio",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "legs",
          "biceps"
      ],
      "equipment": "Гребной тренажер",
      "resultType": "cardio_extended",
      "searchAliases": [
          "rowing intervals",
          "гребля интервалы"
      ]
  },

  // Мобилити (mobility category with allowed muscle keys)
  {
      "id": "shoulder-circles",
      "name": "Круги плечами",
      "category": "mobility",
      "primaryMuscles": [
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "shoulder circles",
          "вращения плечами"
      ]
  },
  {
      "id": "band-shoulder-dislocates",
      "name": "Провороты плеч с резинкой",
      "category": "mobility",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "chest"
      ],
      "equipment": "Резинка или палка",
      "resultType": "reps_only",
      "searchAliases": [
          "shoulder dislocates",
          "провороты с палкой"
      ]
  },
  {
      "id": "scapular-wall-slide",
      "name": "Скольжение лопатками у стены",
      "category": "mobility",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Стена",
      "resultType": "reps_only",
      "searchAliases": [
          "wall slides",
          "wall angel"
      ]
  },
  {
      "id": "band-pull-apart",
      "name": "Разведение резинки перед собой",
      "category": "mobility",
      "primaryMuscles": [
          "shoulders"
      ],
      "secondaryMuscles": [
          "back"
      ],
      "equipment": "Резинка",
      "resultType": "reps_only",
      "searchAliases": [
          "band pull apart",
          "резинка разводка"
      ]
  },
  {
      "id": "doorway-chest-stretch",
      "name": "Растяжка груди в дверном проеме",
      "category": "mobility",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Дверной проем",
      "resultType": "duration_hold",
      "searchAliases": [
          "doorway stretch",
          "растяжка грудных"
      ]
  },
  {
      "id": "pec-minor-stretch",
      "name": "Растяжка малой грудной мышцы",
      "category": "mobility",
      "primaryMuscles": [
          "chest"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Стена или стойка",
      "resultType": "duration_hold",
      "searchAliases": [
          "pec minor stretch",
          "растяжка груди у стены"
      ]
  },
  {
      "id": "lat-stretch",
      "name": "Растяжка широчайших",
      "category": "mobility",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Опора",
      "resultType": "duration_hold",
      "searchAliases": [
          "lat stretch",
          "растяжка спины"
      ]
  },
  {
      "id": "child-pose-lat-stretch",
      "name": "Поза ребенка с вытяжением широчайших",
      "category": "mobility",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Коврик",
      "resultType": "duration_hold",
      "searchAliases": [
          "child pose lat stretch",
          "поза ребенка спина"
      ]
  },
  {
      "id": "cat-cow",
      "name": "Кошка-корова",
      "category": "mobility",
      "primaryMuscles": [
          "back"
      ],
      "equipment": "Коврик",
      "resultType": "reps_only",
      "searchAliases": [
          "cat cow",
          "кошка корова"
      ]
  },
  {
      "id": "thoracic-rotation",
      "name": "Грудная ротация лежа на боку",
      "category": "mobility",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Коврик",
      "resultType": "side_reps",
      "searchAliases": [
          "thoracic rotation",
          "open book"
      ]
  },
  {
      "id": "thread-the-needle",
      "name": "Нитка в иголку",
      "category": "mobility",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Коврик",
      "resultType": "side_reps",
      "searchAliases": [
          "thread the needle",
          "ротация грудного отдела"
      ]
  },
  {
      "id": "worlds-greatest-stretch",
      "name": "Самая большая растяжка",
      "category": "mobility",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes",
          "chest"
      ],
      "equipment": "Коврик",
      "resultType": "completion_only",
      "searchAliases": [
          "world's greatest stretch",
          "worlds greatest stretch"
      ]
  },
  {
      "id": "hip-flexor-stretch",
      "name": "Растяжка сгибателей бедра",
      "category": "mobility",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "legs",
          "glutes"
      ],
      "equipment": "Коврик",
      "resultType": "duration_hold",
      "searchAliases": [
          "hip flexor stretch",
          "растяжка подвздошно поясничной"
      ]
  },
  {
      "id": "standing-quad-stretch",
      "name": "Растяжка квадрицепса стоя",
      "category": "mobility",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "quad stretch",
          "растяжка передней поверхности бедра"
      ]
  },
  {
      "id": "couch-stretch",
      "name": "Растяжка квадрицепса у стены",
      "category": "mobility",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "legs",
          "glutes"
      ],
      "equipment": "Стена или скамья",
      "resultType": "duration_hold",
      "searchAliases": [
          "couch stretch",
          "растяжка у стены"
      ]
  },
  {
      "id": "hamstring-stretch",
      "name": "Растяжка задней поверхности бедра",
      "category": "mobility",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "glutes"
      ],
      "equipment": "Коврик",
      "resultType": "duration_hold",
      "searchAliases": [
          "hamstring stretch",
          "растяжка бицепса бедра"
      ]
  },
  {
      "id": "calf-stretch",
      "name": "Растяжка икроножных у стены",
      "category": "mobility",
      "primaryMuscles": [
          "legs"
      ],
      "equipment": "Стена",
      "resultType": "duration_hold",
      "searchAliases": [
          "calf stretch",
          "растяжка икр"
      ]
  },
  {
      "id": "ankle-mobility-rocks",
      "name": "Мобилизация голеностопа у стены",
      "category": "mobility",
      "primaryMuscles": [
          "legs"
      ],
      "secondaryMuscles": [
          "quads"
      ],
      "equipment": "Стена",
      "resultType": "side_reps",
      "searchAliases": [
          "ankle mobility",
          "колено к стене"
      ]
  },
  {
      "id": "pigeon-pose",
      "name": "Поза голубя",
      "category": "mobility",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Коврик",
      "resultType": "duration_hold",
      "searchAliases": [
          "pigeon pose",
          "растяжка ягодиц"
      ]
  },
  {
      "id": "figure-four-stretch",
      "name": "Растяжка ягодиц четверка",
      "category": "mobility",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Коврик",
      "resultType": "duration_hold",
      "searchAliases": [
          "figure four stretch",
          "четверка"
      ]
  },
  {
      "id": "ninety-ninety-hip-switch",
      "name": "Переходы 90/90 тазобедренных",
      "category": "mobility",
      "primaryMuscles": [
          "glutes"
      ],
      "secondaryMuscles": [
          "legs"
      ],
      "equipment": "Коврик",
      "resultType": "side_reps",
      "searchAliases": [
          "90/90 hip switch",
          "9090"
      ]
  },
  {
      "id": "deep-squat-hold",
      "name": "Глубокий присед удержание",
      "category": "mobility",
      "primaryMuscles": [
          "quads"
      ],
      "secondaryMuscles": [
          "glutes",
          "legs"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "deep squat hold",
          "сидение в приседе"
      ]
  },
  {
      "id": "biceps-wall-stretch",
      "name": "Растяжка бицепса у стены",
      "category": "mobility",
      "primaryMuscles": [
          "biceps"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Стена",
      "resultType": "duration_hold",
      "searchAliases": [
          "biceps stretch",
          "растяжка бицепса"
      ]
  },
  {
      "id": "triceps-overhead-stretch",
      "name": "Растяжка трицепса над головой",
      "category": "mobility",
      "primaryMuscles": [
          "triceps"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Собственный вес",
      "resultType": "duration_hold",
      "searchAliases": [
          "triceps stretch",
          "растяжка трицепса"
      ]
  },
  {
      "id": "dead-hang-mobility",
      "name": "Вис на турнике для мобилити",
      "category": "mobility",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders"
      ],
      "equipment": "Турник",
      "resultType": "duration_hold",
      "searchAliases": [
          "passive hang",
          "вис растяжка"
      ]
  },
  {
      "id": "prone-cobra-hold",
      "name": "Кобра лежа удержание",
      "category": "mobility",
      "primaryMuscles": [
          "back"
      ],
      "secondaryMuscles": [
          "shoulders",
          "glutes"
      ],
      "equipment": "Коврик",
      "resultType": "duration_hold",
      "searchAliases": [
          "prone cobra",
          "кобра"
      ]
  },
  {
      "id": "shoulder-external-rotation-band",
      "name": "Внешняя ротация плеча с резинкой",
      "category": "mobility",
      "primaryMuscles": [
          "shoulders"
      ],
      "equipment": "Резинка",
      "resultType": "reps_only",
      "searchAliases": [
          "external rotation band",
          "ротация плеча резинка"
      ]
  },
  {
      "id": "shoulder-internal-rotation-band",
      "name": "Внутренняя ротация плеча с резинкой",
      "category": "mobility",
      "primaryMuscles": [
          "shoulders"
      ],
      "equipment": "Резинка",
      "resultType": "reps_only",
      "searchAliases": [
          "internal rotation band",
          "внутренняя ротация"
      ]
  },

] satisfies ExerciseCatalogItem[];
