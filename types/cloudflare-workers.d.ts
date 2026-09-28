declare module "cloudflare:workers" {
  export interface D1Result<T = Record<string, unknown>> {
    success: boolean;
    results?: T[];
    meta?: Record<string, unknown>;
    error?: string;
  }

  export interface D1ExecResult {
    count: number;
    duration: number;
  }

  export interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
    run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  }

  export interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = Record<string, unknown>>(
      statements: D1PreparedStatement[]
    ): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1ExecResult>;
  }

  export interface R2ObjectBody {
    body: ReadableStream;
    size?: number;
    httpMetadata?: { contentType?: string };
  }

  export interface R2Bucket {
    head(key: string): Promise<unknown | null>;
    get(key: string): Promise<R2ObjectBody | null>;
    put(
      key: string,
      value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
      options?: { httpMetadata?: { contentType?: string } }
    ): Promise<unknown>;
    delete(key: string): Promise<void>;
  }

  export interface EmailSendResult {
    messageId?: string;
  }

  export interface EmailBinding {
    send(message: {
      from: string;
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
      replyTo?: string;
    }): Promise<EmailSendResult>;
  }

  export const env: {
    DB?: D1Database;
    MEDIA?: R2Bucket;
    POLICY_AUD?: string;
    TEAM_DOMAIN?: string;
    PORTAL_ALLOWED_EMAIL_DOMAINS?: string;
    PORTAL_TELEMETRY_INGEST_KEY?: string;
    PORTAL_BASE_URL?: string;
    PORTAL_MAIL_FROM?: string;
    RESEND_API_KEY?: string;
    EMAIL?: EmailBinding;
    [key: string]: unknown;
  };
}
