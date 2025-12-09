import React, { useEffect, useState } from 'react'
import { useMessageStore } from '../store/useMessageStore'
import { Users, MessageSquare, Search, Bell, Clock, UserCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function GroupsListPage() {
    const { groups, getGroups, unreadCounts, sellerIndex } = useMessageStore()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [showUnreadOnly, setShowUnreadOnly] = useState(false)

    useEffect(() => {
        getGroups()
    }, [])

    const handleGroupClick = (group) => {
        navigate(`/group/${group._id}`)
    }

    // Filter groups based on search term and unread messages
    const filteredGroups = groups.filter(group => {
        const searchLower = searchTerm.toLowerCase()
        const groupName = `${Math.abs(group.sellerIndex + 1)} - ${group.sellerId?.companyName || ''}`.toLowerCase()
        const sellerName = group.sellerId?.name?.toLowerCase() || ''
        const matchesSearch = groupName.includes(searchLower) || sellerName.includes(searchLower)
        
        // If showUnreadOnly is true, only show groups with unread messages
        const hasUnread = unreadCounts[group._id] > 0
        const matchesUnread = showUnreadOnly ? hasUnread : true
        
        return matchesSearch && matchesUnread
    })

    return (
        <div className='min-h-screen bg-base-200 pt-20'>
            <div className='max-w-6xl mx-auto p-6'>
                <div className='bg-base-100 rounded-lg shadow-xl p-6'>
                    <div className='flex items-center gap-3 mb-6'>
                        <Users className='size-8 text-primary' />
                        <h1 className='text-3xl font-bold'>My Groups</h1>
                    </div>

                    {/* Search Bar */}
                    <div className='form-control mb-6'>
                        <div className='input input-bordered flex items-center gap-2'>
                            <Search className='size-5 text-base-content/40' />
                            <input
                                type='text'
                                placeholder='Search groups by name or seller...'
                                className='grow bg-transparent outline-none'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filter Toggle */}
                    <div className='flex justify-between items-center mb-6'>
                        <div className='text-sm text-base-content/60'>
                            {filteredGroups.length} of {groups.length} groups
                        </div>
                        <button
                            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                            className={`btn btn-sm ${showUnreadOnly ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {showUnreadOnly ? 'Show All Groups' : 'Show Unread Only'}
                            {showUnreadOnly && (
                                <span className='badge badge-sm badge-warning ml-2'>
                                    {groups.filter(g => unreadCounts[g._id] > 0).length}
                                </span>
                            )}
                        </button>
                    </div>

                    {filteredGroups.length === 0 && groups.length > 0 ? (
                        <div className='text-center py-12'>
                            <Search className='size-16 mx-auto text-base-300 mb-4' />
                            <p className='text-lg text-base-content/60'>No groups found</p>
                            <p className='text-sm text-base-content/40'>Try adjusting your search</p>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className='text-center py-12'>
                            <Users className='size-16 mx-auto text-base-300 mb-4' />
                            <p className='text-lg text-base-content/60'>No groups yet</p>
                            <p className='text-sm text-base-content/40'>Create a group from the seller list</p>
                        </div>
                    ) : (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                            {filteredGroups.map((group) => (
                                <div
                                    key={group._id}
                                    onClick={() => handleGroupClick(group)}
                                    className='card bg-base-200 hover:bg-base-300 cursor-pointer transition-all duration-200 hover:shadow-lg'
                                >
                                    <div className='card-body'>
                                        <div className='flex items-start justify-between'>
                                            <div className='flex-1'>
                                                <div className='flex items-center gap-2'>
                                                    <h2 className='card-title text-lg mb-2'>{`${Math.abs(group.sellerIndex + 1)} - ${group.sellerId.companyName}`}</h2>
                                                    {unreadCounts[group._id] > 0 && (
                                                        <div className='badge badge-primary badge-lg'>
                                                            {unreadCounts[group._id]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className='flex items-center gap-2 text-sm text-base-content/60'>
                                                    <Users className='size-4' />
                                                    <span>{group.members?.length || 0} members</span>
                                                </div>
                                                {group.sellerId && (
                                                    <div className='mt-2 text-xs text-base-content/50'>
                                                        <p>Seller: {group.sellerId.name}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <MessageSquare className='size-6 text-primary' />
                                        </div>
                                        <div className='card-actions justify-end mt-4'>
                                            <button className='btn btn-primary btn-sm'>
                                                Open Chat
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default GroupsListPage