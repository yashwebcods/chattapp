import React, { useEffect, useRef } from 'react';
import { useMessageStore } from '../store/useMessageStore';
import { ChatHeader } from './ChatHeader';
import { MessageInput } from './MessageInput';
import ChatSkeleton from './Skeletons/ChatSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { DateFormated } from '../lib/utills';
import { Trash2, Pencil, Clock, X, Copy, Share2, Download, Paperclip, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import ForwardModal from './ForwardModal';

import GroupModals from './GroupModals';

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
    unsubscribeFromGroupMessages,
    editMessage,
    setEditingMessage,
    setForwardingMessage,
    hasMoreMessages,
    isLoadingMore,
    loadMoreMessages,
  } = useMessageStore();

  const { authUser } = useAuthStore();
  const [showHistoryMsg, setShowHistoryMsg] = React.useState(null);

  const messageEndRef = useRef(null);
  const topSentinelRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

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
    if (messageEndRef.current && message && !isSelectionMode && isInitialLoad) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message, isSelectionMode, isInitialLoad]);

  // Handle intersection observer for infinite scrolling
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreMessages && !isLoadingMore && !isMessageLoding && !isInitialLoad) {
          const container = scrollContainerRef.current;
          const previousHeight = container.scrollHeight;
          const previousScrollTop = container.scrollTop;

          loadMoreMessages().then((success) => {
            if (success && container) {
              // Maintain scroll position after content is prepended
              // We use requestAnimationFrame to ensure the DOM has updated
              requestAnimationFrame(() => {
                const newHeight = container.scrollHeight;
                container.scrollTop = (newHeight - previousHeight) + previousScrollTop;
              });
            }
          });
        }
      },
      { threshold: 0.1, root: scrollContainerRef.current }
    );

    if (topSentinelRef.current) {
      observer.observe(topSentinelRef.current);
    }

    return () => {
      if (topSentinelRef.current) {
        observer.unobserve(topSentinelRef.current);
      }
    };
  }, [hasMoreMessages, isLoadingMore, isMessageLoding, isInitialLoad, loadMoreMessages]);

  useEffect(() => {
    if (message.length > 0) {
      setIsInitialLoad(false);
    } else {
      setIsInitialLoad(true);
    }
  }, [selectedUser?._id, selectedGroup?._id]);

  const handleCopyMessage = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard');
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Delete ${selectedMessageIds.length} messages?`)) {
      await deleteMessages(selectedMessageIds);
    }
  };

  return (
    <div className='flex flex-col h-full bg-base-100 overflow-hidden relative'>
      <div className='flex-shrink-0'>
        <ChatHeader />
      </div>

      <div className='flex-1 overflow-hidden flex flex-col relative'>
        {isMessageLoding && !message.length ? (
          <ChatSkeleton />
        ) : (
          <>
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

            <div className='flex-1 overflow-y-auto' ref={scrollContainerRef}>
              <div className='p-2 sm:p-4 space-y-3 sm:space-y-4'>
                {/* Sentinel for infinite scrolling */}
                {hasMoreMessages && (
                  <div ref={topSentinelRef} className="h-8 flex items-center justify-center">
                    {isLoadingMore && <Loader className="size-5 animate-spin text-primary opacity-70" />}
                  </div>
                )}

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
                                loading="lazy"
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

                          <div className='chat-header flex items-center gap-1 sm:gap-2 flex-wrap min-h-[24px]'>
                            {isOwnMessage && !v.isDeleted && (
                              <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyMessage(v.text);
                                  }}
                                  className='btn btn-ghost btn-xs text-success p-0 size-5 min-h-0'
                                  title='Copy message'
                                >
                                  <Copy className='size-3' />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setForwardingMessage(v);
                                  }}
                                  className='btn btn-ghost btn-xs text-primary p-0 size-5 min-h-0'
                                  title='Forward message'
                                >
                                  <Share2 className='size-3' />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMessage(v);
                                  }}
                                  className='btn btn-ghost btn-xs text-info p-0 size-5 min-h-0'
                                  title='Edit message'
                                >
                                  <Pencil className='size-3' />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Delete this message?')) {
                                      deleteMessages([v._id]);
                                    }
                                  }}
                                  className='btn btn-ghost btn-xs text-error p-0 size-5 min-h-0'
                                  title='Delete message'
                                >
                                  <Trash2 className='size-3' />
                                </button>
                              </div>
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
                                      loading="lazy"
                                      className='max-w-[150px] sm:max-w-[200px] rounded mb-2'
                                      alt="Message content"
                                    />
                                  )}
                                  {v.fileUrl && (
                                    <div className="mb-2">
                                      <a
                                        href={v.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-lg bg-base-200 hover:bg-base-300 transition-colors border border-base-300 group/file w-fit max-w-full"
                                      >
                                        <Paperclip className="size-4 text-primary" />
                                        <span className="text-xs font-medium truncate max-w-[150px]">{v.fileName || 'Attachment'}</span>
                                        <Download className="size-3 opacity-0 group-hover/file:opacity-60 transition-opacity" />
                                      </a>
                                    </div>
                                  )}
                                  {v.text && <p className="mb-1">{v.text}</p>}
                                  <div className="flex items-center gap-1 self-end mt-auto">
                                    {v.isEdited && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowHistoryMsg(v);
                                        }}
                                        className='text-[10px] opacity-50 italic hover:text-primary transition-colors flex items-center gap-0.5 mr-1'
                                      >
                                        <Clock className='size-2.5' /> edited
                                      </button>
                                    )}
                                    <time className='text-[10px] opacity-50 flex items-center gap-1 leading-none'>
                                      {DateFormated(v.createdAt)}
                                      {isOwnMessage && !v.isDeleted && v.seenBy?.length > 0 && (
                                        <CheckCheck className="size-3 text-primary" />
                                      )}
                                    </time>
                                  </div>
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
          </>
        )}
      </div>

      <div className='flex-shrink-0'>
        <MessageInput />
        <GroupModals />
      </div>

      {/* Edit History Modal */}
      {showHistoryMsg && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md bg-base-100 p-0 overflow-hidden border border-base-300 shadow-2xl rounded-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <h3 className="font-bold text-lg">Edit History</h3>
              </div>
              <button
                onClick={() => setShowHistoryMsg(null)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="space-y-4">
                {/* Current Version */}
                <div className="relative pl-4 border-l-2 border-primary">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Current Version</span>
                    <span className="text-[10px] opacity-50">{DateFormated(showHistoryMsg.editedAt || showHistoryMsg.updatedAt)}</span>
                  </div>
                  <div className="p-3 bg-base-200 rounded-lg text-sm">
                    {showHistoryMsg.text}
                  </div>
                </div>

                {/* Previous Versions */}
                {[...(showHistoryMsg.editHistory || [])].reverse().map((history, idx) => (
                  <div key={idx} className="relative pl-4 border-l-2 border-base-300">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Version {showHistoryMsg.editHistory.length - idx}</span>
                      <span className="text-[10px] opacity-40">{DateFormated(history.editedAt)}</span>
                    </div>
                    <div className="p-3 bg-base-200/50 rounded-lg text-sm opacity-80">
                      {history.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-base-200/30 flex justify-end">
              <button
                onClick={() => setShowHistoryMsg(null)}
                className="btn btn-primary btn-sm px-6 rounded-full"
              >
                Done
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={() => setShowHistoryMsg(null)}></div>
        </div>
      )}
      {/* Forwarding Modal */}
      <ForwardModal />
    </div>
  );
}

export default Chat;