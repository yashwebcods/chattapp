import React from 'react'
import { useMessageStore } from '../store/useMessageStore'
import { useAuthStore } from '../store/useAuthStore'
import { X, MoreVertical, Trash2, CheckSquare, ArrowLeft } from 'lucide-react'

export const ChatHeader = () => {
  const {
    selectedUser,
    selectedGroup,
    setSelectedUser,
    setSelectedGroup,
    clearChat,
    clearGroupChat,
    setSelectionMode,
    isSelectionMode,
    typingUsers,
    groupTypingData
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

  const handleBack = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
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

  // Typing indicator logic
  const isUserTyping = selectedUser && typingUsers.includes(selectedUser._id);
  const groupTypers = selectedGroup && groupTypingData[selectedGroup._id];
  const isGroupTyping = groupTypers && groupTypers.length > 0;

  let statusText;
  if (isUserTyping) {
    statusText = "typing...";
  } else if (isGroupTyping) {
    statusText = `${groupTypers.join(", ")} typing...`;
  } else if (selectedGroup) {
    statusText = `${selectedGroup.members?.length || 0} members`;
  } else {
    statusText = isOnline ? "Online" : "Offline";
  }

  return (
    <div className="p-2.5 sm:p-3 border-b border-base-300">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="btn btn-ghost btn-circle btn-xs sm:btn-sm hover:bg-base-200 flex-shrink-0"
            title="Back to chat list"
          >
            <ArrowLeft className="size-4 sm:size-5" />
          </button>

          {/* Avatar */}
          <div className="avatar flex-shrink-0">
            <div className="size-8 sm:size-10 rounded-full relative">
              <img src={displayImage} alt={displayName} />
              {isOnline && (
                <span className="absolute bottom-0 right-0 size-2 sm:size-3 bg-green-500 rounded-full ring-2 ring-base-100"></span>
              )}
            </div>
          </div>

          {/* User/Group info */}
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm sm:text-base truncate">{displayName}</h3>
            <p className={`text-xs sm:text-sm truncate ${(isUserTyping || isGroupTyping) ? 'text-primary animate-pulse font-medium' : 'text-base-content/70'}`}>
              {statusText}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Options Dropdown */}
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle btn-xs sm:btn-sm hover:bg-base-200"
              title="More options"
            >
              <MoreVertical className="size-4 sm:size-5" />
            </button>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48 sm:w-52">
              <li>
                <button onClick={() => setSelectionMode(!isSelectionMode)}>
                  <CheckSquare className="size-4" />
                  <span className="hidden sm:inline">{isSelectionMode ? "Cancel Selection" : "Select Messages"}</span>
                  <span className="sm:hidden">{isSelectionMode ? "Cancel" : "Select"}</span>
                </button>
              </li>
              <li>
                <button onClick={handleClearChat} className="text-error hover:bg-error/10">
                  <Trash2 className="size-4" />
                  <span className="hidden sm:inline">Clear Chat</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-circle btn-xs sm:btn-sm hover:bg-base-200"
            title="Close chat"
          >
            <X className="size-4 sm:size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
