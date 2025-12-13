import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import Sidebar from '../components/Sidebar'
import NoChatSelected from '../components/NoChatSelected'
import Chat from '../components/Chat'
import { useMessageStore } from '../store/useMessageStore'
import GroupPage from '../pages/GroupPage'
import { ArrowLeft } from 'lucide-react'

function HomePage() {
  const { selectedUser, selectedGroup, isOn, setSelectedUser, setSelectedGroup } = useMessageStore()
  const [showSidebar, setShowSidebar] = useState(true)

  const handleBackToSidebar = () => {
    setSelectedUser(null)
    setSelectedGroup(null)
    setShowSidebar(true)
  }

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setShowSidebar(false)
  }

  return (
    <>
      <div className='min-h-screen bg-base-200 pt-16'>
        <div className='w-full h-[calc(100vh-4rem)]'>
          <div className='flex h-full overflow-hidden bg-base-100'>
            {/* Mobile: Show only one at a time */}
            <div className='lg:hidden flex h-full w-full'>
              {!selectedUser && !selectedGroup && !isOn ? (
                <Sidebar onSelectUser={handleSelectUser} />
              ) : (
                <div className='w-full flex flex-col'>
                  <div className='flex-1 overflow-hidden h-full'>
                    {isOn ? (
                      <GroupPage />
                    ) : selectedUser ? (
                      <Chat />
                    ) : selectedGroup ? (
                      <Chat />
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop: Show sidebar and welcome/chat */}
            <div className='hidden lg:flex h-full w-full'>
              <Sidebar onSelectUser={handleSelectUser} />
              <div className='flex-1 flex flex-col h-full'>
                <div className='flex-1 overflow-hidden'>
                  {!selectedUser && !selectedGroup && !isOn ? (
                    <NoChatSelected />
                  ) : isOn ? (
                    <GroupPage />
                  ) : selectedUser ? (
                    <Chat />
                  ) : selectedGroup ? (
                    <Chat />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default HomePage