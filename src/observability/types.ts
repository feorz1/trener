export type AppErrorCategory = "startup" | "authentication" | "data" | "storage" | "network" | "ui" | "configuration" | "unknown";

export type AppErrorKind = "cancelled" | "timeout" | "auth" | "configuration" | "type_error" | "error" | "unknown";

export type ReleaseMetadata = {
  appVersion: string;
  buildNumber: string;
  platform: "android" | "ios" | "macos" | "web" | "windows";
  channel: "development" | "release";
};

export type SanitizedAppErrorEvent = {
  category: AppErrorCategory;
  code: string;
  kind: AppErrorKind;
  fatal: boolean;
  occurredAt: string;
  release: ReleaseMetadata;
  attributes: Record<string, string | number | boolean>;
};

export type AppErrorReporter = {
  capture(event: SanitizedAppErrorEvent): void | Promise<void>;
};

export type ReportAppErrorInput = {
  category: AppErrorCategory;
  code: string;
  error?: unknown;
  fatal?: boolean;
  attributes?: Record<string, unknown>;
};
