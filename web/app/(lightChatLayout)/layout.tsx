import type { PropsWithChildren } from 'react'

function LightChatLayout({ children }: PropsWithChildren) {
  return <div className="h-dvh min-w-[300px] overflow-hidden">{children}</div>
}

export default LightChatLayout
