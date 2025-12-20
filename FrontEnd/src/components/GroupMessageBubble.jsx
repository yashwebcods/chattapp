import React from 'react';
import { DateFormated, getDownloadUrl } from '../lib/utills';
import { Pencil, Trash2, Clock, Copy, Share2, File, CheckCheck, Download } from 'lucide-react';
import { useMessageStore } from '../store/useMessageStore';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const GroupMessageBubble = ({ msg, onEdit, onDelete, onShowHistory, messageEndRef }) => {
    const { authUser } = useAuthStore();
    const { setForwardingMessage, selectedGroup } = useMessageStore();

    const isOwnMessage = msg.senderId?._id === authUser._id;
    const members = selectedGroup?.members || [];

    const handleCopy = () => {
        if (!msg.text) return;
        navigator.clipboard.writeText(msg.text);
        toast.success('Copied to clipboard');
    };

    const renderTextWithMentions = (text) => {
        if (!text) return null;

        // Match @Name where Name is a member's full name
        // We escape special regex characters in member names
        const escapedMemberNames = members
            .map(m => m.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .filter(name => name.length > 0);

        if (escapedMemberNames.length === 0) return text;

        const regex = new RegExp(`@(${escapedMemberNames.join('|')})`, 'g');
        const parts = text.split(regex);

        return parts.map((part, i) => {
            if (members.some(m => m.fullName === part)) {
                return (
                    <span key={i} className="text-primary font-bold bg-primary/10 px-1 rounded">
                        @{part}
                    </span>
                );
            }
            return part;
        });
    };

    if (msg.isSystemMessage) {
        return (
            <div className='flex justify-center my-4' ref={messageEndRef}>
                <div className='bg-base-300 px-4 py-2 rounded-full text-xs text-base-content/60'>
                    {msg.text}
                </div>
            </div>
        );
    }

    return (
        <div className={`chat ${isOwnMessage ? "chat-end" : "chat-start"} group/msg`} ref={messageEndRef}>
            <div className='chat-image avatar'>
                <div className='size-10 rounded-full border'>
                    <img loading="lazy" src={msg.senderId?.image || '/avatar.png'} alt={msg.senderId?.fullName} />
                </div>
            </div>
            <div className='chat-header mb-1 flex items-center gap-2'>
                <span className='font-medium'>{msg.senderId?.fullName}</span>

                {/* Actions: Copy, Forward, Download, Edit, Delete */}
                <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                    <button onClick={handleCopy} className="btn btn-ghost btn-xs text-success p-0 size-5 min-h-0" title="Copy">
                        <Copy className="size-3" />
                    </button>
                    <button onClick={() => setForwardingMessage(msg)} className="btn btn-ghost btn-xs text-primary p-0 size-5 min-h-0" title="Forward">
                        <Share2 className="size-3" />
                    </button>
                    {(msg.image || msg.fileUrl) && (
                        <a
                            href={getDownloadUrl(msg.image || msg.fileUrl)}
                            download={msg.fileName || (msg.image ? 'image.png' : 'file')}
                            onClick={(e) => e.stopPropagation()}
                            className="btn btn-ghost btn-xs text-secondary p-0 size-5 min-h-0"
                            title="Download"
                        >
                            <Download className="size-3" />
                        </a>
                    )}
                    {isOwnMessage && !msg.isDeleted && (
                        <>
                            <button onClick={() => onEdit(msg)} className="btn btn-ghost btn-xs text-info p-0 size-5 min-h-0" title="Edit">
                                <Pencil className="size-3" />
                            </button>
                            <button onClick={() => onDelete(msg._id)} className="btn btn-ghost btn-xs text-error p-0 size-5 min-h-0" title="Delete">
                                <Trash2 className="size-3" />
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className={`chat-bubble flex flex-col ${msg.isDeleted ? 'italic opacity-70' : ''}`}>
                {msg.image && (
                    <a href={getDownloadUrl(msg.image)} download={`${msg.fileName || 'image'}.png`} className="block">
                        <img src={msg.image} loading="lazy" className='max-w-[200px] rounded mb-2 cursor-pointer hover:opacity-80 transition-opacity' alt="message" />
                    </a>
                )}
                {msg.fileUrl && (
                    <a href={getDownloadUrl(msg.fileUrl)} download={msg.fileName || 'file'} target="_blank" rel="noopener noreferrer"
                        className='flex items-center gap-2 p-3 bg-base-300 rounded-lg hover:bg-base-200 transition mb-2'>
                        <File className='size-5 text-primary' />
                        <div className='flex-1 min-w-0'>
                            <p className='font-medium truncate'>{msg.fileName || 'File'}</p>
                            <p className='text-xs opacity-70'>Click to download</p>
                        </div>
                    </a>
                )}
                <div className="whitespace-pre-wrap">
                    {renderTextWithMentions(msg.text)}
                </div>
                <div className="flex justify-between items-end mt-1 gap-2">
                    <div className="flex flex-col">
                        {msg.isEdited && (
                            <button onClick={(e) => { e.stopPropagation(); onShowHistory(msg); }}
                                className='text-[10px] opacity-50 italic hover:text-primary flex items-center gap-0.5'>
                                <Clock className='size-2.5' /> edited
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                        <time className='text-[10px] opacity-50 leading-none'>{DateFormated(msg.createdAt)}</time>
                        {isOwnMessage && !msg.isDeleted && msg.seenBy?.length > 0 && (
                            <div className="flex items-center gap-1 opacity-60" title={`Seen by: ${msg.seenBy.map(u => u.fullName).join(', ')}`}>
                                <span className="text-[9px] truncate max-w-[80px]">
                                    {msg.seenBy.length === 1
                                        ? `Seen by ${msg.seenBy[0].fullName}`
                                        : `Seen by ${msg.seenBy[0].fullName} and ${msg.seenBy.length - 1} more`}
                                </span>
                                <CheckCheck className="size-2.5 text-primary" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupMessageBubble;
