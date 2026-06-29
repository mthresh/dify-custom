import { AppModeEnum } from '@/types/app'
import { buildWebAppUrl } from '../web-app-url'

vi.mock('@/utils/var', () => ({
  basePath: '/dify',
}))

describe('buildWebAppUrl', () => {
  it('should append basePath when appBaseUrl is an origin', () => {
    expect(buildWebAppUrl({
      appBaseUrl: 'http://localhost',
      appMode: AppModeEnum.CHAT,
      accessToken: 'token-1',
    })).toBe('http://localhost/dify/chat/token-1')
  })

  it('should not duplicate basePath when appBaseUrl already includes it', () => {
    expect(buildWebAppUrl({
      appBaseUrl: 'http://localhost/dify',
      appMode: AppModeEnum.CHAT,
      accessToken: 'token-1',
    })).toBe('http://localhost/dify/chat/token-1')
  })

  it('should trim a trailing slash before joining paths', () => {
    expect(buildWebAppUrl({
      appBaseUrl: 'http://localhost/dify/',
      appMode: AppModeEnum.CHAT,
      accessToken: 'token-1',
    })).toBe('http://localhost/dify/chat/token-1')
  })
})
