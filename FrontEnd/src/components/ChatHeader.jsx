import React from 'react'
import { useMessageStore } from '../store/useMessageStore'
import { useAuthStore } from '../store/useAuthStore'
import { X, MoreVertical, Trash2, CheckSquare, ArrowLeft, Users, UserPlus } from 'lucide-react'

export const ChatHeader = () => {
  // Use selector to ensure re-renders when typing state changes
  const selectedUser = useMessageStore((state) => state.selectedUser)
  const selectedGroup = useMessageStore((state) => state.selectedGroup)
  const setSelectedUser = useMessageStore((state) => state.setSelectedUser)
  const setSelectedGroup = useMessageStore((state) => state.setSelectedGroup)
  const clearChat = useMessageStore((state) => state.clearChat)
  const clearGroupChat = useMessageStore((state) => state.clearGroupChat)
  const setSelectionMode = useMessageStore((state) => state.setSelectionMode)
  const isSelectionMode = useMessageStore((state) => state.isSelectionMode)

  // CRITICAL: Use individual selectors for typing state to ensure re-renders
  const typingUsers = useMessageStore((state) => state.typingUsers)
  const groupTypingData = useMessageStore((state) => state.groupTypingData)

  const { onlineUsers, authUser } = useAuthStore()

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

  // Debug logging
  console.log("🎨 ChatHeader State:", {
    selectedUser: selectedUser?.fullName,
    selectedGroup: selectedGroup?.name,
    typingUsers: typingUsers,
    groupTypingData: groupTypingData,
    isUserTyping,
    isGroupTyping,
    groupTypers
  });

  // Monitor typing state changes
  React.useEffect(() => {
    console.log("🔄 ChatHeader Re-rendered! Typing state:", {
      typingUsers,
      isUserTyping,
      selectedUserId: selectedUser?._id
    });
  }, [typingUsers, isUserTyping, selectedUser]);

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
            <h3 className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{displayName}</h3>
            <p className={`text-xs sm:text-sm truncate ${(isUserTyping || isGroupTyping) ? 'text-primary animate-pulse font-medium' : 'text-base-content/70'}`}>
              {statusText}
            </p>
          </div>
        </div>

        {/* Group Actions (only for groups) */}
        {selectedGroup && (
          <div className="hidden lg:flex items-center gap-1">
            <button
              className='btn btn-ghost btn-sm gap-2'
              onClick={() => document.getElementById('members_modal').showModal()}
            >
              <Users className='size-4' />
              <span className='hidden xl:inline'>Members</span>
            </button>

            {(authUser?.role === 'owner' || authUser?.role === 'manager') && (
              <button
                className='btn btn-sm btn-ghost gap-2 text-primary'
                onClick={() => document.getElementById('add_member_modal').showModal()}
              >
                <UserPlus className='size-4' />
                <span className='hidden xl:inline'>Add Member</span>
              </button>
            )}
          </div>
        )}

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
              {/* Mobile Group Actions */}
              {selectedGroup && (
                <>
                  <div className="divider my-1 lg:hidden"></div>
                  <li className="lg:hidden">
                    <button onClick={() => document.getElementById('members_modal').showModal()}>
                      <Users className="size-4" />
                      <span>View Members</span>
                    </button>
                  </li>
                  {(authUser?.role === 'owner' || authUser?.role === 'manager') && (
                    <li className="lg:hidden">
                      <button onClick={() => document.getElementById('add_member_modal').showModal()} className="text-primary">
                        <UserPlus className="size-4" />
                        <span>Add Member</span>
                      </button>
                    </li>
                  )}
                </>
              )}
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
