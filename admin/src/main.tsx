import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE_URL ?? "http://localhost:3000";

type Admin = {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "SUPPORT" | "READ_ONLY";
  isActive: boolean;
  lastLoginAt: string | null;
};

type OverviewStats = Record<
  | "trainersTotal"
  | "trainersNewToday"
  | "trainersActive7d"
  | "trainersActive30d"
  | "clientsTotal"
  | "clientsCreated7d"
  | "workoutSessionsTotal"
  | "workoutSessionsCompleted7d"
  | "authErrors24h",
  number
>;

type Trainer = {
  id: string;
  email: string | null;
  displayName: string | null;
  providers: string[];
  createdAt: string;
  lastSeenAt: string | null;
  clientsCount: number;
  workoutSessionsCount: number;
  completedWorkoutsCount: number;
  isBlocked: boolean;
};

type TrainerDetail = Trainer & {
  blockedAt: string | null;
  blockedReason: string | null;
  recentActivityEvents: Array<{ id: string; type: string; createdAt: string }>;
};

type TrainerClient = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  workoutsCount: number;
  lastWorkoutAt: string | null;
  status: string;
};

type TrainerWorkout = {
  id: string;
  title: string;
  clientName: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

type AuditItem = {
  id: string;
  adminEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
};

type ConfirmState = {
  title: string;
  body: string;
  actionLabel: string;
  run: () => Promise<void>;
};

function App() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [booting, setBooting] = useState(true);
  const [csrfToken, setCsrfToken] = useState(readCookie("admin_csrf"));
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    api<Admin>("/admin/auth/me")
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setBooting(false));
  }, []);

  const navigate = (nextPath: string) => {
    window.history.pushState(null, "", nextPath);
    setPath(nextPath);
  };

  if (booting) return <ShellSplash />;
  if (!admin || path === "/admin/login") {
    return (
      <LoginPage
        onLoggedIn={(nextAdmin, nextCsrf) => {
          setAdmin(nextAdmin);
          setCsrfToken(nextCsrf);
          navigate("/admin/dashboard");
        }}
      />
    );
  }

  return (
    <AdminShell admin={admin} path={path} navigate={navigate} csrfToken={csrfToken} onLogout={() => setAdmin(null)} />
  );
}

function AdminShell({
  admin,
  path,
  navigate,
  csrfToken,
  onLogout
}: {
  admin: Admin;
  path: string;
  navigate: (path: string) => void;
  csrfToken: string | null;
  onLogout: () => void;
}) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const page = useMemo(() => {
    if (path.startsWith("/admin/trainers/")) {
      return <TrainerDetailPage id={path.split("/")[3]} csrfToken={csrfToken} requestConfirm={setConfirm} />;
    }
    if (path === "/admin/trainers") return <TrainersPage navigate={navigate} />;
    if (path === "/admin/security") return <SecurityPage />;
    if (path === "/admin/system") return <SystemPage />;
    if (path === "/admin/audit-log") return <AuditLogPage />;
    return <DashboardPage />;
  }, [path, navigate, csrfToken]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">T</span>
          <div>
            <strong>Trainer Admin</strong>
            <span>{roleLabel(admin.role)}</span>
          </div>
        </div>
        <nav className="nav">
          <NavButton active={path === "/admin/dashboard"} onClick={() => navigate("/admin/dashboard")} label="Дашборд" />
          <NavButton active={path.startsWith("/admin/trainers")} onClick={() => navigate("/admin/trainers")} label="Тренеры" />
          <NavButton active={path === "/admin/security"} onClick={() => navigate("/admin/security")} label="Безопасность" />
          <NavButton active={path === "/admin/system"} onClick={() => navigate("/admin/system")} label="Система" />
          <NavButton active={path === "/admin/audit-log"} onClick={() => navigate("/admin/audit-log")} label="Audit log" />
        </nav>
        <button
          className="ghost-button"
          onClick={async () => {
            await api("/admin/auth/logout", { method: "POST", csrfToken });
            onLogout();
            navigate("/admin/login");
          }}
        >
          Выйти
        </button>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <h1>{pageTitle(path)}</h1>
            <p>{admin.email}</p>
          </div>
        </header>
        {page}
      </main>
      {confirm ? <ConfirmModal state={confirm} onClose={() => setConfirm(null)} /> : null}
    </div>
  );
}

