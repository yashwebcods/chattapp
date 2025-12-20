import { Image, Send, X, Pencil } from 'lucide-react'
import React, { useRef, useState, useEffect } from 'react'
import { useMessageStore } from '../store/useMessageStore'
import { useAuthStore } from '../store/useAuthStore'
import toast from 'react-hot-toast'

export const MessageInput = () => {
  const [text, setText] = useState("")
  const [imagePreview, setImagePreview] = useState(null)
  const fileInput = useRef(null)
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)

  const {
    sendMessages,
    selectedUser,
    selectedGroup,
    sendTyping,
    sendStopTyping,
    sendGroupTyping,
    sendGroupStopTyping,
    editingMessage,
    setEditingMessage,
    editMessage
  } = useMessageStore()
  const { authUser } = useAuthStore()

  // Populate input when editing a message
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      // Focus the input
    }
  }, [editingMessage]);

  // Typing indicator logic
  useEffect(() => {
    if (text.trim() && !editingMessage) {
      // User is typing (only show when not editing)
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        if (selectedUser) {
          sendTyping(selectedUser._id);
        } else if (selectedGroup) {
          sendGroupTyping(selectedGroup._id, authUser.fullName);
        }
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        if (selectedUser) {
          sendStopTyping(selectedUser._id);
        } else if (selectedGroup) {
          sendGroupStopTyping(selectedGroup._id, authUser.fullName);
        }
      }, 2000);
    } else {
      // Text is empty or editing, stop typing immediately
      if (isTypingRef.current) {
        isTypingRef.current = false;
        if (selectedUser) {
          sendStopTyping(selectedUser._id);
        } else if (selectedGroup) {
          sendGroupStopTyping(selectedGroup._id, authUser.fullName);
        }
      }
    }

    // Cleanup on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, selectedUser, selectedGroup, sendTyping, sendStopTyping, sendGroupTyping, sendGroupStopTyping, authUser, editingMessage]);

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!text.trim() && !imagePreview) return

    // Stop typing indicator immediately
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (selectedUser) {
        sendStopTyping(selectedUser._id);
      } else if (selectedGroup) {
        sendGroupStopTyping(selectedGroup._id, authUser.fullName);
      }
    }

    const messageText = text.trim()
    const messageImage = imagePreview

    // If editing, call editMessage instead
    if (editingMessage) {
      try {
        await editMessage(editingMessage._id, messageText);
        setEditingMessage(null);
        setText('');
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
      return;
    }

    // Store current values and clear input immediately
    setText('')
    setImagePreview(null)
    if (fileInput.current) fileInput.current.value = ''

    try {
      console.log('Sending message:', messageText, messageImage ? 'with image' : 'text only')
      await sendMessages({
        text: messageText,
        image: messageImage,
      })
      console.log('Message sent successfully')
    } catch (error) {
      console.error('Failed to send message:', error)
      // Restore input values on error
      setText(messageText)
      setImagePreview(messageImage)
    }
  }

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('pleace select image')
      return;
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const cancelEdit = () => {
    setEditingMessage(null);
    setText('');
  }

  return (
    <div className='w-full p-3 sm:p-4'>
      {/* Selected image Preview  */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Editing Message Indicator */}
      {editingMessage && (
        <div className="mb-2 flex items-center justify-between bg-base-200 p-2 rounded-lg border-l-4 border-info">
          <div className="flex items-center gap-2 overflow-hidden">
            <Pencil className="size-3 text-info shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-info uppercase">Editing Message</span>
              <span className="text-xs opacity-70 truncate">{editingMessage.text}</span>
            </div>
          </div>
          <button onClick={cancelEdit} className="btn btn-ghost btn-xs btn-circle">
            <X className="size-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage}>
        <div className='flex-1 flex gap-1 sm:gap-2 items-center '>
          <input type="text"
            className='flex-1 input input-bordered rounded-xl input-sm sm:input-md'
            placeholder={editingMessage ? 'Edit your message...' : 'Type a message'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type='file'
            ref={fileInput}
            accept='image?*'
            className='hidden'
            onChange={handleImage} />

          {!editingMessage && (
            <button type='button'
              className={`flex btn btn-circle btn-sm sm:btn-md ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
              onClick={() => fileInput.current?.click()}
            >
              <Image className="size-5" />
            </button>
          )}

          <button type='submit'
            className={`btn btn-circle btn-sm sm:btn-md ${editingMessage ? 'btn-info' : ''}`}
            disabled={!text.trim() && !imagePreview}
          >
            <Send className="size-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
