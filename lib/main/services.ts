import { db, generateId } from './database'
import type {
  BaseEntity,
  CreateHeldCartInput,
  CreateTaskInput,
  HeldCartRecord,
  Setting,
  Task,
  UpdateTaskInput,
} from '@/lib/shared/types'
import type { Database } from 'better-sqlite3'

export interface CrudService<T extends BaseEntity> {
  getAll(): T[]
  getById(id: string): T | undefined
  create(data: Omit<T, keyof BaseEntity>): T
  update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): T | undefined
  delete(id: string): boolean
  search(query: string): T[]
}

export class DatabaseService<T extends BaseEntity> implements CrudService<T> {
  protected tableName: string
  protected db: Database
  protected searchFields: string[]

  constructor(tableName: string, searchFields: string[] = []) {
    this.tableName = tableName
    this.db = db
    this.searchFields = searchFields
  }

  getAll(): T[] {
    const stmt = this.db.prepare(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`
    )
    return stmt.all() as T[]
  }

  getById(id: string): T | undefined {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
    return stmt.get(id) as T | undefined
  }

  create(data: Omit<T, keyof BaseEntity>): T {
    const id = generateId()
    const now = new Date().toISOString()

    const record = {
      id,
      ...data,
      created_at: now,
      updated_at: now,
    }

    const columns = Object.keys(record).join(', ')
    const placeholders = Object.keys(record).map(() => '?').join(', ')
    const values = Object.values(record)

    const stmt = this.db.prepare(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`
    )
    stmt.run(...values)

    return record as T
  }

  update(id: string, data: Partial<Omit<T, keyof BaseEntity>>): T | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const columns = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(', ')
    const values = Object.values(updateData)

    const stmt = this.db.prepare(
      `UPDATE ${this.tableName} SET ${columns} WHERE id = ?`
    )
    stmt.run(...values, id)

    return this.getById(id)
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
    const result = stmt.run(id)
    return result.changes > 0
  }

  search(query: string): T[] {
    if (!this.searchFields.length) return []

    const whereClause = this.searchFields.map((field) => `${field} LIKE ?`).join(' OR ')
    const searchTerm = `%${query}%`
    const params = new Array(this.searchFields.length).fill(searchTerm)

    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE ${whereClause}
      ORDER BY created_at DESC
    `)

    return stmt.all(...params) as T[]
  }
}

export class TasksService extends DatabaseService<Task> {
  constructor() {
    super('tasks', ['title'])
  }

  create(data: CreateTaskInput): Task {
    return super.create({
      title: data.title,
      completed: data.completed ?? 0,
    } as Omit<Task, keyof BaseEntity>)
  }

  update(id: string, data: UpdateTaskInput): Task | undefined {
    return super.update(id, data as Partial<Omit<Task, keyof BaseEntity>>)
  }
}

export class SettingsService {
  private db: Database

  constructor() {
    this.db = db
  }

  get(key: string): string | undefined {
    const stmt = this.db.prepare(`SELECT value FROM settings WHERE key = ?`)
    const row = stmt.get(key) as Setting | undefined
    return row?.value
  }

  set(key: string, value: string): Setting {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
    stmt.run(key, value, now)
    return { key, value, updated_at: now }
  }

  remove(key: string): void {
    const stmt = this.db.prepare(`DELETE FROM settings WHERE key = ?`)
    stmt.run(key)
  }

  removeByPrefix(prefix: string): void {
    const stmt = this.db.prepare(`DELETE FROM settings WHERE key LIKE ?`)
    stmt.run(`${prefix}%`)
  }
}

export class HeldCartsService {
  private db: Database

  constructor() {
    this.db = db
  }

  listByVendor(vendorId: string): HeldCartRecord[] {
    const stmt = this.db.prepare(
      `SELECT * FROM held_carts WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
    return stmt.all(vendorId) as HeldCartRecord[]
  }

  getById(id: string): HeldCartRecord | undefined {
    const stmt = this.db.prepare(`SELECT * FROM held_carts WHERE id = ?`)
    return stmt.get(id) as HeldCartRecord | undefined
  }

  create(data: CreateHeldCartInput): HeldCartRecord {
    const id = generateId()
    const now = new Date().toISOString()
    const record: HeldCartRecord = {
      id,
      vendor_id: data.vendor_id,
      label: data.label?.trim() || null,
      payload: data.payload,
      total: data.total,
      item_count: data.item_count,
      created_at: now,
      updated_at: now,
    }
    this.db
      .prepare(
        `INSERT INTO held_carts (id, vendor_id, label, payload, total, item_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.vendor_id,
        record.label,
        record.payload,
        record.total,
        record.item_count,
        record.created_at,
        record.updated_at,
      )
    return record
  }

  delete(id: string, vendorId?: string): boolean {
    if (vendorId) {
      const stmt = this.db.prepare(
        `DELETE FROM held_carts WHERE id = ? AND vendor_id = ?`,
      )
      return stmt.run(id, vendorId).changes > 0
    }
    const stmt = this.db.prepare(`DELETE FROM held_carts WHERE id = ?`)
    return stmt.run(id).changes > 0
  }
}

export const tasksService = new TasksService()
export const settingsService = new SettingsService()
export const heldCartsService = new HeldCartsService()
