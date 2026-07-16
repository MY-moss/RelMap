import { ipcMain } from 'electron'
import { logIpcError } from '../logger'
import { searchGlobal, semanticSearch } from '../../src/main/db/repositories/search.repo'
import type { Result, SearchResults, SemanticSearchResults } from '../../src/shared/types'

export function registerSearchIPC(): void {
  ipcMain.handle('search:global', async (_event, query: string): Promise<Result<SearchResults>> => {
    try {
      return searchGlobal(query)
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('search:semantic', async (_event, query: string): Promise<Result<SemanticSearchResults>> => {
    try {
      return semanticSearch(query)
    } catch (e) {
      logIpcError('search:semantic', e)
      return { success: false, error: (e as Error).message }
    }
  })
}
