import { dialog, BrowserWindow } from 'electron'

export async function showSaveDialogHelper(options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> {
  const win = BrowserWindow.getFocusedWindow()
  return win
    ? await dialog.showSaveDialog(win, options)
    : await dialog.showSaveDialog(options)
}

export async function showOpenDialogHelper(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> {
  const win = BrowserWindow.getFocusedWindow()
  return win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
}
