import { resolveServerConsoleApiUrl } from '@/service/server'
import { basePath } from '@/utils/var'

const REFRESH_TOKEN_PATH = '/refresh-token'
const AUTH_REFRESH_PATH = '/auth/refresh'
const DEFAULT_REDIRECT_PATH = '/'

const withBasePath = (pathname: string) => {
  if (!basePath || pathname === basePath || pathname.startsWith(`${basePath}/`))
    return pathname

  return `${basePath}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
}

const withoutBasePath = (pathname: string) => {
  if (!basePath)
    return pathname
  if (pathname === basePath)
    return '/'
  if (pathname.startsWith(`${basePath}/`))
    return pathname.slice(basePath.length)

  return pathname
}

const resolveSafeRedirectPath = (request: Request) => {
  const requestUrl = new URL(request.url)
  const redirectUrl = requestUrl.searchParams.get('redirect_url')

  if (!redirectUrl)
    return DEFAULT_REDIRECT_PATH

  try {
    const target = new URL(redirectUrl, requestUrl.origin)
    if (target.origin !== requestUrl.origin)
      return DEFAULT_REDIRECT_PATH
    if (withoutBasePath(target.pathname) === AUTH_REFRESH_PATH)
      return DEFAULT_REDIRECT_PATH

    return `${withoutBasePath(target.pathname)}${target.search}`
  }
  catch {
    return DEFAULT_REDIRECT_PATH
  }
}

const getSetCookieHeaders = (headers: Headers) => {
  const getSetCookie = Reflect.get(headers, 'getSetCookie')

  if (typeof getSetCookie === 'function') {
    const values: unknown = getSetCookie.call(headers)
    return Array.isArray(values)
      ? values.filter((value): value is string => typeof value === 'string')
      : []
  }

  const setCookie = headers.get('set-cookie')
  return setCookie ? [setCookie] : []
}

const createRedirectResponse = (pathname: string, setCookies: string[] = []) => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Location': pathname,
  })

  for (const cookie of setCookies)
    headers.append('Set-Cookie', cookie)

  return new Response(null, {
    status: 303,
    headers,
  })
}

const createSigninRedirectResponse = (redirectPath: string) =>
  createRedirectResponse(`${withBasePath('/signin')}?redirect_url=${encodeURIComponent(redirectPath)}`)

export async function GET(request: Request) {
  const redirectPath = resolveSafeRedirectPath(request)
  const refreshUrl = resolveServerConsoleApiUrl(REFRESH_TOKEN_PATH)
  const cookie = request.headers.get('cookie')

  if (!refreshUrl || !cookie)
    return createSigninRedirectResponse(redirectPath)

  try {
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        cookie,
      }),
      cache: 'no-store',
    })

    if (!response.ok)
      return createSigninRedirectResponse(redirectPath)

    return createRedirectResponse(withBasePath(redirectPath), getSetCookieHeaders(response.headers))
  }
  catch {
    return createSigninRedirectResponse(redirectPath)
  }
}
