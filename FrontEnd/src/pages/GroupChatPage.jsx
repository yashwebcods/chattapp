import React, { useEffect, useRef } from 'react'
import { useMessageStore } from '../store/useMessageStore'
import { useAuthStore } from '../store/useAuthStore'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Send, Image as ImageIcon, X, UserPlus, UserMinus, Paperclip, File, Trash2, Search, Pencil, Clock } from 'lucide-react'
import { DateFormated } from '../lib/utills'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { axiosInstance } from '../lib/axios'

function GroupChatPage() {
    const { groupId } = useParams()
    const navigate = useNavigate()
    const { groups, getGroups, selectedGroup, setSelectedGroup, editMessage, deleteMessages, setEditingMessage } = useMessageStore()
    const { authUser } = useAuthStore()
    const [groupMessages, setGroupMessages] = useState([])
    const [text, setText] = useState('')
    const [imagePreview, setImagePreview] = useState(null)
    const [filePreview, setFilePreview] = useState(null)
    const [fileName, setFileName] = useState('')
    const [allUsers, setAllUsers] = useState([])
    const [selectedUserId, setSelectedUserId] = useState('')
    const [filterPending, setFilterPending] = useState(false)
    const [userSearchTerm, setUserSearchTerm] = useState('')
    const [showHistoryMsg, setShowHistoryMsg] = useState(null)
    const messageEndRef = useRef(null)
    const fileInputRef = useRef(null)
    const documentFileInputRef = useRef(null)

    // Add this filteredMessages logic
    const filteredMessages = filterPending
        ? groupMessages.filter(msg => msg.image || msg.fileUrl)
        : groupMessages

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
        if (messageEndRef.current && groupMessages) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [groupMessages])

    useEffect(() => {
        const socket = useAuthStore.getState().socket
        if (!socket) return

        socket.on('newGroupMessage', (newMessage) => {
            console.log('📨 Received group message:', newMessage)
            if (newMessage.groupId === groupId && !groupMessages.some(msg => msg._id === newMessage._id)) {
                setGroupMessages((prevMessages) => [...prevMessages, newMessage])
            }
        })

        socket.on('messageEdited', (updatedMessage) => {
            console.log('✏️ Received messageEdited event:', updatedMessage)
            setGroupMessages((prevMessages) =>
                prevMessages.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg)
            )
        })

        socket.on('messagesDeleted', ({ messageIds }) => {
            console.log('🗑️ Received messagesDeleted event:', messageIds)
            setGroupMessages((prevMessages) =>
                prevMessages.map(msg =>
                    messageIds.includes(msg._id)
                        ? { ...msg, isDeleted: true, text: 'This message was deleted', image: null, fileUrl: null }
                        : msg
                )
            )
        })

        return () => {
            socket.off('newGroupMessage')
            socket.off('messageEdited')
            socket.off('messagesDeleted')
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
            const response = await axiosInstance.get('/message/users')
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
            await deleteMessages([messageId]);
            // state update is handled by socket listener or optimistic update if we add it
        } catch (error) {
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
            <div className='w-full h-[calc(100vh-4rem)] max-w-full'>
                <div className='bg-base-100 rounded-none sm:rounded-lg shadow-xl h-full flex flex-col'>
                    {/* Header */}
                    <div className='flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border-b border-base-300'>
                        <button
                            onClick={() => navigate('/groups')}
                            className='btn btn-ghost btn-sm btn-circle'
                        >
                            <ArrowLeft className='size-4 sm:size-5' />
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
                    <div className='flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4'>
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
                                    <div key={msg._id} className='flex justify-center my-4' ref={messageEndRef}>
                                        <div className='bg-base-300 px-4 py-2 rounded-full text-xs text-base-content/60'>
                                            {msg.text}
                                        </div>
                                    </div>
                                ) : (
                                    // Regular Message
                                    <div
                                        key={msg._id}
                                        className={`chat ${msg.senderId?._id === authUser._id ? "chat-end" : "chat-start"} group`}
                                        ref={messageEndRef}
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
                                            {/* Edit/Delete buttons for own messages */}
                                            {msg.senderId?._id === authUser._id && !msg.isDeleted && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingMessage(msg)}
                                                        className="btn btn-ghost btn-xs text-info p-0 size-5 min-h-0"
                                                        title="Edit message"
                                                    >
                                                        <Pencil className="size-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg._id)}
                                                        className="btn btn-ghost btn-xs text-error p-0 size-5 min-h-0"
                                                        title="Delete message"
                                                    >
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className={`chat-bubble flex flex-col ${msg.isDeleted ? 'italic opacity-70' : ''}`}>
                                            {msg.image && (
                                                <img src={msg.image} className='max-w-[100px] xs:max-w-[120px] sm:max-w-[150px] md:max-w-[200px] rounded mb-2' alt="message" />
                                            )}
                                            {msg.fileUrl && (
                                                <a
                                                    href={msg.fileUrl}
                                                    download={msg.fileName || 'file'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className='flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-base-300 rounded-lg hover:bg-base-200 transition mb-2 cursor-pointer'
                                                >
                                                    <File className='size-4 sm:size-5 md:size-6 text-primary' />
                                                    <div className='flex-1 min-w-0'>
                                                        <p className='font-medium truncate'>{msg.fileName || 'File'}</p>
                                                        <p className='text-xs opacity-70'>Click to download/view</p>
                                                    </div>
                                                </a>
                                            )}
                                            {msg.text && <p>{msg.text}</p>}
                                            {msg.isEdited && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowHistoryMsg(msg);
                                                    }}
                                                    className='text-[10px] opacity-50 self-end mt-1 italic hover:text-primary transition-colors flex items-center gap-0.5'
                                                >
                                                    <Clock className='size-2.5' />
                                                    edited
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            ))
                        )}
                    </div>

                    {/* Input */}
                    <div className='p-3 sm:p-4 border-t border-base-300'>
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

                    {/* Search Bar */}
                    <div className="form-control mb-4">
                        <div className="input input-bordered flex items-center gap-2">
                            <Search className="size-4 text-base-content/40" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                className="grow bg-transparent outline-none text-sm"
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                        {allUsers
                            .filter(user => !selectedGroup.members?.some(m => m._id === user._id))
                            .filter(user => {
                                const searchLower = userSearchTerm.toLowerCase()
                                return user.fullName.toLowerCase().includes(searchLower) ||
                                    user.email.toLowerCase().includes(searchLower)
                            })
                            .map(user => (
                                <div
                                    key={user._id}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedUserId === user._id
                                        ? 'bg-primary text-primary-content border-primary'
                                        : 'bg-base-200 hover:bg-base-300 border-base-300'
                                        }`}
                                    onClick={() => setSelectedUserId(user._id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="avatar">
                                            <div className="w-8 rounded-full">
                                                <img src={user.image || '/avatar.png'} alt={user.fullName} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{user.fullName}</p>
                                            <p className="text-xs opacity-70 truncate">{user.email}</p>
                                        </div>
                                        <div className="badge badge-sm">
                                            {user.role || 'user'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        {allUsers.filter(user => !selectedGroup.members?.some(m => m._id === user._id))
                            .filter(user => {
                                const searchLower = userSearchTerm.toLowerCase()
                                return user.fullName.toLowerCase().includes(searchLower) ||
                                    user.email.toLowerCase().includes(searchLower)
                            }).length === 0 && (
                                <div className="text-center py-8 text-base-content/60">
                                    <Search className="size-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No users found</p>
                                </div>
                            )}
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
            {/* Edit History Modal */}
            {showHistoryMsg && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md bg-base-100 p-0 overflow-hidden border border-base-300 shadow-2xl rounded-2xl">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
                            <div className="flex items-center gap-2">
                                <Clock className="size-5 text-primary" />
                                <h3 className="font-bold text-lg">Edit History</h3>
                            </div>
                            <button
                                onClick={() => setShowHistoryMsg(null)}
                                className="btn btn-ghost btn-sm btn-circle"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                            <div className="space-y-4">
                                {/* Current Version */}
                                <div className="relative pl-4 border-l-2 border-primary">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Current Version</span>
                                        <span className="text-[10px] opacity-50">{DateFormated(showHistoryMsg.editedAt || showHistoryMsg.updatedAt)}</span>
                                    </div>
                                    <div className="p-3 bg-base-200 rounded-lg text-sm">
                                        {showHistoryMsg.text}
                                    </div>
                                </div>

                                {/* Previous Versions */}
                                {[...(showHistoryMsg.editHistory || [])].reverse().map((history, idx) => (
                                    <div key={idx} className="relative pl-4 border-l-2 border-base-300">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Version {showHistoryMsg.editHistory.length - idx}</span>
                                            <span className="text-[10px] opacity-40">{DateFormated(history.editedAt)}</span>
                                        </div>
                                        <div className="p-3 bg-base-200/50 rounded-lg text-sm opacity-80">
                                            {history.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-base-200/30 flex justify-end">
                            <button
                                onClick={() => setShowHistoryMsg(null)}
                                className="btn btn-primary btn-sm px-6 rounded-full"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                    <div className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={() => setShowHistoryMsg(null)}></div>
                </div>
            )}
        </div>
    )
}

export default GroupChatPage