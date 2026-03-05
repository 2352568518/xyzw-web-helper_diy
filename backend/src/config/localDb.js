/**
 * 本地 PostgreSQL 数据库适配器
 * 使用 pg 库直接连接 PostgreSQL
 */

import pg from 'pg';
const { Pool } = pg;
import { logger } from '../utils/logger.js';

/**
 * 简化的数据库客户端，模拟 Supabase 客户端接口
 */
class LocalDatabaseClient {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'xyzw_helper',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  /**
   * 创建查询构建器
   */
  from(table) {
    return new QueryBuilder(this.pool, table);
  }

  /**
   * 执行原始SQL
   */
  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return { data: result.rows, error: null };
    } catch (error) {
      logger.error('SQL Error:', error);
      return { data: null, error };
    } finally {
      client.release();
    }
  }

  /**
   * 关闭连接池
   */
  async end() {
    await this.pool.end();
  }
}

/**
 * 查询构建器 - 模拟 Supabase 查询接口
 */
class QueryBuilder {
  constructor(pool, table) {
    this.pool = pool;
    this.table = table;
    this._select = '*';
    this._where = [];
    this._whereParams = [];
    this._order = '';
    this._limit = '';
    this._offset = '';
    this._insert = null;
    this._update = null;
    this._delete = false;
    this._upsert = null;
    this._onConflict = '';
  }

  select(columns = '*') {
    if (Array.isArray(columns)) {
      this._select = columns.join(', ');
    } else {
      this._select = columns;
    }
    return this;
  }

  eq(column, value) {
    this._where.push(`${column} = $${this._whereParams.length + 1}`);
    this._whereParams.push(value);
    return this;
  }

  neq(column, value) {
    this._where.push(`${column} != $${this._whereParams.length + 1}`);
    this._whereParams.push(value);
    return this;
  }

  gt(column, value) {
    this._where.push(`${column} > $${this._whereParams.length + 1}`);
    this._whereParams.push(value);
    return this;
  }

  gte(column, value) {
    this._where.push(`${column} >= $${this._whereParams.length + 1}`);
    this._whereParams.push(value);
    return this;
  }

  lt(column, value) {
    this._where.push(`${column} < $${this._whereParams.length + 1}`);
    this._whereParams.push(value);
    return this;
  }

  lte(column, value) {
    this._where.push(`${column} <= $${this._whereParams.length + 1}`);
    this._whereParams.push(value);
    return this;
  }

  in(column, values) {
    const placeholders = values.map((_, i) => `$${this._whereParams.length + i + 1}`).join(', ');
    this._where.push(`${column} IN (${placeholders})`);
    this._whereParams.push(...values);
    return this;
  }

  like(column, pattern) {
    this._where.push(`${column} LIKE $${this._whereParams.length + 1}`);
    this._whereParams.push(pattern);
    return this;
  }

  ilike(column, pattern) {
    this._where.push(`${column} ILIKE $${this._whereParams.length + 1}`);
    this._whereParams.push(pattern);
    return this;
  }

  is(column, value) {
    if (value === null) {
      this._where.push(`${column} IS NULL`);
    } else {
      this._where.push(`${column} IS $${this._whereParams.length + 1}`);
      this._whereParams.push(value);
    }
    return this;
  }

  order(column, options = {}) {
    const direction = options.ascending === false ? 'DESC' : 'ASC';
    const nulls = options.nullsFirst ? 'NULLS FIRST' : (options.nullsFirst === false ? 'NULLS LAST' : '');
    this._order = `ORDER BY ${column} ${direction} ${nulls}`.trim();
    return this;
  }

  limit(count) {
    this._limit = `LIMIT ${count}`;
    return this;
  }

  range(from, to) {
    this._offset = `OFFSET ${from} LIMIT ${to - from + 1}`;
    return this;
  }

  single() {
    this._limit = 'LIMIT 1';
    this._single = true;
    return this;
  }

  insert(data) {
    if (Array.isArray(data)) {
      this._insert = data;
    } else {
      this._insert = [data];
    }
    return this;
  }

  update(data) {
    this._update = data;
    return this;
  }

  upsert(data, options = {}) {
    if (Array.isArray(data)) {
      this._upsert = data;
    } else {
      this._upsert = [data];
    }
    this._onConflict = options.onConflict || 'id';
    return this;
  }

  delete() {
    this._delete = true;
    return this;
  }

  async execute() {
    const client = await this.pool.connect();
    try {
      let sql = '';
      let params = [];

      if (this._insert) {
        const columns = Object.keys(this._insert[0]);
        const values = this._insert.map((row, rowIndex) => {
          return `(${columns.map((col, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`;
        }).join(', ');
        
        params = this._insert.flatMap(row => columns.map(col => row[col]));
        sql = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES ${values} RETURNING *`;
      } else if (this._update) {
        const setClause = Object.keys(this._update)
          .map((col, i) => `${col} = $${i + 1}`)
          .join(', ');
        params = [...Object.values(this._update), ...this._whereParams];
        
        sql = `UPDATE ${this.table} SET ${setClause}`;
        if (this._where.length > 0) {
          sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        sql += ' RETURNING *';
      } else if (this._delete) {
        params = this._whereParams;
        sql = `DELETE FROM ${this.table}`;
        if (this._where.length > 0) {
          sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        sql += ' RETURNING *';
      } else if (this._upsert) {
        const columns = Object.keys(this._upsert[0]);
        const values = this._upsert.map((row, rowIndex) => {
          return `(${columns.map((col, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`;
        }).join(', ');
        
        params = this._upsert.flatMap(row => columns.map(col => row[col]));
        const updateClause = columns
          .filter(col => col !== this._onConflict)
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');
        
        sql = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES ${values}`;
        if (updateClause) {
          sql += ` ON CONFLICT (${this._onConflict}) DO UPDATE SET ${updateClause}`;
        } else {
          sql += ` ON CONFLICT (${this._onConflict}) DO NOTHING`;
        }
        sql += ' RETURNING *';
      } else {
        // SELECT
        params = this._whereParams;
        sql = `SELECT ${this._select} FROM ${this.table}`;
        if (this._where.length > 0) {
          sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        if (this._order) {
          sql += ` ${this._order}`;
        }
        if (this._limit) {
          sql += ` ${this._limit}`;
        }
        if (this._offset) {
          sql += ` ${this._offset}`;
        }
      }

      const result = await client.query(sql, params);
      
      if (this._single) {
        return { data: result.rows[0] || null, error: null };
      }
      
      return { data: result.rows, error: null };
    } catch (error) {
      logger.error('Database query error:', error);
      return { data: null, error };
    } finally {
      client.release();
    }
  }

  // 使对象可调用，返回 Promise
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

// 导出单例
export const createLocalDbClient = () => new LocalDatabaseClient();

export default LocalDatabaseClient;
