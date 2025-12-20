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
import ForwardModal from '../components/ForwardModal';

function GroupChatPage() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const {
        groups, getGroups, selectedGroup, setSelectedGroup,
        deleteMessages, setEditingMessage, message, markAsSeen
    } = useMessageStore();
    const { authUser } = useAuthStore();
    const [groupMessages, setGroupMessages] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [filterPending, setFilterPending] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [showHistoryMsg, setShowHistoryMsg] = useState(null);
    const messageEndRef = useRef(null);

    const filteredMessages = filterPending
        ? groupMessages.filter(msg => msg.image || msg.fileUrl)
        : groupMessages;

    useEffect(() => {
        getGroups();
    }, []);

    useEffect(() => {
        if (groups.length > 0 && groupId) {
            const group = groups.find(g => g._id === groupId);
            if (group) {
                setSelectedGroup(group);
                fetchGroupMessages(groupId);
                markAsSeen(groupId);
            }
        }
    }, [groups, groupId]);

    useEffect(() => {
        if (messageEndRef.current && groupMessages) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [groupMessages]);

    useEffect(() => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.on('newGroupMessage', (newMessage) => {
            if (newMessage.groupId === groupId && !groupMessages.some(msg => msg._id === newMessage._id)) {
                setGroupMessages((prev) => [...prev, newMessage]);
            }
        });

        socket.on('messageEdited', (updatedMessage) => {
            setGroupMessages((prev) =>
                prev.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg)
            );
        });

        socket.on('messagesDeleted', ({ messageIds }) => {
            setGroupMessages((prev) =>
                prev.map(msg =>
                    messageIds.includes(msg._id)
                        ? { ...msg, isDeleted: true, text: 'This message was deleted', image: null, fileUrl: null }
                        : msg
                )
            );
        });

        return () => {
            socket.off('newGroupMessage');
            socket.off('messageEdited');
            socket.off('messagesDeleted');
        };
    }, [groupId]);

    const fetchGroupMessages = async (gId) => {
        try {
            const response = await fetch(`/api/group/${gId}`, { credentials: 'include' });
            const data = await response.json();
            setGroupMessages(data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const response = await axiosInstance.get('/message/users');
            setAllUsers(response.data);
        } catch (error) {
            toast.error('Failed to fetch users');
        }
    };

    const handleSendMessage = async (msgData) => {
        try {
            const response = await axiosInstance.post(`/message/send/undefined`, {
                ...msgData,
                groupId: groupId
            });

            if (response.data) {
                setGroupMessages([...groupMessages, response.data]);
            }
        } catch (error) {
            toast.error('Failed to send message');
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
        <div className='min-h-screen bg-base-200'>
            <div className='w-full h-screen max-w-full flex flex-col'>
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
                    />

                    <GroupMessageInput
                        groupId={groupId}
                        onMessageSent={handleSendMessage}
                    />
                </div>
            </div>

            <ForwardModal />

            {/* Modals remain in the page for simplicity or can be extracted if needed */}
            <dialog id="members_modal" className="modal">
                <div className="modal-box">
                    <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button></form>
                    <h3 className="font-bold text-lg mb-4">Group Members</h3>
                    <div className="space-y-2">
                        {selectedGroup.members?.map((member) => (
                            <div key={member._id} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                                <div className="avatar"><div className="w-10 rounded-full"><img src={member.image || '/avatar.png'} alt="" /></div></div>
                                <div className="flex-1">
                                    <p className="font-medium">{member.fullName} {member._id === authUser._id && <span className="text-primary ml-1">(You)</span>}</p>
                                    <p className="text-xs text-base-content/60">{member.email}</p>
                                </div>
                                {(authUser.role === 'owner' || authUser.role === 'manager') && member.role !== 'owner' && member.role !== 'manager' && member._id !== authUser._id && (
                                    <button className="btn btn-sm btn-error btn-circle" onClick={() => handleRemoveMember(member._id)}><UserMinus className="size-4" /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </dialog>

            <dialog id="add_member_modal" className="modal">
                <div className="modal-box">
                    <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button></form>
                    <h3 className="font-bold text-lg mb-4">Add Member</h3>
                    <div className="input input-bordered flex items-center gap-2 mb-4">
                        <Search className="size-4 opacity-50" />
                        <input type="text" placeholder="Search..." className="grow" value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                        {allUsers.filter(u => !selectedGroup.members?.some(m => m._id === u._id) && u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase())).map(user => (
                            <div key={user._id} onClick={() => setSelectedUserId(user._id)} className={`p-3 rounded-lg border cursor-pointer ${selectedUserId === user._id ? 'bg-primary text-primary-content' : 'bg-base-200'}`}>
                                <div className='flex items-center gap-3'>
                                    <div className='avatar'><div className='w-8 rounded-full'><img src={user.image || '/avatar.png'} alt="" /></div></div>
                                    <span className='text-sm font-medium'>{user.fullName}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary w-full" onClick={handleAddMember} disabled={!selectedUserId}>Add Member</button>
                </div>
            </dialog>

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
