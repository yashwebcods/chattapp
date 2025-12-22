import React, { useEffect, useRef, useState } from 'react';
import { useMessageStore } from '../store/useMessageStore';
import { useAuthStore } from '../store/useAuthStore';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, X, UserMinus, Search, Clock } from 'lucide-react';
import { DateFormated } from '../lib/utills';
import toast from 'react-hot-toast';
import { axiosInstance } from '../lib/axios';

// New Components
import GroupChatHeader from '../components/GroupChatHeader';
import GroupMessageList from '../components/GroupMessageList';
import GroupMessageInput from '../components/GroupMessageInput';
import GroupModals from '../components/GroupModals';
import ForwardModal from '../components/ForwardModal';

function GroupChatPage() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const {
        groups, getGroups, selectedGroup, setSelectedGroup,
        deleteMessages, setEditingMessage, message, markAsSeen,
        getGroupMessages, hasMoreMessages, isLoadingMore, loadMoreMessages, isMessageLoding
    } = useMessageStore();
    const { authUser, socket } = useAuthStore();
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [filterPending, setFilterPending] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [showHistoryMsg, setShowHistoryMsg] = useState(null);
    const messageEndRef = useRef(null);
    const topSentinelRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const filteredMessages = filterPending
        ? message.filter(msg => msg.image || msg.fileUrl)
        : message;

    useEffect(() => {
        getGroups();
    }, []);

    useEffect(() => {
        if (groups.length > 0 && groupId) {
            const group = groups.find(g => g._id === groupId);
            if (group) {
                setSelectedGroup(group);
                getGroupMessages(groupId);
                markAsSeen(groupId);
            }
        }
    }, [groups, groupId]);

    useEffect(() => {
        if (messageEndRef.current && typeof messageEndRef.current.scrollIntoView === 'function' && message && isInitialLoad) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [message, isInitialLoad]);

    // Handle intersection observer for infinite scrolling
    useEffect(() => {
        if (!scrollContainerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreMessages && !isLoadingMore && !isMessageLoding && !isInitialLoad) {
                    const container = scrollContainerRef.current;
                    const previousHeight = container.scrollHeight;
                    const previousScrollTop = container.scrollTop;

                    loadMoreMessages().then((success) => {
                        if (success && container) {
                            requestAnimationFrame(() => {
                                const newHeight = container.scrollHeight;
                                container.scrollTop = (newHeight - previousHeight) + previousScrollTop;
                            });
                        }
                    });
                }
            },
            { threshold: 0.1, root: scrollContainerRef.current }
        );

        if (topSentinelRef.current) {
            observer.observe(topSentinelRef.current);
        }

        return () => {
            if (topSentinelRef.current) {
                observer.unobserve(topSentinelRef.current);
            }
        };
    }, [hasMoreMessages, isLoadingMore, isMessageLoding, isInitialLoad, loadMoreMessages]);

    useEffect(() => {
        if (message.length > 0) {
            setIsInitialLoad(false);
        } else {
            setIsInitialLoad(true);
        }
    }, [groupId]);

    const fetchAllUsers = async () => {
        try {
            const response = await axiosInstance.get('/message/users');
            setAllUsers(response.data);
        } catch (error) {
            toast.error('Failed to fetch users');
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            await deleteMessages([messageId]);
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) {
            toast.error('Please select a user');
            return;
        }
        try {
            await axiosInstance.post(`/group/${groupId}/add-member`, { userId: selectedUserId });
            toast.success('Member added successfully');
            setSelectedUserId('');
            document.getElementById('add_member_modal').close();
            await getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId) => {
        try {
            await axiosInstance.post(`/group/${groupId}/remove-member`, { userId });
            toast.success('Member removed successfully');
            await getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    if (!selectedGroup) {
        return (
            <div className='min-h-screen bg-base-200 pt-20 flex items-center justify-center'>
                <div className='text-center'>
                    <Users className='size-16 mx-auto text-base-300 mb-4 animate-pulse' />
                    <p className='text-lg'>Loading group...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-base-200 pt-16'>
            <div className='w-full h-[calc(100vh-4rem)] max-w-full flex flex-col'>
                <div className='flex-1 bg-base-100 shadow-xl overflow-hidden flex flex-col relative'>
                    <GroupChatHeader
                        selectedGroup={selectedGroup}
                        onAddMember={() => { fetchAllUsers(); document.getElementById('add_member_modal').showModal(); }}
                    />

                    {/* Filter Toggle */}
                    <div className='px-4 py-2 border-b border-base-300 bg-base-100/50 backdrop-blur-sm flex justify-between items-center'>
                        <button
                            onClick={() => setFilterPending(!filterPending)}
                            className={`btn btn-xs sm:btn-sm ${filterPending ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {filterPending ? 'Show All Messages' : 'Show Media/Files'}
                        </button>
                    </div>

                    <GroupMessageList
                        messages={filteredMessages}
                        onEdit={setEditingMessage}
                        onDelete={handleDeleteMessage}
                        onShowHistory={setShowHistoryMsg}
                        messageEndRef={messageEndRef}
                        topSentinelRef={topSentinelRef}
                        scrollContainerRef={scrollContainerRef}
                        hasMoreMessages={hasMoreMessages}
                        isLoadingMore={isLoadingMore}
                    />

                    <GroupMessageInput
                        groupId={groupId}
                    />
                </div>
            </div>

            <GroupModals />
            <ForwardModal />

            {showHistoryMsg && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-md p-0 overflow-hidden border border-base-300 shadow-2xl rounded-2xl">
                        <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
                            <div className="flex items-center gap-2"><Clock className="size-5 text-primary" /><h3 className="font-bold text-lg">Edit History</h3></div>
                            <button onClick={() => setShowHistoryMsg(null)} className="btn btn-ghost btn-sm btn-circle"><X className="size-5" /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                            <div className="relative pl-4 border-l-2 border-primary">
                                <span className="text-[10px] font-bold text-primary uppercase block mb-1">Current Version</span>
                                <div className="p-3 bg-base-200 rounded-lg text-sm">{showHistoryMsg.text}</div>
                            </div>
                            {[...(showHistoryMsg.editHistory || [])].reverse().map((h, i) => (
                                <div key={i} className="relative pl-4 border-l-2 border-base-300">
                                    <span className="text-[10px] font-bold opacity-50 uppercase block mb-1">Version {showHistoryMsg.editHistory.length - i}</span>
                                    <div className="p-3 bg-base-200/50 rounded-lg text-sm opacity-80">{h.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={() => setShowHistoryMsg(null)}></div>
                </div>
            )}
        </div>
    );
}

export default GroupChatPage;
