# App Store metadata package — Trener 1.0.0 (ru-RU)

> Prepared for the pre-signing release candidate. This file contains the
> copy-ready technical draft. App Store Connect contact identity, copyright
> owner, final age rating, and review-account access must be confirmed by the
> account holder when the Apple Team and app record become available.

## Release identity and URLs

- App name: `Trener`
- Bundle ID: `com.trenerapp.trener` (approved; do not change)
- Version: `1.0.0`
- Primary language: Russian (`ru-RU`)
- Primary category draft: Health & Fitness
- Secondary category draft: Productivity
- Privacy Policy URL: `https://api.trener-app.com/privacy`
- Support URL: `https://api.trener-app.com/support`
- Production API origin: `https://api.trener-app.com`

The Support URL is acceptable only after it returns `200 text/html` and the
listed `support@trener-app.com` mailbox has passed an inbound delivery/reply
check. Apple requires a support page to contain real contact information.

## Subtitle

`Клиенты и тренировки`

20 characters; Apple limit: 30 characters.

## Keywords

`тренер,клиенты,тренировки,расписание,фитнес,подходы`

97 UTF-8 bytes; Apple limit: 100 bytes.

## Description

Trener — рабочее приложение для персональных тренеров, которым важно держать
клиентов, расписание и результаты тренировок в одном месте.

В Trener можно:

- вести карточки клиентов: контакты, цели, анкета, ограничения и заметки;
- планировать тренировки по дням и времени, выбирать упражнения и создавать
  собственные;
- переносить и отменять занятия;
- проводить тренировку по плану и быстро записывать подходы, вес, повторения,
  длительность и дистанцию;
- просматривать итоги и историю занятий;
- синхронизировать данные через аккаунт с входом по одноразовому коду.

Приложение создано для повседневной работы тренера в зале: крупные элементы
управления, быстрый ввод результатов и ясный контекст клиента помогают меньше
отвлекаться от тренировки.

Trener не предоставляет медицинских диагнозов или лечения. Решения о нагрузке
и упражнениях принимает тренер с учётом состояния клиента.

Apple limit: 4000 characters; plain text only.

## Age rating questionnaire draft

Apple calculates the final rating from the questionnaire; do not enter a
numeric rating manually.

| Questionnaire item | Draft answer | Rationale |
| --- | --- | --- |
| Health or Wellness Topics | Yes | Exercise planning and training recommendations |
| Medical or Treatment Information | None | No diagnosis, treatment, medication, or emergency guidance |
| Unrestricted Web Access | No | Only fixed external privacy and support URLs |
| User-Generated Content | No | Private trainer notes are not broadly distributed |
| Social Media | No | No feed, sharing, reactions, or discovery |
| Messaging and Chat | No | No user-to-user communication |
| Advertising | No | No ads or advertising SDK |
| Profanity or Crude Humor | None | No such authored content |
| Horror/Fear Themes | None | No such content |
| Alcohol, Tobacco, or Drug Use or References | None | No such content |
| Sexuality or Nudity categories | None | No such content |
| Violence and Weapons categories | None | No such content |
| Gambling, Simulated Gambling, Contests, Loot Boxes | None | No such features |
| Regulated Medical Device | No (owner/legal confirmation required) | App is a trainer workflow tool, not a medical device |

## App Privacy answers draft

Tracking: **No**. Data is linked to the trainer/account because it supports
account authentication, owner isolation, synchronization, and the core trainer
workflow. Purposes: **App Functionality**; no advertising purpose.

| App Store category | Collected | Linked | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info — Name | Yes | Yes | No | App Functionality |
| Contact Info — Email Address | Yes | Yes | No | App Functionality |
| Contact Info — Phone Number | Yes | Yes | No | App Functionality |
| Contact Info — Other User Contact Info | Yes | Yes | No | App Functionality |
| Identifiers — User ID | Yes | Yes | No | App Functionality |
| Health & Fitness — Health | Yes | Yes | No | App Functionality |
| Health & Fitness — Fitness | Yes | Yes | No | App Functionality |
| User Content — Other User Content | Yes | Yes | No | App Functionality |
| Other Data — Other Data Types | Yes | Yes | No | App Functionality/security |

Not evidenced for this release: location, address-book contacts, photos, video,
audio, camera, microphone, payment information, advertising, analytics,
third-party tracking, or developer-controlled crash/performance collection.

The expanded code-derived inventory and provider/retention confirmations live
in `docs/APP_STORE_PRIVACY_ANSWERS.md`. Re-run that inventory if production
providers or SDKs change.

## App Review notes

Интерфейс приложения — на русском языке. Trener предназначен для персональных
тренеров: ведение клиентов, планирование и проведение тренировок, запись
подходов и просмотр истории.

Вход passwordless: пользователь вводит доступный ему email, получает
шестизначный одноразовый код и вводит его в приложении. Пароля и social login
нет.

Production backend: https://api.trener-app.com. Он должен оставаться доступным
весь период review.

Для проверки:

1. Войдите через подготовленный для App Review email.
2. Создайте клиента только с синтетическими данными.
3. Запланируйте тренировку и добавьте упражнения.
4. Начните тренировку, заполните подходы и завершите её.
5. Откройте итог и историю клиента.
6. В Settings проверьте Privacy Policy и Support.
7. Account deletion находится в Settings → Account data → Delete.

У приложения нет покупок, подписок, рекламы, social feed, messaging, push
notifications или запросов камеры, микрофона, геолокации и контактов. Проверку
удаления выполняйте последней: она необратимо удалит review-account.

### App Review fields to bind after Apple Team activation

- Contact name, phone, and email: real account-holder/release contact.
- Sign-in: a dedicated, non-expiring review email with an OTP access procedure.
- Copyright: `2026 <real person or legal entity>`.
- If the production OTP flow cannot give reviewers durable access, implement
  and review a fully featured demo mode before submission; do not invent login
  credentials in this document.

## What to Test

Проверьте production launch без Metro; вход по email-коду; создание и
редактирование клиента; планирование, перенос и отмену тренировки; выбор и
создание упражнения; запись подходов разных типов; завершение и итог
тренировки; историю клиента; восстановление сессии и данных после перезапуска;
светлую и тёмную тему; privacy/support links; logout; account deletion в самом
конце.

## Screenshots checklist

The app supports iPhone and iPad, so prepare both required device families.
Apple accepts one to ten PNG/JPEG screenshots per device family and forbids
alpha/transparency.

- iPhone 6.9-inch portrait: choose one accepted size, preferably
  `1320 × 2868` for the current capture device.
- iPad 13-inch portrait: `2064 × 2752` or `2048 × 2732`.
- Capture from the production Release build without Metro, debug overlays, or
  Storybook.
- Use only synthetic trainer/client data; no real email, phone, health, notes,
  tokens, or admin information.
- Keep one localization and one consistent visual state per set.
- Verify PNG/JPEG dimensions and absence of alpha before upload.

Recommended six scenes for both iPhone and iPad:

1. Schedule overview.
2. Client profile and goals.
3. Workout planning with exercises.
4. Active workout and set entry.
5. Completed workout summary.
6. Client workout history.

## Authoritative references

- Apple App information:
  https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/
- Apple platform version fields and limits:
  https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- Apple age-rating definitions:
  https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions
- Apple screenshot specifications:
  https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Apple App Review guidelines:
  https://developer.apple.com/app-store/review/guidelines/
