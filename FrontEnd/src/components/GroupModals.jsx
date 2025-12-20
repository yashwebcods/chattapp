import React, { useState, useEffect } from 'react';
import { useMessageStore } from '../store/useMessageStore';
import { useAuthStore } from '../store/useAuthStore';
import { Search, UserMinus, Users } from 'lucide-react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const GroupModals = () => {
    const { selectedGroup, getGroups } = useMessageStore();
    const { authUser } = useAuthStore();
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');

    useEffect(() => {
        if (selectedGroup) {
            fetchAllUsers();
        }
    }, [selectedGroup?._id]);

    const fetchAllUsers = async () => {
        try {
            const response = await axiosInstance.get('/message/users');
            setAllUsers(response.data);
        } catch (error) {
            toast.error('Failed to fetch users');
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) {
            toast.error('Please select a user');
            return;
        }
        try {
            await axiosInstance.post(`/group/${selectedGroup._id}/add-member`, { userId: selectedUserId });
            toast.success('Member added successfully');
            setSelectedUserId('');
            document.getElementById('add_member_modal').close();
            await getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!confirm('Are you sure you want to remove this member?')) return;
        try {
            await axiosInstance.post(`/group/${selectedGroup._id}/remove-member`, { userId });
            toast.success('Member removed successfully');
            await getGroups();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    if (!selectedGroup) return null;

    return (
        <>
            {/* Members View Modal */}
            <dialog id="members_modal" className="modal">
                <div className="modal-box">
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    </form>
                    <h3 className="font-bold text-lg mb-4 text-primary flex items-center gap-2">
                        <Users className="size-5" />
                        Group Members
                    </h3>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {selectedGroup.members?.map((member) => (
                            <div key={member._id} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
                                <div className="avatar">
                                    <div className="w-10 rounded-full border border-primary/20">
                                        <img src={member.image || '/avatar.png'} alt="" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate text-sm">
                                        {member.fullName}
                                        {member._id === authUser._id && <span className="text-primary text-xs ml-1">(You)</span>}
                                        {member.role === 'owner' && <span className="badge badge-xs badge-primary ml-1 text-[10px]">Owner</span>}
                                        {member.role === 'manager' && <span className="badge badge-xs badge-secondary ml-1 text-[10px]">Manager</span>}
                                    </p>
                                    <p className="text-xs text-base-content/60 truncate">{member.email}</p>
                                </div>
                                {(authUser.role === 'owner' || authUser.role === 'manager') &&
                                    member._id !== authUser._id &&
                                    member.role !== 'owner' &&
                                    member.role !== 'manager' && (
                                        <button
                                            className="btn btn-ghost btn-xs text-error p-0 size-7 min-h-0"
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
                <div className="modal-box p-0 overflow-hidden">
                    <div className="p-4 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
                        <h3 className="font-bold text-lg">Add New Member</h3>
                        <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost">✕</button></form>
                    </div>

                    <div className="p-4">
                        <div className="relative mb-4">
                            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                className="input input-bordered w-full pl-10"
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 scrollbar-thin">
                            {allUsers
                                .filter(u => !selectedGroup.members?.some(m => m._id === u._id) &&
                                    u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()))
                                .map(user => (
                                    <div
                                        key={user._id}
                                        onClick={() => setSelectedUserId(user._id)}
                                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedUserId === user._id
                                                ? 'bg-primary/10 border-primary ring-1 ring-primary'
                                                : 'bg-base-200 border-transparent hover:border-base-300'
                                            }`}
                                    >
                                        <div className='avatar'>
                                            <div className='w-10 rounded-full'>
                                                <img src={user.image || '/avatar.png'} alt="" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <span className='text-sm font-semibold block'>{user.fullName}</span>
                                            <span className='text-xs opacity-60'>{user.role}</span>
                                        </div>
                                        {selectedUserId === user._id && <div className="size-2 rounded-full bg-primary animate-pulse"></div>}
                                    </div>
                                ))
                            }
                            {allUsers.length === 0 && <p className="text-center py-4 text-xs opacity-50">No users found</p>}
                        </div>

                        <button
                            className="btn btn-primary w-full shadow-lg"
                            onClick={handleAddMember}
                            disabled={!selectedUserId}
                        >
                            Add to Group
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </>
    );
};

export default GroupModals;
