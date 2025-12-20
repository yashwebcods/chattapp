import React from 'react';
import GroupMessageBubble from './GroupMessageBubble';

const GroupMessageList = ({ messages, onEdit, onDelete, onShowHistory, messageEndRef }) => {
    if (messages.length === 0) {
        return (
            <div className='flex-1 flex items-center justify-center p-4'>
                <p className='text-base-content/60'>No messages yet. Start the conversation!</p>
            </div>
        );
    }

    return (
        <div className='flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4'>
            {messages.map((msg) => (
                <GroupMessageBubble
                    key={msg._id}
                    msg={msg}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onShowHistory={onShowHistory}
                    messageEndRef={messageEndRef}
                />
            ))}
        </div>
    );
};

export default GroupMessageList;
