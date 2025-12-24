import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import Sidebar from '../components/Sidebar'
import NoChatSelected from '../components/NoChatSelected'
import Chat from '../components/Chat'
import { useMessageStore } from '../store/useMessageStore'
import GroupPage from '../pages/GroupPage'
import { ArrowLeft } from 'lucide-react'

function HomePage() {
  const { selectedUser, selectedGroup, isOn, setSelectedUser, setSelectedGroup, setGroup } = useMessageStore()
  const { authUser } = useAuthStore()
  const canManageGroups = authUser?.role === 'owner' || authUser?.role === 'manager'
  const [showSidebar, setShowSidebar] = useState(true)

  React.useEffect(() => {
    if (isOn && !canManageGroups) {
      setGroup(false)
    }
  }, [isOn, canManageGroups, setGroup])

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
                  {/* Mobile Header with Back Button */}
                  <div className='flex items-center gap-3 p-3 bg-base-200 border-b border-base-300 lg:hidden'>
                    <button
                      onClick={handleBackToSidebar}
                      className='btn btn-ghost btn-circle btn-sm'
                      title='Back to conversations'
                    >
                      <ArrowLeft className='size-5' />
                    </button>
                    <div className='flex-1'>
                      <h3 className='font-semibold text-sm truncate'>
                        {selectedUser ? selectedUser.fullName : selectedGroup?.name || 'Chat'}
                      </h3>
                    </div>
                  </div>
                  <div className='flex-1 overflow-hidden h-full'>
                    {isOn && canManageGroups ? (
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
                  ) : isOn && canManageGroups ? (
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