import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './src/worker/index';
import { D1Database, D1Result, D1ExecResult } from './src/worker/types';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'propos_d1.sqlite');

// -------------------------------------------------------------
// CLOUDFLARE D1 EMULATOR (Node.js 22 node:sqlite Adapter)
// -------------------------------------------------------------
function normalizeParam(v: any): string | number | null | Uint8Array {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') {
    if (isNaN(v) || !isFinite(v)) return null;
    return v;
  }
  if (typeof v === 'string') return v;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) {
    return v.map(normalizeParam).join(',');
  }
  return String(v);
}

function createNodeD1Adapter(sqlitePath: string): D1Database {
  const db = new DatabaseSync(sqlitePath);
  db.exec('PRAGMA foreign_keys = ON;');

  return {
    prepare(sql: string) {
      return new NodeD1PreparedStatement(db, sql, []);
    },
    async batch<T = unknown>(statements: any[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
    async exec(sql: string): Promise<D1ExecResult> {
      db.exec(sql);
      return { count: 1, duration: 0 };
    }
  };
}

class NodeD1PreparedStatement {
  private params: any[];

  constructor(private db: DatabaseSync, private sql: string, params: any[]) {
    const flatParams = Array.isArray(params) ? params.flat(Infinity) : [params];
    this.params = flatParams.map(normalizeParam);
  }

  bind(...values: any[]) {
    const flatValues = values.flat(Infinity);
    return new NodeD1PreparedStatement(this.db, this.sql, flatValues);
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.sql);
      const row: any = stmt.get(...this.params);
      if (!row) return null;
      if (colName) return row[colName] ?? null;
      return row as T;
    } catch (err) {
      console.error('D1 first error:', err, 'SQL:', this.sql, 'Params:', this.params);
      throw err;
    }
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    try {
      const stmt = this.db.prepare(this.sql);
      const rows = stmt.all(...this.params);
      return {
        success: true,
        results: rows as T[],
        meta: { changes: 0 }
      };
    } catch (err) {
      console.error('D1 all error:', err, 'SQL:', this.sql, 'Params:', this.params);
      throw err;
    }
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    try {
      const stmt = this.db.prepare(this.sql);
      const info = stmt.run(...this.params);
      return {
        success: true,
        results: [],
        meta: {
          changes: Number(info.changes),
          last_row_id: Number(info.lastInsertRowid)
        }
      };
    } catch (err) {
      console.error('D1 run error:', err, 'SQL:', this.sql, 'Params:', this.params);
      throw err;
    }
  }

  async raw<T = unknown>(): Promise<T[]> {
    const res = await this.all();
    return (res.results || []).map(r => Object.values(r as object)) as T[];
  }
}

// Instantiate local D1 SQLite Database
const localD1Database = createNodeD1Adapter(DB_FILE);

// -------------------------------------------------------------
// HTTP SERVER (Bypasses Express completely)
// Serves Vite dev middleware in dev, static files in prod,
// and proxies /api/* directly to Cloudflare Worker fetch handler.
// -------------------------------------------------------------
async function startServer() {
  let viteDevServer: any = null;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
  }

  const server = http.createServer(async (req, res) => {
    const urlStr = req.url || '/';

    // Route API requests directly to Worker fetch handler
    if (urlStr.startsWith('/api/')) {
      try {
        const fullUrl = `http://${req.headers.host || 'localhost:3000'}${urlStr}`;
        
        // Accumulate request body
        let bodyBuffer: Buffer | undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const chunks: Uint8Array[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          bodyBuffer = Buffer.concat(chunks);
        }

        // Construct Web Standard Request
        const headers = new Headers();
        for (const [key, val] of Object.entries(req.headers)) {
          if (Array.isArray(val)) {
            val.forEach(v => headers.append(key, v));
          } else if (val !== undefined) {
            headers.set(key, val);
          }
        }

        const webRequest = new Request(fullUrl, {
          method: req.method,
          headers,
          body: bodyBuffer && bodyBuffer.length > 0 ? bodyBuffer : undefined
        });

        // Environment bindings provided to Cloudflare Worker
        const env = {
          DB: localD1Database,
          ENVIRONMENT: process.env.NODE_ENV || 'development'
        };

        // Call Worker fetch method!
        const webResponse = await worker.fetch(webRequest, env);

        // Forward response back to Node http response
        res.statusCode = webResponse.status;
        webResponse.headers.forEach((val, key) => {
          res.setHeader(key, val);
        });

        const respArrayBuffer = await webResponse.arrayBuffer();
        res.end(Buffer.from(respArrayBuffer));
        return;
      } catch (err: any) {
        console.error('API Server Proxy Error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Worker fetch execution failed: ' + err.message }));
        return;
      }
    }

    // Serve Frontend Assets
    if (viteDevServer) {
      viteDevServer.middlewares(req, res);
    } else {
      // Production Static File Serving
      const distPath = path.join(process.cwd(), 'dist');
      let filePath = path.join(distPath, urlStr.split('?')[0]);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distPath, 'index.html');
      }

      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.svg': 'image/svg+xml'
      };

      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (Cloudflare Worker + D1 Emulation active)`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
