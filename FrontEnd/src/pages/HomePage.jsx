import React from 'react'
import { useAuthStore } from '../store/useAuthStore'
import Sidebar from '../components/Sidebar'
import NoChatSelected from '../components/NoChatSelected'
import Chat from '../components/Chat'
import { useMessageStore } from '../store/useMessageStore'
import GroupPage from '../pages/GroupPage'

function HomePage() {
  const { selectedUser, selectedGroup, isOn } = useMessageStore()

  return (
    <>
      <div className='mt-16 p-3 h-screen bg-base-200'>
        <div className='flex items-center justify-center pi-20 px-4'>
          <div className='bg-base-100 rounded-lg shadow-xl w-full max-w-6xl h-[calc(100vh-8rem)]'>
            <div className='flex h-full rounded-lg overflow-hidden'>
              <Sidebar />

              {isOn ? (
                <GroupPage />
              ) : selectedUser ? (
                <Chat />
              ) : selectedGroup ? (
                <Chat />
              ) : (
                <NoChatSelected />
              )}
            </div>

          </div>
        </div >
      </div>
    </>
  )
}

export default HomePage