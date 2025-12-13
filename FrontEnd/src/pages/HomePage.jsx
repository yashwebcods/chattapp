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
      <div className='mt-16 p-3 h-[calc(100vh-3rem)] bg-base-200'>
        <div className='flex items-center justify-center pi-20 px-4'>
          <div className='bg-base-100 rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-8rem)]'>
            <div className='flex h-full rounded-lg overflow-hidden'>
              {/* Mobile: Show only one at a time */}
              <div className='lg:hidden flex h-full w-full'>
                {!selectedUser && !selectedGroup && !isOn ? (
                  <Sidebar onSelectUser={handleSelectUser} />
                ) : (
                  <div className='w-full flex flex-col'>
                    <div className='flex-1 overflow-hidden'>
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
                <div className='flex-1 flex flex-col'>
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
      </div>
    </>
  )
}

export default HomePage