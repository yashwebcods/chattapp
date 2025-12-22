import { Image, Send, X, Pencil, Paperclip, File } from 'lucide-react'
import React, { useRef, useState, useEffect } from 'react'
import { useMessageStore } from '../store/useMessageStore'
import { useAuthStore } from '../store/useAuthStore'
import toast from 'react-hot-toast'

export const MessageInput = () => {
  const [text, setText] = useState("")
  const [imagePreview, setImagePreview] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [fileName, setFileName] = useState('')
  const fileInput = useRef(null)
  const docInput = useRef(null)
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)

  const {
    sendMessages,
    selectedUser,
    selectedGroup,
    isSending,
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
    }
  }, [editingMessage]);

  // Typing indicator logic
  useEffect(() => {
    if (text.trim() && !editingMessage) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        if (selectedUser) {
          sendTyping(selectedUser._id);
        } else if (selectedGroup) {
          sendGroupTyping(selectedGroup._id, authUser.fullName);
        }
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        if (selectedUser) {
          sendStopTyping(selectedUser._id);
        } else if (selectedGroup) {
          sendGroupStopTyping(selectedGroup._id, authUser.fullName);
        }
      }, 2000);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        if (selectedUser) {
          sendStopTyping(selectedUser._id);
        } else if (selectedGroup) {
          sendGroupStopTyping(selectedGroup._id, authUser.fullName);
        }
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, selectedUser, selectedGroup, sendTyping, sendStopTyping, sendGroupTyping, sendGroupStopTyping, authUser, editingMessage]);

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!text.trim() && !imagePreview && !filePreview) return

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
    const messageFile = filePreview
    const messageFileName = fileName

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

    setText('')
    setImagePreview(null)
    setFilePreview(null)
    setFileName('')
    if (fileInput.current) fileInput.current.value = ''
    if (docInput.current) docInput.current.value = ''

    try {
      await sendMessages({
        text: messageText,
        image: messageImage,
        file: messageFile,
        fileName: messageFileName
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      setText(messageText)
      setImagePreview(messageImage)
      setFilePreview(messageFile)
      setFileName(messageFileName)
    }
  }

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image')
      return;
    }
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFilePreview(reader.result)
      setFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const removeFile = () => {
    setFilePreview(null)
    setFileName('')
    if (docInput.current) docInput.current.value = ''
  }

  const cancelEdit = () => {
    setEditingMessage(null);
    setText('');
  }

  return (
    <div className='w-full p-3 sm:p-4'>
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

      {filePreview && (
        <div className="mb-3 flex items-center gap-2 p-3 bg-base-200 rounded-lg max-w-fit border border-base-300">
          <File className="size-5 text-primary" />
          <span className="text-xs font-medium truncate max-w-[150px]">{fileName}</span>
          <button
            onClick={removeFile}
            className="btn btn-ghost btn-xs btn-circle"
            type="button"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

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

          <input type='file' ref={fileInput} accept='image/*' className='hidden' onChange={handleImage} />
          <input type='file' ref={docInput} className='hidden' onChange={handleFile} />

          {!editingMessage && (
            <>
              <button type='button'
                className={`btn btn-ghost btn-circle btn-sm sm:btn-md ${filePreview ? "text-primary" : "text-zinc-400"}`}
                onClick={() => docInput.current?.click()}
                title="Attach file"
              >
                <Paperclip className="size-5" />
              </button>
              <button type='button'
                className={`btn btn-ghost btn-circle btn-sm sm:btn-md ${imagePreview ? "text-primary" : "text-zinc-400"}`}
                onClick={() => fileInput.current?.click()}
                title="Attach image"
              >
                <Image className="size-5" />
              </button>
            </>
          )}

          <button type='submit'
            className={`btn btn-circle btn-sm sm:btn-md ${editingMessage ? 'btn-info' : 'btn-primary'}`}
            disabled={isSending || (!text.trim() && !imagePreview && !filePreview)}
          >
            {isSending && (imagePreview || filePreview) ? <span className='loading loading-spinner loading-xs'></span> : <Send className="size-5" />}
          </button>
        </div>
      </form>
    </div>
  )
}
