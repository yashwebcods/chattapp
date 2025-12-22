import React, { useEffect, useRef } from 'react';
import GroupMessageBubble from './GroupMessageBubble';

const GroupMessageList = ({ messages, onEdit, onDelete, onShowHistory, messageEndRef, topSentinelRef, scrollContainerRef, hasMoreMessages, isLoadingMore }) => {
    const prevMessagesLengthRef = useRef(messages.length);

    useEffect(() => {
        // Auto-scroll to bottom when new messages are added (but not during initial load)
        if (messageEndRef.current && typeof messageEndRef.current.scrollIntoView === 'function' && messages.length > prevMessagesLengthRef.current) {
            setTimeout(() => {
                if (messageEndRef.current && typeof messageEndRef.current.scrollIntoView === 'function') {
                    messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages, messageEndRef]);

    return (
        <div className='flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4' ref={scrollContainerRef}>
            {/* Sentinel for infinite scroll */}
            {hasMoreMessages && (
                <div ref={topSentinelRef} className="h-8 flex items-center justify-center">
                    {isLoadingMore && <div className="loading loading-spinner text-primary loading-md"></div>}
                </div>
            )}

            {messages.length === 0 ? (
                <div className='flex items-center justify-center p-4'>
                    <p className='text-base-content/60'>No messages yet. Start the conversation!</p>
                </div>
            ) : (
                messages.map((msg) => (
                    <GroupMessageBubble
                        key={msg._id}
                        msg={msg}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onShowHistory={onShowHistory}
                        messageEndRef={msg === messages[messages.length - 1] ? messageEndRef : null}
                    />
                ))
            )}
        </div>
    );
};

export default GroupMessageList;
