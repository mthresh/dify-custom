'use client'
import type { FC } from 'react'
import type { InstalledApp } from '@/models/explore'
import { cn } from '@langgenius/dify-ui/cn'
import {
  useEffect,
  useState,
} from 'react'
import AppIcon from '@/app/components/base/app-icon'
import Loading from '@/app/components/base/loading'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import useDocumentTitle from '@/hooks/use-document-title'
import { useThemeContext } from '../embedded-chatbot/theme/theme-context'
import ChatWrapper from './chat-wrapper'
import {
  ChatWithHistoryContext,
  useChatWithHistoryContext,
} from './context'
import Header from './header'
import HeaderInMobile from './header-in-mobile'
import { useChatWithHistory } from './hooks'
import Sidebar from './sidebar'

type ChatWithHistoryProps = {
  className?: string
}
const ChatWithHistory: FC<ChatWithHistoryProps> = ({
  className,
}) => {
  const {
    appData,
    appChatListDataLoading,
    chatShouldReloadKey,
    isMobile,
    themeBuilder,
    sidebarCollapseState,
    customerServiceMode,
  } = useChatWithHistoryContext()
  const isSidebarCollapsed = sidebarCollapseState
  const customConfig = appData?.custom_config
  const site = appData?.site

  const [showSidePanel, setShowSidePanel] = useState(false)

  useEffect(() => {
    themeBuilder?.buildTheme(site?.chat_color_theme, site?.chat_color_theme_inverted)
  }, [site, customConfig, themeBuilder])

  useEffect(() => {
    if (!isSidebarCollapsed)
      setShowSidePanel(false)
  }, [isSidebarCollapsed])

  useDocumentTitle(site?.title || 'Chat')

  return (
    <div className={cn(
      'flex h-full',
      customerServiceMode
        ? 'bg-white'
        : 'bg-background-default-burn',
      (isMobile || customerServiceMode) && 'flex-col',
      className,
    )}
    >
      {!customerServiceMode && !isMobile && (
        <div className={cn(
          'flex w-[236px] flex-col p-1 pr-0 transition-all duration-200 ease-in-out',
          isSidebarCollapsed && 'w-0 overflow-hidden p-0!',
        )}
        >
          <Sidebar />
        </div>
      )}
      {!customerServiceMode && isMobile && (
        <HeaderInMobile />
      )}
      {customerServiceMode && !isMobile && (
        <div className="flex h-16 shrink-0 items-center gap-2 bg-white px-5 py-3">
          <AppIcon
            size="tiny"
            iconType={site?.icon_type}
            icon={site?.icon}
            background={site?.icon_background}
            imageUrl={site?.icon_url}
          />
          <div className="truncate system-md-semibold text-text-secondary">
            {site?.title}
          </div>
        </div>
      )}
      {customerServiceMode && isMobile && (
        <div className="flex h-12 shrink-0 items-center justify-center bg-white px-4">
          <div className="truncate system-md-semibold text-text-secondary">
            {site?.title}
          </div>
        </div>
      )}
      <div className={cn('relative grow p-2', isMobile && 'h-[calc(100%-56px)] p-0', customerServiceMode && 'p-0!', customerServiceMode && isMobile && 'h-[calc(100%-48px)]')}>
        {!customerServiceMode && isSidebarCollapsed && (
          <div
            className={cn(
              'absolute top-0 z-20 flex h-full w-[256px] flex-col p-2 transition-all duration-500 ease-in-out',
              showSidePanel ? 'left-0' : 'left-[-248px]',
            )}
            onMouseEnter={() => setShowSidePanel(true)}
            onMouseLeave={() => setShowSidePanel(false)}
          >
            <Sidebar isPanel panelVisible={showSidePanel} />
          </div>
        )}
        <div className={cn(
          'flex h-full flex-col overflow-hidden border-[0,5px] border-components-panel-border-subtle bg-chatbot-bg',
          isMobile ? 'rounded-t-2xl' : 'rounded-2xl',
          customerServiceMode && 'rounded-none! border-none! bg-linear-to-b from-[#eaf3ff] via-[#f7fbff] to-white',
        )}
        >
          {!customerServiceMode && !isMobile && <Header />}
          {appChatListDataLoading && (
            <Loading type="app" />
          )}
          {!appChatListDataLoading && (
            <ChatWrapper key={chatShouldReloadKey} />
          )}
        </div>
      </div>
    </div>
  )
}

type ChatWithHistoryWrapProps = {
  installedAppInfo?: InstalledApp
  className?: string
  customerServiceMode?: boolean
}
const ChatWithHistoryWrap: FC<ChatWithHistoryWrapProps> = ({
  installedAppInfo,
  className,
  customerServiceMode,
}) => {
  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const themeBuilder = useThemeContext()

  const {
    appData,
    appParams,
    appMeta,
    appChatListDataLoading,
    currentConversationId,
    currentConversationItem,
    appPrevChatTree,
    pinnedConversationList,
    conversationList,
    newConversationInputs,
    newConversationInputsRef,
    handleNewConversationInputsChange,
    inputsForms,
    handleNewConversation,
    handleStartChat,
    handleChangeConversation,
    handlePinConversation,
    handleUnpinConversation,
    handleDeleteConversation,
    conversationRenaming,
    handleRenameConversation,
    handleNewConversationCompleted,
    chatShouldReloadKey,
    isInstalledApp,
    appId,
    handleFeedback,
    currentChatInstanceRef,
    sidebarCollapseState,
    handleSidebarCollapse,
    clearChatList,
    setClearChatList,
    isResponding,
    setIsResponding,
    currentConversationInputs,
    setCurrentConversationInputs,
    allInputsHidden,
    initUserVariables,
  } = useChatWithHistory(installedAppInfo)

  return (
    <ChatWithHistoryContext.Provider value={{
      appData,
      appParams,
      appMeta,
      appChatListDataLoading,
      currentConversationId,
      currentConversationItem,
      appPrevChatTree,
      pinnedConversationList,
      conversationList,
      newConversationInputs,
      newConversationInputsRef,
      handleNewConversationInputsChange,
      inputsForms,
      handleNewConversation,
      handleStartChat,
      handleChangeConversation,
      handlePinConversation,
      handleUnpinConversation,
      handleDeleteConversation,
      conversationRenaming,
      handleRenameConversation,
      handleNewConversationCompleted,
      chatShouldReloadKey,
      isMobile,
      isInstalledApp,
      appId,
      handleFeedback,
      currentChatInstanceRef,
      themeBuilder,
      sidebarCollapseState,
      handleSidebarCollapse,
      clearChatList,
      setClearChatList,
      isResponding,
      setIsResponding,
      currentConversationInputs,
      setCurrentConversationInputs,
      allInputsHidden,
      initUserVariables,
      customerServiceMode,
    }}
    >
      <ChatWithHistory className={className} />
    </ChatWithHistoryContext.Provider>
  )
}

const ChatWithHistoryWrapWithCheckToken: FC<ChatWithHistoryWrapProps> = ({
  installedAppInfo,
  className,
  customerServiceMode,
}) => {
  return (
    <ChatWithHistoryWrap
      installedAppInfo={installedAppInfo}
      className={className}
      customerServiceMode={customerServiceMode}
    />
  )
}

export default ChatWithHistoryWrapWithCheckToken
