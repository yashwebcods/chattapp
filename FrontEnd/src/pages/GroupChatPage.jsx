import React, { useEffect, useRef } from 'react'
import { useMessageStore } from '../store/useMessageStore'
import { useAuthStore } from '../store/useAuthStore'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Send, Image as ImageIcon, X, UserPlus, UserMinus, Paperclip, File, Trash2 } from 'lucide-react'
import { DateFormated } from '../lib/utills'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { axiosInstance } from '../lib/axios'

function GroupChatPage() {
    const { groupId } = useParams()
    const navigate = useNavigate()
    const { groups, getGroups, selectedGroup, setSelectedGroup } = useMessageStore()
    const { authUser } = useAuthStore()
    const [groupMessages, setGroupMessages] = useState([])
    const [text, setText] = useState('')
    const [imagePreview, setImagePreview] = useState(null)
    const [filePreview, setFilePreview] = useState(null)
    const [fileName, setFileName] = useState('')
    const [allUsers, setAllUsers] = useState([])
    const [selectedUserId, setSelectedUserId] = useState('')
    const [filterPending, setFilterPending] = useState(false)
    const messaeEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const documentFileInputRef = useRef(null)

    useEffect(() => {
        getGroups()
    }, [])

    useEffect(() => {
        if (groups.length > 0 && groupId) {
            const group = groups.find(g => g._id === groupId)
            if (group) {
                setSelectedGroup(group)
                // Fetch group messages here
                fetchGroupMessages(groupId)
            }
        }
    }, [groups, groupId])

    useEffect(() => {
        if (messaeEndRef.current && groupMessages) {
            messaeEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [groupMessages])

    useEffect(() => {
        const socket = useAuthStore.getState().socket
        if (!socket) return

        socket.on('newGroupMessage', (newMessage) => {
            console.log('📨 Received group message:', newMessage)
            console.log('📎 Has fileUrl?', !!newMessage.fileUrl)
            console.log('📄 fileName:', newMessage.fileName)
            if (newMessage.groupId === groupId && !groupMessages.some(msg => msg._id === newMessage._id)) {
                setGroupMessages((prevMessages) => [...prevMessages, newMessage])
            }
        })

        return () => {
            socket.off('newGroupMessage')
        }
    }, [groupId])

    const fetchGroupMessages = async (gId) => {
        try {
            const response = await fetch(`/api/group/${gId}`, {
                credentials: 'include'
            })
            const data = await response.json()
            setGroupMessages(data)
        } catch (error) {
            console.error('Error fetching group messages:', error)
        }
    }

    const fetchAllUsers = async () => {
        try {
            const response = await axiosInstance.get('/users/all')
            setAllUsers(response.data)
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error('Failed to fetch users')
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB in bytes
        if (file.size > maxSize) {
            toast.error('File size must be less than 10MB')
            if (documentFileInputRef.current) documentFileInputRef.current.value = ''
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setFilePreview(reader.result)
            setFileName(file.name)
        }
        reader.onerror = () => {
            toast.error('Failed to read file')
        }
        reader.readAsDataURL(file)
    }

    const removeImage = () => {
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeFile = () => {
        setFilePreview(null)
        setFileName('')
        if (documentFileInputRef.current) documentFileInputRef.current.value = ''
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!text.trim() && !imagePreview && !filePreview) return

        try {
            const messageData = {
                text,
                groupId: groupId
            }

            if (imagePreview) {
                messageData.image = imagePreview
            }

            if (filePreview) {
                messageData.file = filePreview
                messageData.fileName = fileName
            }

            const response = await axiosInstance.post(`/message/send/undefined`, messageData);

            if (response.data) {
                const newMessage = response.data

                console.log('✅ Message sent successfully:', newMessage)
                console.log('📎 Has fileUrl in response?', !!newMessage.fileUrl)
                console.log('📄 fileName in response:', newMessage.fileName)
                setGroupMessages([...groupMessages, newMessage])
                setText('')
                setImagePreview(null)
                setFilePreview(null)
                setFileName('')
                if (fileInputRef.current) fileInputRef.current.value = ''
                if (documentFileInputRef.current) documentFileInputRef.current.value = ''
            } else {
                const errorData = await response.json()
                toast.error(errorData.error || 'Failed to send message')
            }
        } catch (error) {
            toast.error('Failed to send message')
            console.error('Error sending message:', error)
        }
    }

    // Handle file/image download and auto-open
    const handleDownloadFile = async (url, fileName) => {
        try {
            toast.loading('Downloading file...')

            // Fetch the file from URL
            const response = await fetch(url)
            if (!response.ok) throw new Error('Download failed')

            // Get the blob
            const blob = await response.blob()

            // Create object URL
            const blobUrl = window.URL.createObjectURL(blob)

            // Create temporary link element
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = fileName || 'download'

            // Append to body, click, and remove
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // Clean up the blob URL
            window.URL.revokeObjectURL(blobUrl)

            // Open in new tab for preview
            window.open(url, '_blank')

            toast.dismiss()
            toast.success('File downloaded and opened!')
        } catch (error) {
            toast.dismiss()
            toast.error('Failed to download file')
            console.error('Download error:', error)
        }
    }

    const handleDeleteMessage = async (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            await axiosInstance.post('/message/delete', { messageIds: [messageId] });
            toast.success('Message deleted');

            // Update UI locally
            setGroupMessages(groupMessages.map(m =>
                m._id === messageId
                    ? { ...m, isDeleted: true, text: 'This message was deleted', image: null, fileUrl: null }
                    : m
            ));
        } catch (error) {
            toast.error('Failed to delete message');
            console.error('Error deleting message:', error);
        }
    }

    const handleAddMember = async () => {
        if (!selectedUserId) {
            toast.error('Please select a user');
            return;
        }

        try {
            const response = await axiosInstance.post(`/group/${groupId}/add-member`, {
                userId: selectedUserId
            });

            toast.success('Member added successfully');
            setSelectedUserId('');
            document.getElementById('add_member_modal').close();

            // Refresh groups to get updated member list
            await getGroups();
            const updatedGroup = groups.find(g => g._id === groupId);
            if (updatedGroup) {
                setSelectedGroup(updatedGroup);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    }

    const handleRemoveMember = async (userId) => {
        try {
            const response = await axiosInstance.post(`/group/${groupId}/remove-member`, {
                userId: userId
            });

            toast.success('Member removed successfully');

            // Refresh groups to get updated member list
            await getGroups();
            const updatedGroup = groups.find(g => g._id === groupId);
            if (updatedGroup) {
                setSelectedGroup(updatedGroup);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    }

    if (!selectedGroup) {
        return (
            <div className='min-h-screen bg-base-200 pt-20 flex items-center justify-center'>
                <div className='text-center'>
                    <Users className='size-16 mx-auto text-base-300 mb-4' />
                    <p className='text-lg'>Loading group...</p>
                </div>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-base-200 pt-16'>
            <div className='max-w-6xl mx-auto h-[calc(100vh-4rem)]'>
                <div className='bg-base-100 rounded-lg shadow-xl h-full flex flex-col'>
                    {/* Header */}
                    <div className='flex items-center gap-4 p-4 border-b border-base-300'>
                        <button
                            onClick={() => navigate('/groups')}
                            className='btn btn-ghost btn-sm btn-circle'
                        >
                            <ArrowLeft className='size-5' />
                        </button>
                        <div className='flex items-center gap-3 flex-1'>
                            <div className='avatar placeholder'>
                                <div className='bg-primary text-primary-content rounded-full w-12'>
                                    <Users className='size-6 align-middle mt-3 ms-3' />
                                </div>
                            </div>
                            <div>
                                <h2 className='font-bold text-lg'>{selectedGroup.name}</h2>
                                <p className='text-sm text-base-content/60'>
                                    {selectedGroup.members?.length || 0} members
                                </p>
                            </div>
                        </div>
                        {/* View Members Button */}
                        <button
                            className='btn btn-sm btn-ghost'
                            onClick={() => document.getElementById('members_modal').showModal()}
                        >
                            <Users className='size-5' />
                            <span className='hidden sm:inline'>View Members</span>
                        </button>
                        {/* Add Member Button - Only show for owner and manager */}
                        {(authUser.role === 'owner' || authUser.role === 'manager') && (
                            <button
                                className='btn btn-sm btn-primary'
                                onClick={() => {
                                    fetchAllUsers()
                                    document.getElementById('add_member_modal').showModal()
                                }}
                            >
                                <UserPlus className='size-5' />
                                <span className='hidden sm:inline'>Add Member</span>
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle */}
                    <div className='px-4 py-2 border-b border-base-300'>
                        <button
                            onClick={() => setFilterPending(!filterPending)}
                            className={`btn btn-sm ${filterPending ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {filterPending ? 'Show All Messages' : 'Show Files/Images Only'}
                        </button>
                    </div>

                    {/* Messages */}
                    <div className='flex-1 overflow-y-auto p-4 space-y-4'>
                        {filteredMessages.length === 0 ? (
                            <div className='text-center py-12'>
                                <p className='text-base-content/60'>
                                    {filterPending ? 'No files or images yet' : 'No messages yet. Start the conversation!'}
                                </p>
                            </div>
                        ) : (
                            filteredMessages.map((msg) => (
                                msg.isSystemMessage ? (
                                    // System Message (centered)
                                    <div key={msg._id} className='flex justify-center my-4' ref={messaeEndRef}>
                                        <div className='bg-base-300 px-4 py-2 rounded-full text-xs text-base-content/60'>
                                            {msg.text}
                                        </div>
                                    </div>
                                ) : (
                                    // Regular Message
                                    <div
                                        key={msg._id}
                                        className={`chat ${msg.senderId?._id === authUser._id ? "chat-end" : "chat-start"} group`}
                                        ref={messaeEndRef}
                                    >
                                        <div className='chat-image avatar'>
                                            <div className='size-10 rounded-full border'>
                                                <img
                                                    src={msg.senderId?.image || '/avatar.png'}
                                                    alt={msg.senderId?.fullName}
                                                />
                                            </div>
                                        </div>
                                        <div className='chat-header mb-1 flex items-center gap-2'>
                                            <span className='font-medium'>{msg.senderId?.fullName}</span>
                                            <time className='text-xs opacity-50'>
                                                {DateFormated(msg.createdAt)}
                                            </time>
                                            {/* Delete button for own messages */}
                                            {msg.senderId?._id === authUser._id && !msg.isDeleted && (
                                                <button
                                                    onClick={() => handleDeleteMessage(msg._id)}
                                                    className="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity p-0 size-5 min-h-0"
                                                    title="Delete message"
                                                >
                                                    <Trash2 className="size-3" />
                                                </button>
                                            )}
                                        </div>
                                        <div className={`chat-bubble flex flex-col ${msg.isDeleted ? 'italic opacity-70' : ''}`}>
                                            {msg.image && (
                                                <img src={msg.image} className='sm:max-w-[200px] rounded mb-2' alt="message" />
                                            )}
                                            {msg.fileUrl && (
                                                <a
                                                    href={msg.fileUrl}
                                                    download={msg.fileName || 'file'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className='flex items-center gap-2 p-3 bg-base-300 rounded-lg hover:bg-base-200 transition mb-2 cursor-pointer'
                                                >
                                                    <File className='size-6 text-primary' />
                                                    <div className='flex-1 min-w-0'>
                                                        <p className='font-medium truncate'>{msg.fileName || 'File'}</p>
                                                        <p className='text-xs opacity-70'>Click to download/view</p>
                                                    </div>
                                                </a>
                                            )}
                                            {msg.text && <p>{msg.text}</p>}
                                        </div>
                                    </div>
                                )
                            ))
                        )}
                    </div>

                    {/* Input */}
                    <div className='p-4 border-t border-base-300'>
                        {imagePreview && (
                            <div className='mb-3 relative inline-block'>
                                <img src={imagePreview} className='max-w-[200px] rounded-lg' alt="preview" />
                                <button
                                    onClick={removeImage}
                                    className='btn btn-circle btn-sm absolute -top-2 -right-2'
                                >
                                    <X className='size-4' />
                                </button>
                            </div>
                        )}
                        {filePreview && (
                            <div className='mb-3 flex items-center gap-2 p-3 bg-base-200 rounded-lg max-w-fit'>
                                <File className='size-6' />
                                <span className='text-sm'>{fileName}</span>
                                <button
                                    onClick={removeFile}
                                    className='btn btn-circle btn-xs'
                                >
                                    <X className='size-3' />
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className='flex gap-2'>
                            <input
                                type='text'
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder='Type a message...'
                                className='input input-bordered flex-1'
                            />
                            {/* Image Input */}
                            <input
                                type='file'
                                accept='image/*'
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                className='hidden'
                            />
                            {/* Document Input */}
                            <input
                                type='file'
                                ref={documentFileInputRef}
                                onChange={handleFileChange}
                                className='hidden'
                            />
                            {/* File Upload Button */}
                            <button
                                type='button'
                                onClick={() => documentFileInputRef.current?.click()}
                                className='btn btn-circle'
                                title='Attach file'
                            >
                                <Paperclip className='size-5' />
                            </button>
                            {/* Image Upload Button */}
                            <button
                                type='button'
                                onClick={() => fileInputRef.current?.click()}
                                className='btn btn-circle'
                                title='Attach image'
                            >
                                <ImageIcon className='size-5' />
                            </button>
                            <button type='submit' className='btn btn-primary'>
                                <Send className='size-5' />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* View Members Modal */}
            <dialog id="members_modal" className="modal">
                <div className="modal-box">
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    </form>
                    <h3 className="font-bold text-lg mb-4">Group Members</h3>
                    <div className="space-y-2">
                        {selectedGroup.members?.map((member) => (
                            <div key={member._id} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                                <div className="avatar">
                                    <div className="w-10 rounded-full">
                                        <img src={member.image || '/avatar.png'} alt={member.fullName} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">
                                        {member.fullName}
                                        {member._id === authUser._id && <span className="text-primary ml-1">(You)</span>}
                                        {(member.role === 'owner' || member.role === 'manager') && (
                                            <span className="badge badge-success badge-xs ml-2">Group Admin</span>
                                        )}
                                    </p>
                                    <p className="text-xs text-base-content/60">{member.email}</p>
                                </div>
                                <div className="badge badge-primary badge-sm">
                                    {member.role || 'user'}
                                </div>
                                {/* Remove button - only show for non-admin members (not owner/manager) */}
                                {(authUser.role === 'owner' || authUser.role === 'manager') &&
                                    member.role !== 'owner' &&
                                    member.role !== 'manager' &&
                                    member._id !== authUser._id && (
                                        <button
                                            className="btn btn-sm btn-error btn-circle"
                                            onClick={() => handleRemoveMember(member._id)}
                                            title="Remove member"
                                        >
                                            <UserMinus className="size-4" />
                                        </button>
                                    )}
                            </div>
                        ))}
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>

            {/* Add Member Modal */}
            <dialog id="add_member_modal" className="modal">
                <div className="modal-box">
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    </form>
                    <h3 className="font-bold text-lg mb-4">Add Member to Group</h3>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Select User</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <option value="">Choose a user...</option>
                            {allUsers
                                .filter(user => !selectedGroup.members?.some(m => m._id === user._id))
                                .map(user => (
                                    <option key={user._id} value={user._id}>
                                        {user.fullName} ({user.email}) - {user.role || 'user'}
                                    </option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="modal-action">
                        <button
                            className="btn btn-primary"
                            onClick={handleAddMember}
                            disabled={!selectedUserId}
                        >
                            Add Member
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    )
}

export default GroupChatPage