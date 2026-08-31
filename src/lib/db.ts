// IndexedDB persistence. Two object stores:
//  - "projects": the serialisable Project object (sheets/layers/measurements/calibration)
//  - "blobs": sheet bitmap images, keyed by Sheet.imageBlobKey, kept out of
//    the project JSON so the project can still be exported/imported as a
//    reasonably small JSON file (images stay local-only, v1 tradeoff).
// The app can hold any number of projects side by side — the dashboard lists
// them all via listProjects(), and each is loaded/saved independently by id.
import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { Project } from './types'

interface TakeoffDB extends DBSchema {
  projects: {
    key: string
    value: Project
  }
  blobs: {
    key: string
    value: Blob
  }
}

const DB_NAME = 'takeoff-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<TakeoffDB>> | null = null

function getDb(): Promise<IDBPDatabase<TakeoffDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TakeoffDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs')
        }
      },
    })
  }
  return dbPromise
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDb()
  await db.put('projects', project)
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const db = await getDb()
  return db.get('projects', id)
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDb()
  return db.getAll('projects')
}

/** Deletes a project and every sheet image blob it owns, so nothing orphaned is left behind. */
export async function deleteProjectAndBlobs(id: string): Promise<void> {
  const db = await getDb()
  const project = await db.get('projects', id)
  if (project) {
    const tx = db.transaction('blobs', 'readwrite')
    await Promise.all(project.sheets.map((sheet) => tx.store.delete(sheet.imageBlobKey)))
    await tx.done
  }
  await db.delete('projects', id)
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDb()
  await db.put('blobs', blob, key)
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const db = await getDb()
  return db.get('blobs', key)
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await getDb()
  await db.delete('blobs', key)
}
