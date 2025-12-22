import React, { useEffect, useRef } from 'react';
import GroupMessageBubble from './GroupMessageBubble';

const GroupMessageList = ({ messages, onEdit, onDelete, onShowHistory, messageEndRef, topSentinelRef, scrollContainerRef, hasMoreMessages, isLoadingMore }) => {
    const prevMessagesLengthRef = useRef(messages.length);

    const getDayKey = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toDateString();
    };

    const getDayLabel = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffDays = Math.round((startOfToday - startOfThatDay) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    };

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
                messages.map((msg, idx) => {
                    const currentDayKey = getDayKey(msg.createdAt);
                    const prevDayKey = idx > 0 ? getDayKey(messages[idx - 1]?.createdAt) : '';
                    const showDayDivider = !!currentDayKey && currentDayKey !== prevDayKey;

                    return (
                        <React.Fragment key={msg._id}>
                            {showDayDivider && (
                                <div className="flex justify-center py-2">
                                    <div className="px-3 py-1 rounded-full bg-base-200 text-[11px] font-semibold opacity-70">
                                        {getDayLabel(msg.createdAt)}
                                    </div>
                                </div>
                            )}
                            <GroupMessageBubble
                                msg={msg}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onShowHistory={onShowHistory}
                                messageEndRef={msg === messages[messages.length - 1] ? messageEndRef : null}
                            />
                        </React.Fragment>
                    );
                })
            )}
        </div>
    );
};

export default GroupMessageList;
