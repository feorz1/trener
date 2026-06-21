# Backend Clients Preflight — Wave 12A

## 1) Текущий статус блокеров (с доказательствами)

- Декларативно закрыт как contract-only слой: `docs/backend/README.md` описывает директорию `docs/backend` как документацию без runtime-провайдера/SDK/моста к сети, и отмечает, что база и клиенты не реализованы.
- В `src/api/README.md` и `src/api/contracts.ts` явно указано, что Wave 9 — это локальный API contract (DTO/mappers/репозитории/ошибки), без реализации транспорта, auth-provider, token storage, persistence migration или роутов.
- `src/api` содержит только файлы `README.ts`, `contracts.ts`, `dto.ts`, `errors.ts`, `mappers.ts`, `schemas.ts` (без runtime client transport/adapters).
- `docs/backend/blockers.md` и `docs/backend/database-contract.md` фиксируют `Blocked` по всем production-подготовительным решениям (provider, auth, account/workspace, credential policy, server ownership, base URL, conflict policy, privacy/retention).
- `docs/codex-program/external-blockers.md` подтверждает отсутствующие external decisions: backend stack, base URL, credentials, auth provider, secure credential policy.
- `docs/codex-program/progress.md` показывает Wave 12A как blocked и что Wave 12A/12B… должны ждать backend/provider решений.
- `docs/codex-program/file-ownership.md` разрешает Wave 12 backend-инициализацию только в `src/api/**` и `docs/backend/**` в выделенной области; это подтверждает запрет на изменения runtime-слоёв в этой волне.

## 2) Пререквизиты для contract-only clients/adapters тестов

До начала любого real client rollout нужно подготовить:

- Ясный backend/API provider выбор + ответственный владелец/репозиторий.
- Базовые URL окружений (dev/stage/prod) и способ доставки секретов/credentials.
- Модель auth-provider + правила токенов, ротации, storage, logout/expiry.
- Server ownership и авторизационные правила (owner/workspace, cross-owner forbidden semantics).
- Политика конфликтов и идемпотентности на уровне сервера (для операций create/update/remove/complete/start).
- Политика приватности/retention для PII и миграционных сценариев.

Технически для **контракт-only** можно запускать:

- Unit/integration tests для `mappers.ts` и `schemas.ts`.
- Тесты idempotency key contract и `createApiRequestContext`/`API_OPERATION_CONTRACTS`.
- Тестирование ошибок (`ApiError`) и маппинга в `DataError`.
- Промежуточный adapter-shim поверх in-memory/mock transport без привязки к provider.

## 3) Точные решения, необходимые для разблокировки rollout клиентов

- Backend provider/stack и operational owner API.
- Производственный auth provider и модель account/workspace.
- Credential policy: secure persistence, ротация, logout invalidation, offline policy.
- Server ownership model: mapping auth principal → owner/workspace, row-level или query-level фильтрация owner, policy “not found/fobidden without leak”.
- Базовые URL и secret lifecycle (dev/stage/prod) + окружение CI/локального запуска.
- Формат и политика conflict resolution (versioning/ETag/dirty flags/outbox), если ожидается конфликтное редактирование.
- Согласованность migration path owner/workspace/account_id с текущим `owner_id`/`local-trainer`.

## 4) Что делать НЕЛЬЗЯ до разблокировки

- Реализовывать реальный backend/network transport, SDK и runtime репозитории для API.
- Добавлять prod/stage dev base URL конфиги и secrets.
- Действовать с storage credentials/refresh token/хранением токенов в доменных таблицах.
- Менять auth shell на production provider или менять локальный auth-маршрут.
- Вносить изменения в persistence, routing, роут-гварды или бизнес-логики, которые зависят от concrete backend behavior.
- Менять архитектуру owner/workspace вне документации contract until решений принят.

## 5) Предлагаемые проверочные ворота после разблокировки

- Проверка решения blocker-ов: все блокирующие пункты из `docs/backend/blockers.md` и `docs/codex-program/external-blockers.md` закрыты конкретными документами/решениями.
- `npm run check:task-workflow` на ветке Wave 12A — без временных runtime-изменений до решения.
- Статический прогон на контрактных модулях: mappers/schemas/contracts, включая:
  - валидацию DTO
  - idempotency requirements
  - normalization ошибок
- После первого провайдера: контрактные интеграционные тесты под реальный transport + локальная песочница auth owner mapping.
- Пилотный e2e по Client domain:
  - list/get/create/update клиент
  - owner-filter behavior
  - idempotent create/update semantics
  - handling `not_found`/`conflict`/`validation` через DataError
- Затем только после pass-ов: переход к реализации `src/data` adapters для clients и подключение в app flow.

