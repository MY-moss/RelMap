import { ipcMain, BrowserWindow } from 'electron'
import { logger } from '../logger'
import * as credentials from './credentials-manager'

interface OAuthConfig {
  provider: string
  authorizeUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scope: string
  redirectUri: string
  extraParams?: Record<string, string>
}

const PROVIDER_CONFIGS: Record<string, Omit<OAuthConfig, 'clientId' | 'clientSecret'>> = {
  'google-contacts': {
    provider: 'google-contacts',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    redirectUri: 'http://localhost:18425/oauth/callback',
  },
  'google-calendar': {
    provider: 'google-calendar',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    redirectUri: 'http://localhost:18425/oauth/callback',
  },
  linkedin: {
    provider: 'linkedin',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: 'r_liteprofile r_emailaddress',
    redirectUri: 'http://localhost:18425/oauth/callback',
  },
}

function getOAuthUrl(config: OAuthConfig): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    access_type: 'offline',
    prompt: 'consent',
  })
  if (config.extraParams) {
    for (const [k, v] of Object.entries(config.extraParams)) {
      params.set(k, v)
    }
  }
  return `${config.authorizeUrl}?${params.toString()}`
}

async function exchangeCode(config: OAuthConfig, code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  })

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${errText}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

async function refreshAccessToken(config: OAuthConfig, refreshToken: string): Promise<{ accessToken: string; expiresIn?: number }> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  })

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  }
}

function buildConfig(pluginId: string, providerConfig: typeof PROVIDER_CONFIGS[string], clientId: string, clientSecret: string): OAuthConfig {
  return {
    ...providerConfig,
    clientId,
    clientSecret,
  }
}

export function registerOAuthIPC(): void {
  ipcMain.handle('oauth:getAuthorizeUrl', async (_event, pluginId: string, provider: string, clientId: string, clientSecret: string) => {
    try {
      const providerConfig = PROVIDER_CONFIGS[provider]
      if (!providerConfig) {
        return { success: false, error: `Unknown provider: ${provider}` } as const
      }
      const config = buildConfig(pluginId, providerConfig, clientId, clientSecret)
      const url = getOAuthUrl(config)
      return { success: true, data: url } as const
    } catch (err) {
      return { success: false, error: (err as Error).message } as const
    }
  })

  ipcMain.handle('oauth:authorize', async (_event, pluginId: string, provider: string, clientId: string, clientSecret: string) => {
    try {
      const providerConfig = PROVIDER_CONFIGS[provider]
      if (!providerConfig) {
        return { success: false, error: `Unknown provider: ${provider}` } as const
      }
      const config = buildConfig(pluginId, providerConfig, clientId, clientSecret)
      const authUrl = getOAuthUrl(config)

      const code = await new Promise<string>((resolve, reject) => {
        const authWindow = new BrowserWindow({
          width: 600,
          height: 700,
          title: `RelMap — ${provider} 授权`,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        })

        authWindow.loadURL(authUrl)

        const handleCallbackUrl = (url: string) => {
          try {
            if (!url.startsWith(config.redirectUri)) return
            const urlObj = new URL(url)
            const codeParam = urlObj.searchParams.get('code')
            const errorParam = urlObj.searchParams.get('error')
            if (errorParam) {
              reject(new Error(`Authorization denied: ${errorParam}`))
              authWindow.close()
              return
            }
            if (codeParam) {
              resolve(codeParam)
              authWindow.close()
            }
          } catch { /* not a valid URL, ignore */ }
        }

        authWindow.webContents.on('will-redirect', (_event, url) => handleCallbackUrl(url))
        authWindow.webContents.on('will-navigate', (_event, url) => handleCallbackUrl(url))
        authWindow.webContents.on('did-navigate', (_event, url) => handleCallbackUrl(url))

        authWindow.on('closed', () => {
          reject(new Error('Authorization window closed by user'))
        })
      })

      const tokenResult = await exchangeCode(config, code)
      const expiryDate = tokenResult.expiresIn
        ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
        : undefined

      credentials.saveCredentials(pluginId, provider, {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiryDate,
        scope: config.scope,
        clientId,
        clientSecret,
      })

      return { success: true, data: { provider, scope: config.scope } } as const
    } catch (err) {
      return { success: false, error: (err as Error).message } as const
    }
  })

  ipcMain.handle('oauth:getToken', async (_event, pluginId: string, provider: string) => {
    try {
      const cred = credentials.getCredentials(pluginId, provider)
      if (!cred) {
        return { success: false, error: 'No credentials found' } as const
      }

      if (cred.expiryDate && new Date(cred.expiryDate) < new Date() && cred.refreshToken) {
        const providerConfig = PROVIDER_CONFIGS[provider]
        if (!providerConfig) {
          return { success: false, error: `Unknown provider: ${provider}` } as const
        }
        const refreshed = await refreshAccessToken(
          buildConfig(pluginId, providerConfig, cred.clientId || '', cred.clientSecret || ''),
          cred.refreshToken,
        )
        const newExpiry = refreshed.expiresIn
          ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
          : undefined
        credentials.saveCredentials(pluginId, provider, {
          accessToken: refreshed.accessToken,
          refreshToken: cred.refreshToken,
          expiryDate: newExpiry,
          scope: cred.scope,
          clientId: cred.clientId,
          clientSecret: cred.clientSecret,
        })
        return { success: true, data: refreshed.accessToken } as const
      }

      return { success: true, data: cred.accessToken } as const
    } catch (err) {
      return { success: false, error: (err as Error).message } as const
    }
  })

  ipcMain.handle('oauth:hasCredentials', async (_event, pluginId: string, provider: string) => {
    return { success: true, data: credentials.hasCredentials(pluginId, provider) } as const
  })

  ipcMain.handle('oauth:revoke', async (_event, pluginId: string, provider: string) => {
    credentials.deleteCredentials(pluginId, provider)
    return { success: true, data: undefined } as const
  })

  logger.info('[OAuth] IPC handlers registered')
}
