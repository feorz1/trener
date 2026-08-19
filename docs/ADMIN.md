# Admin panel

## Архитектура

Админка состоит из двух частей:

- `admin/` — Vite + React SPA на русском языке.
- `server/src/admin/` — защищённые Fastify endpoints `/admin/*`.

Admin auth отделён от trainer auth. Trainer JWT не принимается в `/admin/*`; admin session живёт в HttpOnly cookie `admin_session`, а state-changing requests требуют CSRF token через `x-csrf-token`.

## Локальный запуск

```bash
npm run api:migrate
npm run api:admin:create -- --email admin@example.com --password change_me_in_dev_only
npm run api:dev
npm run admin:dev
```

Локальные URL:

- API: `http://localhost:3000`
- Admin UI: `http://localhost:5173/admin/login`

## Первый администратор

Команда:

```bash
npm run api:admin:create -- --email owner@example.com --password strong-password-123
```

Альтернатива для dev:

```bash
ADMIN_INITIAL_EMAIL=owner@example.com ADMIN_INITIAL_PASSWORD=strong-password-123 npm run api:admin:create
```

Production password не хранить в git и не оставлять в `.env.production`.

## Env

Основные переменные:

```env
ADMIN_ENABLED=true
ADMIN_COOKIE_NAME=admin_session
ADMIN_CSRF_COOKIE_NAME=admin_csrf
ADMIN_SESSION_TTL_DAYS=7
ADMIN_CORS_ORIGIN=http://localhost:5173
ADMIN_SESSION_PEPPER=replace_with_32_plus_chars
VITE_ADMIN_API_BASE_URL=http://localhost:3000
```

Чтобы отключить админку:

```env
ADMIN_ENABLED=false
```

## Роли

- `OWNER` — полный доступ.
- `ADMIN` — полный доступ к dangerous actions.
- `SUPPORT` — read access без блокировок и сброса сессий.
- `READ_ONLY` — только просмотр.

Dangerous actions доступны только `OWNER` и `ADMIN`.

## Endpoints

- `POST /admin/auth/login`
- `POST /admin/auth/logout`
- `GET /admin/auth/me`
- `GET /admin/stats/overview`
- `GET /admin/stats/timeseries`
- `GET /admin/trainers`
- `GET /admin/trainers/:id`
- `GET /admin/trainers/:id/clients`
- `GET /admin/trainers/:id/workouts`
- `POST /admin/trainers/:id/block`
- `POST /admin/trainers/:id/unblock`
- `POST /admin/trainers/:id/revoke-sessions`
- `GET /admin/security/auth-events`
- `GET /admin/security/suspicious-sessions`
- `GET /admin/system/health`
- `GET /admin/audit-log`

## Dashboard metrics

Dashboard показывает:

- всего тренеров;
- новые тренеры сегодня;
- активные тренеры за 7 и 30 дней;
- всего клиентов;
- клиенты за 7 дней;
- всего тренировок;
- завершённые тренировки за 7 дней;
- ошибки входа за 24 часа;
- time series новых тренеров.

## Privacy

Admin API не возвращает:

- refresh/access/admin tokens;
- OAuth provider tokens;
- email login codes;
- password hashes;
- raw OAuth profile;
- secrets/env;
- phone/email клиентов в списке клиентов тренера.

Email тренера показывается owner/admin как продуктовая операционная информация.

## Проверка trainer JWT boundary

1. Войти как trainer через обычный `/auth/email/*`.
2. Взять mobile `accessToken`.
3. Выполнить `GET /admin/stats/overview` с `Authorization: Bearer <accessToken>`.
4. Ожидаемый результат: `401`, потому что admin API читает только admin cookie session.

## Проверка данных из mobile

После production deploy или перед релизом проверить, что admin видит реальные backend данные, созданные из mobile:

1. Войти в mobile как trainer.
2. Создать клиента.
3. Создать упражнение и запланированную тренировку.
4. Начать session, записать result подхода и завершить session.
5. Открыть admin trainer detail.
6. Убедиться, что client count и workout/session metrics обновились.
7. Заблокировать trainer через admin.
8. Проверить, что mobile trainer не проходит `/auth/refresh`, `/auth/me` и новый login.
9. Разблокировать trainer.
10. Проверить, что trainer снова может войти и получить свои данные через `/sync/bootstrap`.

Admin показывает агрегированную операционную картину по тренерам; mobile при этом остаётся user-scoped и не должен смешивать данные разных trainer accounts.

## Production smoke

Проверить через HTTPS:

```txt
1. Admin login создаёт HttpOnly cookie.
2. GET /admin/auth/me возвращает текущего admin без password hash/session hash.
3. Dashboard открывается и показывает агрегаты.
4. Trainers list открывается.
5. Trainer card открывается.
6. Clients tab показывает mobile-created clients.
7. Workouts tab показывает mobile-created workouts/sessions.
8. Security auth events открываются.
9. Audit log открывается.
10. System health показывает DB/Redis status.
11. Admin logout завершает session.
```

Проверить безопасность:

```txt
1. Dangerous actions без CSRF возвращают ошибку.
2. READ_ONLY admin не может block/unblock/revoke sessions.
3. CORS не открыт на "*" вместе с credentials.
4. Failed admin login пишет audit/security event.
5. Successful admin login пишет audit/security event.
6. Admin API не возвращает password hashes, session hashes, refresh token hashes, email codes, OAuth tokens или raw OAuth profile.
```

## Audit log

Логируются:

- `admin.login`
- `admin.logout`
- `trainer.viewed`
- `trainer.block`
- `trainer.unblock`
- `trainer.sessions_revoked`

Смотреть через UI `/admin/audit-log` или endpoint `GET /admin/audit-log`.

## VPS deployment

Production compose содержит:

- `api`
- `admin`
- `postgres`
- `redis`
- `caddy`
- `backup`

Рекомендуемые домены:

- `api.trener-app.com` -> backend API
- `admin.trener-app.com` -> admin SPA

Перед деплоем:

1. Указать production-домены в `.env.production` и `deploy/Caddyfile`.
2. Заполнить `.env.production`.
3. Выполнить миграции Prisma.
4. Создать owner admin через `npm run api:admin:create`.
5. Проверить, что `ADMIN_SESSION_PEPPER`, JWT/OAuth/email peppers длинные и не равны `change_me`.
6. Проверить HTTPS и Secure cookies.

## Checks

```bash
npm run api:typecheck
npm run api:test
npm run admin:typecheck
npm run admin:build
```
