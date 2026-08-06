import type { FastifyInstance, FastifyReply } from "fastify";

const SUPPORT_EMAIL = "support@trener-app.com";

const PAGE_HEADERS = {
  "cache-control": "public, max-age=300",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff"
} as const;

const PAGE_STYLES = `
  :root { color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  body { margin: 0; background: #f6f7f9; color: #17191c; line-height: 1.6; }
  main { box-sizing: border-box; width: min(760px, calc(100% - 32px)); margin: 32px auto; padding: 32px; background: #fff; border-radius: 20px; }
  h1, h2 { line-height: 1.25; }
  h1 { margin-top: 0; }
  h2 { margin-top: 28px; font-size: 1.15rem; }
  a { color: #006f84; }
  .meta { color: #5d626b; }
  @media (prefers-color-scheme: dark) {
    body { background: #111315; color: #f4f5f6; }
    main { background: #1b1e21; }
    a { color: #65d5eb; }
    .meta { color: #b5bac2; }
  }
`;

const PRIVACY_PAGE = document(
  "Политика конфиденциальности — Trener",
  `
    <h1>Политика конфиденциальности приложения Trener</h1>
    <p class="meta">Редакция от 29 июля 2026 года</p>
    <p>Оператор приложения Trener обрабатывает данные, необходимые для работы сервиса для тренеров. По вопросам конфиденциальности напишите на <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>

    <h2>Какие данные обрабатываются</h2>
    <ul>
      <li>данные аккаунта: внутренний идентификатор, email и указанное пользователем имя;</li>
      <li>данные клиентов, внесённые тренером: имя, контакты, профиль, сведения о здоровье и тренировочных ограничениях;</li>
      <li>тренировочные данные: упражнения, планы, расписания, подходы, повторения, вес, длительность, дистанция, результаты и заметки;</li>
      <li>технические данные безопасности: хэши токенов и IP-адресов, user-agent, сроки действия сессий и административные события;</li>
      <li>локальная копия данных приложения и токены входа в защищённом хранилище устройства.</li>
    </ul>

    <h2>Цели обработки</h2>
    <p>Данные используются для входа и защиты аккаунта, ведения клиентской базы, планирования и проведения тренировок, синхронизации, поддержки, предотвращения злоупотреблений и удаления аккаунта по запросу пользователя.</p>

    <h2>Хранение и передача</h2>
    <p>Данные хранятся на устройстве, в PostgreSQL и резервных копиях. Email и одноразовый код передаются настроенному поставщику доставки почты. Инфраструктурные поставщики могут обрабатывать данные только для размещения, резервного копирования и сетевой доставки сервиса.</p>
    <p>Сроки зависят от типа данных и операционной необходимости. Данные активного аккаунта хранятся, пока аккаунт используется; токены и коды имеют технические сроки действия. Исторические резервные копии могут содержать удалённые ранее данные до окончания срока хранения backup и допускаются к восстановлению только с повторным применением последующих удалений.</p>

    <h2>Удаление аккаунта и обращения</h2>
    <p>Удалить аккаунт можно в настройках Trener. Live-данные аккаунта и связанные записи удаляются серверной транзакцией, после чего приложение очищает локальные данные. Для запросов на доступ, исправление, экспорт или удаление напишите на <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>

    <h2>Tracking и разрешения устройства</h2>
    <p>Текущая версия не использует рекламный tracking, рекламные или аналитические SDK и не запрашивает доступ к контактам, геолокации, фотографиям, камере или микрофону.</p>

    <h2>Сведения об операторе</h2>
    <p>Оператор приложения Trener. Контакт: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. Юридические и регистрационные реквизиты могут быть дополнены в метаданных этой страницы после их оформления.</p>
  `
);

const SUPPORT_PAGE = document(
  "Поддержка — Trener",
  `
    <h1>Поддержка Trener</h1>
    <p>По вопросам работы приложения, входа, данных и удаления аккаунта напишите на <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>

    <h2>Что указать в обращении</h2>
    <ul>
      <li>краткое описание проблемы и ожидаемого результата;</li>
      <li>модель устройства и версию iOS;</li>
      <li>версию Trener, если она доступна в настройках;</li>
      <li>последовательность действий, после которой возникла проблема.</li>
    </ul>
    <p>Не отправляйте пароль, одноразовые коды, access/refresh tokens, ключи, database URL или другие секреты.</p>

    <h2>Конфиденциальность и удаление</h2>
    <p>Политика конфиденциальности доступна по адресу <a href="/privacy">api.trener-app.com/privacy</a>. Удалить аккаунт можно в настройках приложения. Если действие недоступно, напишите на <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>

    <h2>Оператор</h2>
    <p>Оператор приложения Trener. Юридические и регистрационные реквизиты могут быть дополнены в метаданных страницы. Канал для обращений: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `
);

export function registerPublicInformationRoutes(app: FastifyInstance) {
  app.get("/privacy", { exposeHeadRoute: true }, async (_request, reply) => sendHtml(reply, PRIVACY_PAGE));
  app.get("/support", { exposeHeadRoute: true }, async (_request, reply) => sendHtml(reply, SUPPORT_PAGE));
}

function sendHtml(reply: FastifyReply, html: string) {
  return reply.headers(PAGE_HEADERS).type("text/html; charset=utf-8").send(html);
}

function document(title: string, body: string) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${PAGE_STYLES}</style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}
