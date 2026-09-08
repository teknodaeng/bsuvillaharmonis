import { createClient, Client, InStatement, Transaction } from '@libsql/client';
import { config } from './config.js';
import path from 'path';

export interface TxExecutor {
  execute(sql: string | { sql: string; args?: any[] }, args?: any[]): Promise<any>;
  fetchOne<T = Record<string, any>>(sql: string, args?: any[]): Promise<T | null>;
  fetchAll<T = Record<string, any>>(sql: string, args?: any[]): Promise<T[]>;
}

class Database {
  private client: Client;

  constructor() {
    let url = config.DATABASE_URL;
    if (!url) {
      url = `file:${path.resolve(process.cwd(), config.LOCAL_DB_PATH)}`;
    } else if (url.startsWith('file:') && !path.isAbsolute(url.slice(5))) {
      url = `file:${path.resolve(process.cwd(), url.slice(5))}`;
    }

    this.client = createClient({
      url,
      authToken: config.TURSO_AUTH_TOKEN || undefined,
    });
  }

  public getClient(): Client {
    return this.client;
  }

  public async execute(sql: string | { sql: string; args?: any[] }, args: any[] = []): Promise<any> {
    if (typeof sql === 'string') {
      return await this.client.execute({ sql, args });
    }
    return await this.client.execute({ sql: sql.sql, args: sql.args || [] });
  }

  public async executeMultiple(sqlScript: string): Promise<void> {
    await this.client.executeMultiple(sqlScript);
  }

  public async fetchOne<T = Record<string, any>>(
    sql: string,
    args: any[] = []
  ): Promise<T | null> {
    const rs = await this.client.execute({ sql, args });
    if (rs.rows.length === 0) return null;
    return rs.rows[0] as unknown as T;
  }

  public async fetchAll<T = Record<string, any>>(
    sql: string,
    args: any[] = []
  ): Promise<T[]> {
    const rs = await this.client.execute({ sql, args });
    return rs.rows as unknown as T[];
  }

  public async transaction<T>(
    fn: (tx: TxExecutor) => Promise<T>
  ): Promise<T> {
    const rawTx = await this.client.transaction('write');
    const wrappedTx: TxExecutor = {
      execute: async (sql: string | { sql: string; args?: any[] }, args: any[] = []) => {
        if (typeof sql === 'string') {
          return await rawTx.execute({ sql, args });
        }
        return await rawTx.execute({ sql: sql.sql, args: sql.args || [] });
      },
      fetchOne: async <R = Record<string, any>>(sql: string, args: any[] = []): Promise<R | null> => {
        const rs = await rawTx.execute({ sql, args });
        if (rs.rows.length === 0) return null;
        return rs.rows[0] as unknown as R;
      },
      fetchAll: async <R = Record<string, any>>(sql: string, args: any[] = []): Promise<R[]> => {
        const rs = await rawTx.execute({ sql, args });
        return rs.rows as unknown as R[];
      },
    };

    try {
      const result = await fn(wrappedTx);
      await rawTx.commit();
      return result;
    } catch (err) {
      await rawTx.rollback();
      throw err;
    }
  }
}

export const db = new Database();
