import { app } from 'electron'
import Database, { type Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export const DB_FILENAME = 'app.sqlite'
const dbPath = path.join(app.getPath('userData'), DB_FILENAME)

export const db: DatabaseType = new Database(dbPath)

db.pragma('journal_mode = WAL')

const schemas = {
  tasks: `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
}

export function initializeDatabase() {
  try {
    Object.values(schemas).forEach((schema) => {
      db.exec(schema)
    })

    const defaultSettings = [
      { key: 'app_version', value: '1.0.0' },
      { key: 'theme', value: 'dark' },
    ]

    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `)

    defaultSettings.forEach((setting) => {
      insertSetting.run(setting.key, setting.value)
    })

    console.warn('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

export function generateId(): string {
  return uuidv4()
}

export default db
