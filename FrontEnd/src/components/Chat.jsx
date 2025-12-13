import React, { useEffect, useRef } from 'react';
import { useMessageStore } from '../store/useMessageStore';
import { ChatHeader } from './ChatHeader';
import { MessageInput } from './MessageInput';
import ChatSkeleton from './Skeletons/ChatSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { DateFormated } from '../lib/utills';
import { Trash2 } from 'lucide-react';

function Chat() {
  const {
    message,
    getMessage,
    getGroupMessages,
    isMessageLoding,
    selectedUser,
    selectedGroup,
    isSelectionMode,
    selectedMessageIds,
    toggleMessageSelection,
    deleteMessages,
    subcribeToMessages,
    unsubcribeToMessage,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages
  } = useMessageStore();

  const { authUser } = useAuthStore();

  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessage(selectedUser._id);
      subcribeToMessages();
    } else if (selectedGroup?._id) {
      getGroupMessages(selectedGroup._id);
      subscribeToGroupMessages();
    }
  }, [selectedUser?._id, selectedGroup?._id]);

  useEffect(() => {
    return () => {
      unsubcribeToMessage();
      unsubscribeFromGroupMessages();
    };
  }, [selectedUser?._id, selectedGroup?._id]);

  useEffect(() => {
    if (messageEndRef.current && message && !isSelectionMode) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message, isSelectionMode]);

  const handleDeleteSelected = async () => {
    if (window.confirm(`Delete ${selectedMessageIds.length} messages?`)) {
      await deleteMessages(selectedMessageIds);
    }
  };

  if (isMessageLoding) {
    return (
      <div className='flex flex-col h-full'>
        <ChatHeader />
        <div className='flex-1 overflow-hidden'>
          <ChatSkeleton />
        </div>
        <MessageInput />
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='flex-shrink-0'>
        <ChatHeader />
      </div>
      
      {isSelectionMode && selectedMessageIds.length > 0 && (
        <div className='sticky top-0 z-50 py-2 bg-base-100/80 backdrop-blur-sm flex justify-center'>
          <button
            onClick={handleDeleteSelected}
            className='btn btn-error btn-sm shadow-lg gap-2'
          >
            <Trash2 className='size-4' />
            Delete {selectedMessageIds.length} messages
          </button>
        </div>
      )}

      <div className='flex-1 overflow-y-auto'>
        <div className='p-2 sm:p-4 space-y-3 sm:space-y-4'>
          {message.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-base-content/60'>
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            message.map((v) => {
              const isOwnMessage =
                v.senderId === authUser._id || v.senderId?._id === authUser._id;

              return (
                <div
                  key={v._id}
                  className={`flex items-center gap-2 group ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                    }`}
                >
                  {isSelectionMode && isOwnMessage && (
                    <input
                      type='checkbox'
                      className='checkbox checkbox-primary checkbox-xs'
                      checked={selectedMessageIds.includes(v._id)}
                      onChange={() => toggleMessageSelection(v._id)}
                    />
                  )}

                  <div
                    className={`chat ${isOwnMessage ? 'chat-end' : 'chat-start'
                      } flex-1`}
                    onClick={() =>
                      isSelectionMode && isOwnMessage && toggleMessageSelection(v._id)
                    }
                  >
                    <div className='chat-image avatar flex-shrink-0'>
                      <div className='size-8 sm:size-10 rounded-full border'>
                        <img
                          src={
                            isOwnMessage
                              ? authUser.image || '/avatar.png'
                              : selectedUser?.image ||
                              selectedGroup?.image ||
                              '/avatar.png'
                          }
                          alt="Avatar"
                        />
                      </div>
                    </div>

                    <div className='chat-header flex items-center gap-1 sm:gap-2 flex-wrap'>
                      <time className='text-xs opacity-50'>
                        {DateFormated(v.createdAt)}
                      </time>
                      {isOwnMessage && !v.isDeleted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this message?')) {
                              deleteMessages([v._id]);
                            }
                          }}
                          className='btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity p-0 size-5 min-h-0'
                          title='Delete message'
                        >
                          <Trash2 className='size-3' />
                        </button>
                      )}
                    </div>

                    <div
                      className={`chat-bubble flex flex-col ${isSelectionMode && selectedMessageIds.includes(v._id)
                        ? 'ring-2 ring-primary ring-offset-2'
                        : ''
                        }`}
                    >
                      <div className='cursor-pointer'>
                        {v.isDeleted ? (
                          <p className='italic text-base-content/50'>
                            This message was deleted by{' '}
                            {v.deletedBy?.fullName || 'user'}
                          </p>
                        ) : (
                          <>
                            {v.image && (
                              <img
                                src={v.image}
                                className='max-w-[150px] sm:max-w-[200px] rounded mb-2'
                                alt="Message content"
                              />
                            )}
                            {v.text && <p>{v.text}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef}></div>
        </div>
      </div>

      <div className='flex-shrink-0'>
        <MessageInput />
      </div>
    </div>
  );
}

export default Chat;