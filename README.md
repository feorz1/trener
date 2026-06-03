# Trainer Mobile Foundation

Expo React Native проект для мобильного приложения персонального тренера. Компоненты используют theme tokens из `src/theme`.

## Запуск

```bash
npm run start
```

Для проверки в браузере:

```bash
npx expo start --web
```

## Dev-kit

Локальный экран проверки компонентов находится в Expo Router route:

```text
/dev-kit
```

В Expo Web откройте адрес вида:

```text
http://localhost:8081/dev-kit
```

На экране можно проверить foundations preview, базовые UI-компоненты, календарь, клиентские карточки, workout-компоненты и PDF-preview блоки. Интерактивные элементы меняют состояние прямо на экране: checkbox, segmented control, number input, SetRow и ExerciseCard.

## Theme tokens

Figma variables являются источником дизайн-токенов. Чтобы обновить тему:

1. Обновить variables в Figma.
2. Export mode в JSON.
3. Заменить файл `design-tokens/figma-light.json`.
4. Запустить генерацию:

```bash
npm run tokens:build
```

5. Проверить приложение и экран `/dev-kit`.

Компоненты должны брать цвета, отступы, радиусы и типографику из `src/theme`, без хардкода случайных значений.

## Проверки

```bash
npm run typecheck
```

## Storybook

Storybook подключен локально как Expo Router route:

```text
/storybook
```

Запуск на устройстве или в Expo Go:

```bash
npm run storybook:mobile
```

Запуск в браузере:

```bash
npm run storybook:web
```

После добавления, удаления или переименования `*.stories.tsx`:

```bash
npm run storybook:generate
```

Текущие stories лежат рядом с компонентами в `src/components/**`.
Локальный Storybook нужен для проверки states, pressed states, controls, интерактивных сценариев и ручной проверки анимаций.
Chromatic имеет смысл подключать позже, когда появится CI и задача публиковать Storybook или блокировать regressions по screenshot-diff.
