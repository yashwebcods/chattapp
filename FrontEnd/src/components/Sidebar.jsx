import React, { useEffect, useState } from 'react'
import { useMessageStore } from '../store/useMessageStore'
import SidebarSkeleton from './Skeletons/SidebarSkeleton'
import { User, Users, Search } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useNavigate } from 'react-router-dom'

function Sidebar() {
    const { getUsers, users, selectedUser, isUsersLoading, setSelectedUser, setGroup, unreadCounts } = useMessageStore()
    const { onlineUsers } = useAuthStore()
    const navigate = useNavigate()

    const [isGroup, setIsGroup] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Filter users based on search term
    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        getUsers()
    }, [getUsers])

    if (isUsersLoading) return <SidebarSkeleton />
    
    return (
        <aside className='h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200'>
            <div className='border-b border-base-300 w-full p-5 '>
                <div className='flex justify-between'>
                    <div className='flex items-center gap-2'>
                        <User className='size-6 ' />
                        <span className='font-medium hidden lg:block'>Contact</span>
                    </div>
                    {/* change popover-1 and --anchor-1 names. Use unique names for each dropdown */}
                    {/* For TSX uncomment the commented types below */}
                    <button className="btn" popoverTarget="popover-1" style={{ anchorName: "--anchor-1" } /* as React.CSSProperties */}>
                        <Users />
                    </button>

                    <ul className="dropdown menu w-52 rounded-box bg-base-100 shadow-sm"
                        popover="auto" id="popover-1" style={{ positionAnchor: "--anchor-1" } /* as React.CSSProperties */}>
                        <li>
                            <a>
                                <div className="tooltip">
                                    <button
                                        onClick={() => {
                                            setIsGroup(!isGroup)
                                            setGroup(!isGroup)
                                            // Close the popover
                                            document.getElementById('popover-1')?.hidePopover()
                                        }}
                                        className="btn"
                                    >
                                        Add Group
                                    </button>
                                </div>
                            </a>
                        </li>
                        <li>
                            <a>
                                <div className="tooltip">
                                    <button
                                        onClick={() => {
                                            navigate('/groups')
                                            // Close the popover
                                            document.getElementById('popover-1')?.hidePopover()
                                        }}
                                        className="btn"
                                    >
                                        View Groups
                                    </button>
                                </div>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Search Bar */}
            <div className='px-3 pb-3'>
                <div className='input input-bordered flex items-center gap-2 input-sm'>
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

            <div className='overflow-y-auto w-full py-3 flex-1'>
                {filteredUsers.length === 0 && users.length > 0 ? (
                    <div className='text-center py-8 px-3'>
                        <Search className='size-8 mx-auto text-base-300 mb-2' />
                        <p className='text-sm text-base-content/60'>No users found</p>
                    </div>
                ) : (
                    filteredUsers.map((v) => (
                        <button 
                            key={v._id} 
                            onClick={() => setSelectedUser(v)} 
                            className={`w-full p-3 flex items-center gap-3 
                            hover:bg-base-300 transition-colors
                             ${selectedUser?._id === v._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                            `}
                        >
                            <div className='relative mx-auto lg:mx-0'>
                                <div>
                                    <img src={v.image || "../../public/avatar.png"} alt={v.fullName} className='size-10 rounded-4xl' />
                                </div>
                                {onlineUsers.includes(v._id) && (
                                    <span
                                        className="absolute bottom-0 right-0 size-3 bg-green-500 
                                        rounded-full ring-2 ring-zinc-900"
                                    />
                                )}
                            </div>
                            <div className='hidden lg:block text-left min-w-0 flex-1'>
                                <div className='font-medium truncate'>{v.fullName}</div>
                                <div className='text-sm text-zinc-400'>
                                    {onlineUsers.includes(v._id) ? "Online" : "Offline"}
                                </div>
                            </div>
                            {unreadCounts[v._id] > 0 && (
                                <div className='hidden lg:flex bg-primary text-primary-content rounded-full min-w-[24px] h-6 px-2 items-center justify-center text-xs font-bold'>
                                    {unreadCounts[v._id]}
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