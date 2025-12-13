import { Image, Send, X } from 'lucide-react'
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

  const { sendMessages, selectedUser, selectedGroup, sendTyping, sendStopTyping, sendGroupTyping, sendGroupStopTyping } = useMessageStore()
  const { authUser } = useAuthStore()

  // Typing indicator logic
  useEffect(() => {
    if (text.trim()) {
      // User is typing
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
      // Text is empty, stop typing immediately
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
  }, [text, selectedUser, selectedGroup, sendTyping, sendStopTyping, sendGroupTyping, sendGroupStopTyping, authUser]);

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

    // Store current values and clear input immediately
    const messageText = text.trim()
    const messageImage = imagePreview

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

      <form onSubmit={handleSendMessage}>
        <div className='flex-1 flex gap-2 items-center '>
          <input type="text"
            className='flex-1 input input-bordered rounded-lg input-xs sm:input-sm md:input-md'
            placeholder='Type a message'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type='file'
            ref={fileInput}
            accept='image?*'
            className='hidden'
            onChange={handleImage} />

          <button type='button' className={`hidden sm:flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`} onClick={() => fileInput.current?.click()
          } >
            <Image size={20} />
          </button>
          <button type='submit'
            className='btn btn-circle btn-xs sm:btn-sm'
            disabled={!text.trim() && !imagePreview}
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  )
}
