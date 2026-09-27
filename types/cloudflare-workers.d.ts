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

  export interface R2Bucket {
    head(key: string): Promise<unknown | null>;
  }

  export const env: {
    DB?: D1Database;
    MEDIA?: R2Bucket;
    POLICY_AUD?: string;
    TEAM_DOMAIN?: string;
    [key: string]: unknown;
  };
}
