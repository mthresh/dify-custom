import LightCustomerChat from '@/app/components/share/light-customer-chat'

async function Chat({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <LightCustomerChat token={token} />
}

export default Chat
