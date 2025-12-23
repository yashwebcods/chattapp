import React, { useState, useEffect, useRef } from 'react';
import { useMessageStore } from '../store/useMessageStore';
import { Send, Image as ImageIcon, Paperclip, X, File, AtSign } from 'lucide-react';
import toast from 'react-hot-toast';

const GroupMessageInput = ({ groupId }) => {
    const { selectedGroup, sendMessages, isSending, editingMessage, setEditingMessage, editMessage } = useMessageStore();
    const [text, setText] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileName, setFileName] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);

    const fileInputRef = useRef(null);
    const documentFileInputRef = useRef(null);
    const inputRef = useRef(null);

    const members = selectedGroup?.members || [];

    // Set text when editing message
    useEffect(() => {
        if (editingMessage) {
            setText(editingMessage.text);
        }
    }, [editingMessage]);

    const handleTextChange = (e) => {
        const value = e.target.value;
        const pos = e.target.selectionStart;
        setText(value);
        setCursorPosition(pos);

        // Detect @ for mentions
        const lastChar = value[pos - 1];
        const textBeforeCursor = value.slice(0, pos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')) {
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    };

    const handleSelectMention = (member) => {
        const textBeforeAt = text.slice(0, text.lastIndexOf('@', cursorPosition - 1));
        const textAfterAt = text.slice(cursorPosition);
        const newText = `${textBeforeAt}@${member.fullName} ${textAfterAt}`;
        setText(newText);
        setShowMentions(false);
        inputRef.current?.focus();
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            toast.error('File size must be less than 20MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFilePreview(reader.result);
            setFileName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim() && !imagePreview && !filePreview) return;

        // Store current values to restore if needed
        const currentText = text;
        const currentImagePreview = imagePreview;
        const currentFilePreview = filePreview;
        const currentFileName = fileName;

        try {
            if (editingMessage) {
                // Handle editing
                const messageText = text.trim();
                await editMessage(editingMessage._id, messageText);
                setEditingMessage(null);
                
                // Clear input after editing
                setText('');
                setImagePreview(null);
                setFilePreview(null);
                setFileName('');
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (documentFileInputRef.current) documentFileInputRef.current.value = '';
            } else {
                // Handle sending new message
                const result = await sendMessages({
                    text: text.trim(),
                    image: imagePreview,
                    file: filePreview,
                    fileName
                });

                // Only clear previews if message was sent successfully (result is not null)
                if (result !== null) {
                    setText('');
                    setImagePreview(null);
                    setFilePreview(null);
                    setFileName('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    if (documentFileInputRef.current) documentFileInputRef.current.value = '';
                }
            }
        } catch (error) {
            console.error('Failed to send/edit message:', error);
            toast.error('Failed to send message');
            // Values are preserved since we didn't clear them
        }
    };

    return (
        <div className='p-3 sm:p-4 border-t border-base-300 relative'>
            {/* Mention Dropdown */}
            {showMentions && members.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 w-64">
                    <div className="p-2 border-b border-base-300 bg-base-200/50 flex items-center gap-2">
                        <AtSign className="size-3" />
                        <span className="text-xs font-bold uppercase">Mention Member</span>
                    </div>
                    {members.map(member => (
                        <button
                            key={member._id}
                            onClick={() => handleSelectMention(member)}
                            className="w-full flex items-center gap-2 p-2 hover:bg-base-200 text-left transition-colors"
                        >
                            <img src={member.image || '/avatar.png'} className="size-6 rounded-full" alt="" />
                            <span className="text-sm">{member.fullName}</span>
                        </button>
                    ))}
                </div>
            )}

            {imagePreview && (
                <div className='mb-3 relative inline-block'>
                    <img
                        src={imagePreview}
                        className='w-24 h-24 sm:w-32 sm:h-32 max-w-[160px] sm:max-w-[220px] object-cover rounded-lg border border-base-300'
                        alt="preview"
                    />
                    <button onClick={() => setImagePreview(null)} className='btn btn-circle btn-sm absolute -top-2 -right-2'><X className='size-4' /></button>
                </div>
            )}

            {filePreview && (
                <div className='mb-3 flex items-center gap-2 p-3 bg-base-200 rounded-lg max-w-fit'>
                    <File className='size-6' />
                    <span className='text-sm'>{fileName}</span>
                    <button onClick={() => setFilePreview(null)} className='btn btn-circle btn-xs'><X className='size-3' /></button>
                </div>
            )}

            {editingMessage && (
                <div className='mb-3 flex items-center gap-2 p-2 bg-info/10 rounded-lg'>
                    <span className='text-xs opacity-70'>Editing message:</span>
                    <span className='text-xs opacity-70 truncate'>{editingMessage.text}</span>
                    <button onClick={() => setEditingMessage(null)} className='btn btn-xs btn-ghost ml-auto'>
                        <X className='size-3' />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className='flex gap-2'>
                <input
                    ref={inputRef}
                    type='text'
                    value={text}
                    onChange={handleTextChange}
                    placeholder={editingMessage ? 'Edit your message...' : 'Type a message...'}
                    className='input input-bordered flex-1'
                />
                <input type='file' accept='image/*' ref={fileInputRef} onChange={handleImageChange} className='hidden' />
                <input type='file' ref={documentFileInputRef} onChange={handleFileChange} className='hidden' />

                <button type='button' onClick={() => documentFileInputRef.current?.click()} className='btn btn-circle btn-ghost' title='Attach file'>
                    <Paperclip className='size-5' />
                </button>
                <button type='button' onClick={() => fileInputRef.current?.click()} className='btn btn-circle btn-ghost' title='Attach image'>
                    <ImageIcon className='size-5' />
                </button>
                <button type='submit' className={`btn ${editingMessage ? 'btn-info' : 'btn-primary'}`} disabled={isSending || (!text.trim() && !imagePreview && !filePreview)}>
                    {isSending && (imagePreview || filePreview) ? <span className='loading loading-spinner loading-xs'></span> : <Send className='size-5' />}
                </button>
            </form>
        </div>
    );
};

export default GroupMessageInput;
