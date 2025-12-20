import React, { useEffect, useState } from 'react'
import { useMessageStore } from '../store/useMessageStore'
import SidebarSkeleton from './Skeletons/SidebarSkeleton'
import { User, Users, Search, Trash2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useNavigate } from 'react-router-dom'

function Sidebar({ onSelectUser }) {
    const { getUsers, users, groups, selectedUser, isUsersLoading, setSelectedUser, setGroup, unreadCounts, deleteUser } = useMessageStore()
    const { onlineUsers, authUser } = useAuthStore()
    const navigate = useNavigate()

    const [isGroup, setIsGroup] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [showOnlineOnly, setShowOnlineOnly] = useState(false)

    // Filter users based on search term and online status
    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!showOnlineOnly || onlineUsers.includes(user._id))
    )

    useEffect(() => {
        getUsers()
    }, [getUsers])

    useEffect(() => {
        console.log('🎨 Sidebar - DEBUG: unreadCounts:', unreadCounts);
        if (users.length > 0) {
            console.log('🎨 Sidebar - DEBUG: Sample User ID:', users[0]._id, 'Type:', typeof users[0]._id);
            const sampleId = users[0]._id;
            console.log('🎨 Sidebar - DEBUG: Count for sample:', unreadCounts[sampleId]);
            console.log('🎨 Sidebar - DEBUG: All unreadCount keys:', Object.keys(unreadCounts));
        }
    }, [unreadCounts, users]);

    if (isUsersLoading) return <SidebarSkeleton />

    return (
        <aside className='h-full w-full max-[1023px]:w-full min-[985px]:w-72 border-r border-base-300 flex flex-col transition-all duration-200'>
            <div className='border-b border-base-300 w-full p-5 '>
                <div className='flex justify-between'>
                    <div className='flex items-center gap-2'>
                        <User className='size-6 ' />
                        <span className='font-medium block'>Contact</span>
                    </div>
                    {/* change popover-1 and --anchor-1 names. Use unique names for each dropdown */}
                    {/* For TSX uncomment the commented types below */}
                    <div className="dropdown dropdown-end">
                        <button tabIndex={0} role="button" className="btn relative">
                            <Users />
                            {/* Show warning badge if any group has unread messages */}
                            {Array.isArray(groups) && groups.reduce((acc, g) => acc + ((unreadCounts && g?._id) ? (unreadCounts[g._id] || 0) : 0), 0) > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            )}
                        </button>
                        <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                            <li>
                                <button
                                    onClick={() => {
                                        setIsGroup(!isGroup)
                                        setGroup(!isGroup)
                                    }}
                                    className="btn btn-ghost w-full justify-start"
                                >
                                    Add Group
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => {
                                        navigate('/groups')
                                    }}
                                    className="btn btn-ghost w-full justify-start justify-between"
                                >
                                    View Groups
                                    {Array.isArray(groups) && groups.reduce((acc, g) => acc + ((unreadCounts && g?._id) ? (unreadCounts[g._id] || 0) : 0), 0) > 0 && (
                                        <span className="badge badge-sm badge-error text-white">
                                            {groups.reduce((acc, g) => acc + ((unreadCounts && g?._id) ? (unreadCounts[g._id] || 0) : 0), 0)}
                                        </span>
                                    )}
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
                {/* Online Filter Toggle */}
                <div className="mt-3 flex items-center gap-2">
                    <label className="cursor-pointer label gap-2 p-0">
                        <input
                            type="checkbox"
                            checked={showOnlineOnly}
                            onChange={(e) => setShowOnlineOnly(e.target.checked)}
                            className="checkbox checkbox-xs checkbox-primary"
                        />
                        <span className="label-text text-sm">Show Online Only</span>
                    </label>
                    <span className="text-xs text-zinc-500 ml-auto">
                        ({onlineUsers.length - 1 > 0 ? onlineUsers.length - 1 : 0} online)
                    </span>
                </div>
            </div>

            {/* Search Bar */}
            <div className='px-3 pb-3 pt-3 sm:pt-0'>
                <div className='input input-bordered flex items-center gap-2 input-sm w-full'>
                    <Search className='size-4 text-base-content/40' />
                    <input
                        type='text'
                        placeholder='Search users...'
                        className='grow bg-transparent outline-none text-sm'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className='overflow-y-auto w-full py-2 sm:py-3 flex-1'>
                {filteredUsers.length === 0 && users.length > 0 ? (
                    <div className='text-center py-8 px-3'>
                        <Search className='size-8 mx-auto text-base-300 mb-2' />
                        <p className='text-sm text-base-content/60'>No users found</p>
                    </div>
                ) : (
                    filteredUsers.map((v) => (
                        <button
                            key={v._id}
                            onClick={() => {
                                setSelectedUser(v)
                                onSelectUser?.(v)
                            }}
                            className={`w-full p-3 flex items-center gap-3 
                            hover:bg-base-300 transition-colors group relative
                             ${selectedUser?._id === v._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                            `}
                        >
                            <div className='relative mx-auto lg:mx-0'>
                                <div>
                                    <img src={v.image || "/avatar.png"} alt={v.fullName} className='size-10 rounded-4xl' />
                                </div>
                                {onlineUsers.includes(v._id) && (
                                    <span
                                        className="absolute bottom-0 right-0 size-3 bg-green-500 
                                        rounded-full ring-2 ring-zinc-900"
                                    />
                                )}
                            </div>
                            <div className='block max-[1023px]:block min-[985px]:hidden text-left min-w-0 flex-1'>
                                <div className='font-medium truncate'>{v.fullName}</div>
                                <div className='text-sm text-zinc-400'>
                                    {onlineUsers.includes(v._id) ? "Online" : "Offline"}
                                </div>
                            </div>
                            <div className='hidden min-[985px]:block text-left min-w-0 flex-1'>
                                <div className='font-medium truncate'>{v.fullName}</div>
                                <div className='text-sm text-zinc-400'>
                                    {onlineUsers.includes(v._id) ? "Online" : "Offline"}
                                </div>
                            </div>

                            {/* Unread Count */}
                            {unreadCounts && v?._id && (unreadCounts[v._id] > 0 || unreadCounts[String(v._id)] > 0) && (
                                <div className='ml-auto bg-primary text-primary-content rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center text-xs font-bold shadow-md'>
                                    {unreadCounts[v._id] || unreadCounts[String(v._id)]}
                                </div>
                            )}

                            {/* Owner Delete Button */}
                            {authUser?.role === 'owner' && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to delete user ${v.fullName}?`)) {
                                            deleteUser(v._id);
                                        }
                                    }}
                                    className='p-2 bg-base-100 rounded-full shadow-sm hover:bg-error hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10 hidden sm:block ml-2'
                                    title="Delete User"
                                >
                                    <Trash2 className="size-4" />
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>
        </aside>
    )
}

export default Sidebar