function LoginPage({ onLoggedIn }: { onLoggedIn: (admin: Admin, csrfToken: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api<{ admin: Admin; csrfToken: string }>("/admin/auth/login", {
        method: "POST",
        body: { email, password }
      });
      onLoggedIn(response.admin, response.csrfToken);
    } catch {
      setError("Неверная почта или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <div className="login-heading">
          <span className="brand-mark">T</span>
          <h1>Вход в админку</h1>
        </div>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          Пароль
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-button" disabled={loading}>
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>
    </main>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [series, setSeries] = useState<Array<{ date: string; value: number }>>([]);
  useEffect(() => {
    api<OverviewStats>("/admin/stats/overview").then(setStats);
    api<{ points: Array<{ date: string; value: number }> }>("/admin/stats/timeseries?metric=trainers_new&range=30d&bucket=day").then((value) => setSeries(value.points));
  }, []);
  if (!stats) return <LoadingState />;
  const cards = [
    ["Всего тренеров", stats.trainersTotal],
    ["Новые тренеры сегодня", stats.trainersNewToday],
    ["Активные тренеры за 7 дней", stats.trainersActive7d],
    ["Активные тренеры за 30 дней", stats.trainersActive30d],
    ["Всего клиентов", stats.clientsTotal],
    ["Клиенты за 7 дней", stats.clientsCreated7d],
    ["Всего тренировок", stats.workoutSessionsTotal],
    ["Завершённые тренировки за 7 дней", stats.workoutSessionsCompleted7d],
    ["Ошибки входа за 24 часа", stats.authErrors24h]
  ] as const;
  return (
    <section className="stack">
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{formatNumber(value)}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Новые тренеры за 30 дней</h2>
        <BarSeries points={series} />
      </section>
    </section>
  );
}

function TrainersPage({ navigate }: { navigate: (path: string) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  useEffect(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    api<{ data: Trainer[] }>(`/admin/trainers?${params}`).then((response) => setTrainers(response.data));
  }, [search, status]);
  return (
    <section className="stack">
      <div className="toolbar">
        <input placeholder="Поиск" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Все статусы</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Имя</th>
              <th>Провайдеры</th>
              <th>Дата регистрации</th>
              <th>Последняя активность</th>
              <th>Клиенты</th>
              <th>Тренировки</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {trainers.map((trainer) => (
              <tr key={trainer.id} onClick={() => navigate(`/admin/trainers/${trainer.id}`)}>
                <td>{trainer.email ?? "-"}</td>
                <td>{trainer.displayName ?? "-"}</td>
                <td>{trainer.providers.join(", ") || "-"}</td>
                <td>{formatDate(trainer.createdAt)}</td>
                <td>{trainer.lastSeenAt ? formatDate(trainer.lastSeenAt) : "-"}</td>
                <td>{trainer.clientsCount}</td>
                <td>{trainer.workoutSessionsCount}</td>
                <td><StatusBadge blocked={trainer.isBlocked} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TrainerDetailPage({
  id,
  csrfToken,
  requestConfirm
}: {
  id: string;
  csrfToken: string | null;
  requestConfirm: (state: ConfirmState | null) => void;
}) {
  const [trainer, setTrainer] = useState<TrainerDetail | null>(null);
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [workouts, setWorkouts] = useState<TrainerWorkout[]>([]);
  const reload = () => api<TrainerDetail>(`/admin/trainers/${id}`).then(setTrainer);
  useEffect(() => {
    reload();
    api<{ data: TrainerClient[] }>(`/admin/trainers/${id}/clients`).then((response) => setClients(response.data));
    api<{ data: TrainerWorkout[] }>(`/admin/trainers/${id}/workouts`).then((response) => setWorkouts(response.data));
  }, [id]);
  if (!trainer) return <LoadingState />;
  const action = (title: string, body: string, actionLabel: string, endpoint: string) => {
    requestConfirm({
      title,
      body,
      actionLabel,
      run: async () => {
        await api(endpoint, { method: "POST", csrfToken });
        await reload();
      }
    });
  };
  return (
    <section className="stack">
      <div className="profile-band">
        <div>
          <h2>{trainer.displayName ?? trainer.email ?? trainer.id}</h2>
          <p>{trainer.email ?? "Email не указан"}</p>
        </div>
        <StatusBadge blocked={trainer.isBlocked} />
      </div>
      <div className="metric-grid compact">
        <Metric label="Клиенты" value={trainer.clientsCount} />
        <Metric label="Тренировки" value={trainer.workoutSessionsCount} />
        <Metric label="Завершённые" value={trainer.completedWorkoutsCount} />
        <Metric label="Провайдеры" value={trainer.providers.join(", ") || "-"} />
      </div>
      <div className="actions-row">
        {trainer.isBlocked ? (
          <button className="primary-button" onClick={() => action("Разблокировать тренера", "Доступ к приложению будет восстановлен.", "Разблокировать", `/admin/trainers/${id}/unblock`)}>
            Разблокировать
          </button>
        ) : (
          <button className="danger-button" onClick={() => action("Заблокировать тренера", "Refresh/login будут закрыты, активные сессии отзовутся.", "Заблокировать", `/admin/trainers/${id}/block`)}>
            Заблокировать
          </button>
        )}
        <button className="secondary-button" onClick={() => action("Сбросить сессии", "Все refresh sessions тренера будут отозваны.", "Сбросить", `/admin/trainers/${id}/revoke-sessions`)}>
          Сбросить сессии
        </button>
      </div>
      <DataPanel title="Клиенты" rows={clients} columns={["name", "status", "workoutsCount", "lastWorkoutAt"]} />
      <DataPanel title="Тренировки" rows={workouts} columns={["title", "clientName", "status", "scheduledAt", "finishedAt"]} />
      <DataPanel title="Последняя активность" rows={trainer.recentActivityEvents} columns={["type", "createdAt"]} />
    </section>
  );
}

function SecurityPage() {
  const [events, setEvents] = useState<Record<string, unknown[]>>({});
  const [sessions, setSessions] = useState<unknown[]>([]);
  useEffect(() => {
    api<Record<string, unknown[]>>("/admin/security/auth-events").then(setEvents);
    api<{ data: unknown[] }>("/admin/security/suspicious-sessions").then((response) => setSessions(response.data));
  }, []);
  return (
    <section className="stack">
      <DataPanel title="Последние входы" rows={events.recentLogins ?? []} columns={["email", "createdAt", "consumedAt"]} />
      <DataPanel title="Ошибки входа" rows={events.loginErrors ?? []} columns={["email", "attemptCount", "createdAt"]} />
      <DataPanel title="Подозрительные сессии" rows={sessions} columns={["userId", "ipHash", "revokedAt", "createdAt"]} />
      <DataPanel title="OAuth ошибки" rows={events.oauthErrors ?? []} columns={["provider", "createdAt"]} />
      <DataPanel title="Email code rate limit events" rows={events.emailRateLimitEvents ?? []} columns={["email", "attemptCount", "createdAt"]} />
    </section>
  );
}

function SystemPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    api<Record<string, unknown>>("/admin/system/health").then(setHealth);
  }, []);
  if (!health) return <LoadingState />;
  return <DataPanel title="Состояние системы" rows={Object.entries(health).map(([key, value]) => ({ key, value }))} columns={["key", "value"]} />;
}

function AuditLogPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  useEffect(() => {
    api<{ data: AuditItem[] }>("/admin/audit-log?page=1&pageSize=100").then((response) => setItems(response.data));
  }, []);
  return <DataPanel title="Действия администраторов" rows={items} columns={["createdAt", "adminEmail", "action", "targetType", "targetId"]} />;
}

function DataPanel({ title, rows, columns }: { title: string; rows: unknown[]; columns: string[] }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length}>Нет данных</td></tr>
            ) : (
              rows.map((row, index) => {
                const record = row as Record<string, unknown>;
                return (
                <tr key={String(record.id ?? index)}>
                  {columns.map((column) => <td key={column}>{formatCell(record[column])}</td>)}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{state.title}</h2>
        <p>{state.body}</p>
        <div className="actions-row">
          <button className="secondary-button" onClick={onClose}>Отмена</button>
          <button
            className="danger-button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await state.run();
              setLoading(false);
              onClose();
            }}
          >
            {loading ? "Выполняется..." : state.actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BarSeries({ points }: { points: Array<{ date: string; value: number }> }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <div className="bar-series">
      {points.map((point) => (
        <div className="bar-column" key={point.date} title={`${point.date}: ${point.value}`}>
          <span style={{ height: `${Math.max(6, (point.value / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ blocked }: { blocked: boolean }) {
  return <span className={`status-badge ${blocked ? "blocked" : "active"}`}>{blocked ? "Заблокирован" : "Активен"}</span>;
}

function NavButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{label}</button>;
}

function LoadingState() {
  return <div className="panel muted">Загрузка...</div>;
}

function ShellSplash() {
  return <main className="login-screen"><div className="panel muted">Загрузка...</div></main>;
}

async function api<T>(path: string, options: { method?: string; body?: unknown; csrfToken?: string | null } = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.csrfToken ? { "x-csrf-token": options.csrfToken } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function readCookie(name: string) {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1] ?? null;
}

function pageTitle(path: string) {
  if (path.startsWith("/admin/trainers/")) return "Карточка тренера";
  if (path === "/admin/trainers") return "Тренеры";
  if (path === "/admin/security") return "Безопасность";
  if (path === "/admin/system") return "Система";
  if (path === "/admin/audit-log") return "Audit log";
  return "Дашборд";
}

function roleLabel(role: Admin["role"]) {
  return role === "READ_ONLY" ? "Read only" : role;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(value));
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDate(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
