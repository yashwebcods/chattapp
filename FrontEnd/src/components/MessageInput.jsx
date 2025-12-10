import { Image, Send, X } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useMessageStore } from '../store/useMessageStore'
import toast from 'react-hot-toast'

export const MessageInput = () => {
  const [text, setText] = useState("")
  const [imagePreview, setImagePriview] = useState(null)
  const fileInput = useRef(null)
  const { sendMessages } = useMessageStore()

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!text.trim() && !imagePreview) return
    try {
      const res = await sendMessages({
        text: text.trim(),
        image: imagePreview,
      })

      if (res) {
        setText('')
        setImagePriview(null)
        if (fileInput.current) fileInput.current.value = ''
      }
    } catch (error) {
      console.error('field to send message', error)
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
      setImagePriview(reader.result)
    }
    reader.readAsDataURL(file)
  }
  const removeImage = () => {
    setImagePriview(null)
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
