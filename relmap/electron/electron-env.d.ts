/* eslint-disable @typescript-eslint/no-explicit-any */
// Electron type declarations for RelMap
// This file provides ambient types for Electron APIs used in the main process.

declare module 'electron' {
  export interface App {
    getPath(name: string): string
    getName(): string
    getVersion(): string
    isReady(): boolean
    whenReady(): Promise<void>
    on(event: string, listener: (...args: unknown[]) => void): App
    quit(): void
    getLastCrashReport(): unknown
  }

  export interface BrowserWindowConstructorOptions {
    title?: string
    width?: number
    height?: number
    minWidth?: number
    minHeight?: number
    icon?: string
    webPreferences?: {
      preload?: string
      contextIsolation?: boolean
      nodeIntegration?: boolean
      sandbox?: boolean
      webSecurity?: boolean
      allowRunningInsecureContent?: boolean
      disableBlinkFeatures?: string
      spellcheck?: boolean
    }
  }

  export interface BrowserWindow {
    loadURL(url: string): Promise<void>
    loadFile(path: string): Promise<void>
    webContents: { send(channel: string, data?: unknown): void }
    close(): void
    on(event: string, listener: (...args: unknown[]) => void): BrowserWindow
    once(event: string, listener: (...args: unknown[]) => void): BrowserWindow
    show(): void
    destroy(): void
  }

  export interface BrowserWindowConstructor {
    new(options?: BrowserWindowConstructorOptions): BrowserWindow
    getFocusedWindow(): BrowserWindow | null
    getAllWindows(): BrowserWindow[]
  }

  export interface IpcMainInvokeEvent {
    sender: WebContents
  }

  export interface IpcMainEvent {
    sender: WebContents
  }

  export interface WebContents {
    send(channel: string, ...args: unknown[]): void
  }

  export interface IpcMain {
    handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => any): void
    on(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void): void
  }

  export interface IpcRenderer {
    send(channel: string, ...args: any[]): void
    invoke(channel: string, ...args: any[]): Promise<any>
    on(channel: string, listener: (event: any, ...args: any[]) => void): void
    removeListener(channel: string, listener: (...args: any[]) => void): void
    removeAllListeners(channel: string): void
  }

  export interface Dialog {
    showOpenDialog(browserWindow: BrowserWindow | null, options: Record<string, unknown>): Promise<{ canceled: boolean; filePaths: string[] }>
    showOpenDialog(options: Record<string, unknown>): Promise<{ canceled: boolean; filePaths: string[] }>
    showSaveDialog(browserWindow: BrowserWindow | null, options: Record<string, unknown>): Promise<{ canceled: boolean; filePath: string }>
    showSaveDialog(options: Record<string, unknown>): Promise<{ canceled: boolean; filePath: string }>
    showMessageBox(options: Record<string, unknown>): Promise<{ response: number }>
    showErrorBox(title: string, content: string): void
  }

  export interface ContextBridge {
    exposeInMainWorld(name: string, exposed: any): void
  }

  export interface Shell {
    showItemInFolder(path: string): void
    openPath(path: string): Promise<string>
    openExternal(url: string): Promise<void>
  }

  export interface Notification {
    new(options?: Record<string, unknown>): { show(): void; on(event: string, listener: (...args: unknown[]) => void): void }
  }

  export interface Menu {
    buildFromTemplate(template: unknown[]): unknown
    setApplicationMenu(menu: unknown): void
  }

  export const app: App
  export const ipcMain: IpcMain
  export const dialog: Dialog
  export const BrowserWindow: BrowserWindowConstructor
  export const ipcRenderer: IpcRenderer
  export const contextBridge: ContextBridge
  export const shell: Shell
  export const Notification: Notification
  export const Menu: Menu
}

declare const Electron: {
  IpcRendererEvent: new (...args: unknown[]) => { sender: { send(channel: string, ...args: unknown[]): void } }
  SaveDialogOptions: Record<string, unknown>
  OpenDialogOptions: Record<string, unknown>
  OpenDialogReturnValue: Record<string, unknown>
  SaveDialogReturnValue: Record<string, unknown>
}
