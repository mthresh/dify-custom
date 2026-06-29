import { basePath } from '@/utils/var'

type BuildWebAppUrlArgs = {
  appBaseUrl: string
  appMode: string
  accessToken: string
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const getAppBaseUrlWithBasePath = (appBaseUrl: string) => {
  const normalizedAppBaseUrl = trimTrailingSlash(appBaseUrl)

  if (!basePath)
    return normalizedAppBaseUrl

  try {
    const url = new URL(normalizedAppBaseUrl)
    const normalizedPathname = trimTrailingSlash(url.pathname)
    if (normalizedPathname === basePath || normalizedPathname.startsWith(`${basePath}/`))
      return normalizedAppBaseUrl
  }
  catch {
    if (normalizedAppBaseUrl.endsWith(basePath))
      return normalizedAppBaseUrl
  }

  return `${normalizedAppBaseUrl}${basePath}`
}

export const buildWebAppUrl = ({
  appBaseUrl,
  appMode,
  accessToken,
}: BuildWebAppUrlArgs) => `${getAppBaseUrlWithBasePath(appBaseUrl)}/${appMode}/${accessToken}`
