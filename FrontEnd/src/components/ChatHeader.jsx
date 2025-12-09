import React from 'react'
import { useMessageStore } from '../store/useMessageStore'
import { useAuthStore } from '../store/useAuthStore'
import { X, MoreVertical, Trash2, CheckSquare } from 'lucide-react'

export const ChatHeader = () => {
  const { 
    selectedUser, 
    selectedGroup, 
    setSelectedUser, 
    setSelectedGroup, 
    clearChat, 
    clearGroupChat,
    setSelectionMode, 
    isSelectionMode 
  } = useMessageStore()
  const { onlineUsers } = useAuthStore()

  const handleClearChat = async () => {
    if (selectedUser) {
      if (window.confirm("Are you sure you want to clear this chat? This cannot be undone.")) {
        await clearChat(selectedUser._id);
      }
    } else if (selectedGroup) {
      if (window.confirm("Are you sure you want to clear this group chat? This cannot be undone.")) {
        await clearGroupChat(selectedGroup._id);
      }
    }
  };

  const handleClose = () => {
    if (selectedUser) {
      setSelectedUser(null);
    } else if (selectedGroup) {
      setSelectedGroup(null);
    }
  };

  // Determine what to display
  const displayName = selectedUser?.fullName || selectedGroup?.name || 'Chat';
  const displayImage = selectedUser?.image || selectedGroup?.image || '/avatar.png';
  const isOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;
  const statusText = selectedGroup ? `${selectedGroup.members?.length || 0} members` : (isOnline ? "Online" : "Offline");

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={displayImage} alt={displayName} />
            </div>
          </div>

          {/* User/Group info */}
          <div>
            <h3 className="font-medium">{displayName}</h3>
            <p className="text-sm text-base-content/70">
              {statusText}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Options Dropdown */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm">
              <MoreVertical className="size-5" />
            </div>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <button onClick={() => setSelectionMode(!isSelectionMode)}>
                  <CheckSquare className="size-4" />
                  {isSelectionMode ? "Cancel Selection" : "Select Messages"}
                </button>
              </li>
              <li>
                <button onClick={handleClearChat} className="text-error">
                  <Trash2 className="size-4" />
                  Clear Chat
                </button>
              </li>
            </ul>
          </div>

          {/* Close button */}
          <button onClick={handleClose} className="btn btn-ghost btn-circle btn-sm">
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
