import {
  neon,
  type NeonQueryFunction,
} from "@neondatabase/serverless";
import { Pool, type QueryResultRow } from "pg";
import { logger } from "@/lib/logger-server";

export type SqlQueryDescriptor = { sql: string; params?: unknown[] };

export interface UniversalSqlClient {
  query<T extends QueryResultRow = Record<string, unknown>>(
    query: string,
    params?: unknown[],
  ): Promise<T[]>;
  transaction(queries: Array<SqlQueryDescriptor | string>): Promise<unknown[]>;
  end?(): Promise<void>;
}

class NeonClientAdapter implements UniversalSqlClient {
  private client: any;

  constructor(connectionString: string) {
    this.client = neon(connectionString);
  }

  async query<T extends QueryResultRow = Record<string, unknown>>(
    query: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result = await this.client(query, params as any[]);
    return result as T[];
  }

  async transaction(queries: Array<SqlQueryDescriptor | string>): Promise<unknown[]> {
    const neonQueries = queries.map((q) => {
      if (typeof q === "object" && q !== null && "sql" in q) {
        return this.client(q.sql, (q.params || []) as any[]);
      }
      return this.client(q);
    });
    return (await this.client.transaction(neonQueries as any)) as unknown[];
  }
}

class PgClientAdapter implements UniversalSqlClient {
  private pool: Pool;

  constructor(connectionString: string) {
    const cleanConnStr = connectionString
      .replace(/([?&])sslmode=[^&]+&?/g, "$1")
      .replace(/([?&])ssl=[^&]+&?/g, "$1")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");

    this.pool = new Pool({
      connectionString: cleanConnStr,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 2 : 10)),
    });
  }

  async query<T extends QueryResultRow = Record<string, unknown>>(
    query: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const res = await this.pool.query<T>(query, params);
    return res.rows;
  }

  async transaction(queries: Array<SqlQueryDescriptor | string>): Promise<unknown[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const results: unknown[] = [];
      for (const q of queries) {
        if (typeof q === "object" && q !== null && "sql" in q) {
          const res = await client.query(q.sql, q.params || []);
          results.push(res.rows);
        } else if (typeof q === "string") {
          const res = await client.query(q);
          results.push(res.rows);
        }
      }
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async end(): Promise<void> {
    await this.pool.end().catch(() => {});
  }
}

let sqlClient: UniversalSqlClient | null = null;

export type DbPoolConfig = {
  /** Max retry attempts for transient failures (default: 3) */
  maxRetries: number;
  /** Base backoff ms between retries (default: 150) */
  retryBackoffMs: number;
  /** Warn when runtime is not using Neon pooler URL (default: true in production) */
  warnOnDirectUrl: boolean;
};

function readPoolConfig(): DbPoolConfig {
  return {
    maxRetries: Math.min(
      Math.max(Number(process.env.DB_POOL_MAX_RETRIES || 3), 1),
      10,
    ),
    retryBackoffMs: Math.min(
      Math.max(Number(process.env.DB_POOL_RETRY_BACKOFF_MS || 150), 50),
      5_000,
    ),
    warnOnDirectUrl:
      process.env.DB_POOL_WARN_DIRECT !== "false" &&
      process.env.NODE_ENV === "production",
  };
}

let poolConfig = readPoolConfig();

export function getDbPoolConfig(): DbPoolConfig {
  return poolConfig;
}

/** @internal Test hook only */
export function setDbPoolConfigForTests(config: Partial<DbPoolConfig>) {
  poolConfig = { ...poolConfig, ...config };
}

function isPoolerUrl(url: string): boolean {
  try {
    const host = new URL(url.replace(/^postgres(ql)?:\/\//, "https://")).hostname;
    return host.includes("-pooler") || host.includes(".pooler.supabase.com");
  } catch {
    return url.includes("-pooler") || url.includes(".pooler.supabase.com");
  }
}

function isNeonHost(url: string): boolean {
  try {
    const host = new URL(url.replace(/^postgres(ql)?:\/\//, "https://")).hostname;
    return host.includes(".neon.tech");
  } catch {
    return url.includes(".neon.tech");
  }
}

/**
 * Prefer pooler URL for runtime API traffic.
 * Falls back to DATABASE_URL_DIRECT / DIRECT_URL only when pooler is not configured.
 */
export function getConnectionString(): string {
  const pooler = process.env.DATABASE_URL?.trim();
  const direct =
    process.env.DATABASE_URL_DIRECT?.trim() ||
    process.env.DIRECT_URL?.trim();
  let value = pooler || direct;

  if (!value) {
    throw new Error("Missing DATABASE_URL/DATABASE_URL_DIRECT");
  }

  if (poolConfig.warnOnDirectUrl && !isPoolerUrl(value)) {
    logger.warn(
      "[db] DATABASE_URL is not a pooler URL. Use the pooler endpoint in production to avoid connection exhaustion.",
    );
  }

  if (value.includes("postgresql://") || value.includes("postgres://")) {
    value = value
      .replace(/channel_binding=[^&]+&?/g, "")
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");

    if (!value.includes("sslmode=")) {
      const separator = value.includes("?") ? "&" : "?";
      value = `${value}${separator}sslmode=require`;
    } else {
      value = value.replace(/sslmode=[^&]+/g, "sslmode=require");
    }
  }

  return value;
}

export function getSqlClient(): UniversalSqlClient {
  if (!sqlClient) {
    const connStr = getConnectionString();
    if (isNeonHost(connStr)) {
      sqlClient = new NeonClientAdapter(connStr);
    } else {
      sqlClient = new PgClientAdapter(connStr);
    }
  }
  return sqlClient;
}

export async function resetSqlClient(): Promise<void> {
  if (sqlClient && typeof sqlClient.end === "function") {
    await sqlClient.end();
  }
  sqlClient = null;
}

export function getConnectionLifecycleReport(): {
  clientInstantiated: boolean;
  usingPoolerUrl: boolean;
  connectionStringSource: "DATABASE_URL" | "DATABASE_URL_DIRECT";
  config: DbPoolConfig;
} {
  const pooler = process.env.DATABASE_URL?.trim();
  let usingPoolerUrl = false;
  try {
    usingPoolerUrl = isPoolerUrl(getConnectionString());
  } catch {
    usingPoolerUrl = false;
  }

  return {
    clientInstantiated: sqlClient !== null,
    usingPoolerUrl,
    connectionStringSource: pooler ? "DATABASE_URL" : "DATABASE_URL_DIRECT",
    config: poolConfig,
  };
}
