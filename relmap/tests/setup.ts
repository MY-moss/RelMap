import { vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: () => '/mock/userData',
    getVersion: () => '1.0.0',
    on: vi.fn(),
    isReady: () => true,
    whenReady: () => Promise.resolve(),
    quit: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
  Notification: vi.fn(),
  BrowserWindow: vi.fn(),
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
  },
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}))
