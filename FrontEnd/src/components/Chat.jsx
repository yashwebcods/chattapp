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

  // Cleanup socket subscriptions when component unmounts or user/group changes
  useEffect(() => {
    return () => {
      unsubcribeToMessage();
      unsubscribeFromGroupMessages();
    };
  }, [selectedUser?._id, selectedGroup?._id]);

  useEffect(() => {
    console.log('Message state updated:', {
      messageCount: message.length,
      messages: message.map(m => ({
        id: m._id,
        senderId: m.senderId,
        senderIdId: m.senderId?._id,
        text: m.text,
        isTemp: m.isTemp
      }))
    });
  }, [message]);

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
      <div className='flex-1 flex flex-col overflow-auto'>
        <ChatHeader />
        <ChatSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <>
      <div className='flex-1 flex flex-col overflow-auto relative md:px-4 lg:px-6 xl:px-8'>
        <ChatHeader className='z-2 bg-atech sticky top-0' />

        {isSelectionMode && selectedMessageIds.length > 0 && (
          <div className='absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50'>
            <button
              onClick={handleDeleteSelected}
              className='btn btn-error btn-xs sm:btn-sm md:btn-md lg:btn-lg shadow-lg gap-2'
            >
              <Trash2 className='size-3 sm:size-4' />
              Delete {selectedMessageIds.length}
            </button>
          </div>
        )}

        <div className='flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4'>
          {message.map((v) => {
            const isOwnMessage =
              v.senderId === authUser._id || v.senderId?._id === authUser._id;

            console.log('Rendering message:', {
              messageId: v._id,
              senderId: v.senderId,
              senderIdId: v.senderId?._id,
              authUserId: authUser._id,
              isOwnMessage,
              messageText: v.text,
              isTemp: v.isTemp
            });

            return (
              <div
                key={v._id}
                className={`flex items-center gap-2 ${
                  isOwnMessage ? 'flex-row-reverse' : 'flex-row'
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
                  className={`chat ${
                    isOwnMessage ? 'chat-end' : 'chat-start'
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
                      />
                    </div>
                  </div>

                  <div className='chat-header flex items-center gap-1 sm:gap-2 flex-wrap'>
                    <time className='text-xs opacity-50'>
                      {DateFormated(v.createdAt)}
                    </time>
                  </div>

                  <div
                    className={`chat-bubble flex flex-col ${
                      isSelectionMode && selectedMessageIds.includes(v._id)
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
          })}

          <div ref={messageEndRef}></div>
        </div>

        <MessageInput />
      </div>
    </>
  );
}

export default Chat;
