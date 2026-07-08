import { render, screen } from '@testing-library/react'
import Layout from '../layout'

vi.mock('@/context/web-app-context', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="web-app-store-provider">{children}</div>
  ),
}))

vi.mock('../components/splash', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="splash">{children}</div>
  ),
}))

describe('Share layout', () => {
  it('uses dynamic viewport height so mobile chat input stays inside the visible page', () => {
    const { container } = render(
      <Layout>
        <div>Shared app content</div>
      </Layout>,
    )

    const shell = container.firstElementChild
    expect(shell).toHaveClass(
      'h-dvh',
      'min-w-[300px]',
      'overflow-hidden',
      'pb-[env(safe-area-inset-bottom)]',
    )
    expect(screen.getByText('Shared app content')).toBeInTheDocument()
  })
})
