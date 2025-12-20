import React, { useState } from 'react';
import { useMessageStore } from '../store/useMessageStore';
import { Search, User, Users, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const ForwardModal = () => {
    const {
        users,
        groups,
        forwardingMessage,
        setForwardingMessage,
        forwardMessage
    } = useMessageStore();

    const [searchTerm, setSearchTerm] = useState('');

    if (!forwardingMessage) return null;

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredGroups = groups.filter(group =>
        group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.sellerId?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleForward = async (targetId, isGroup) => {
        await forwardMessage(forwardingMessage, targetId, isGroup);
        setForwardingMessage(null);
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md bg-base-100 p-0 overflow-hidden border border-base-300 shadow-2xl rounded-2xl">
                {/* Modal Header */}
                <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
                    <div className="flex items-center gap-2">
                        <Send className="size-5 text-primary" />
                        <h3 className="font-bold text-lg">Forward Message</h3>
                    </div>
                    <button
                        onClick={() => setForwardingMessage(null)}
                        className="btn btn-ghost btn-sm btn-circle"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-base-300">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
                        <input
                            type="text"
                            placeholder="Search users or groups..."
                            className="input input-bordered w-full pl-10 input-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Recipients List */}
                <div className="max-h-[50vh] overflow-y-auto">
                    {/* Groups Section */}
                    {filteredGroups.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50">Groups</div>
                            {filteredGroups.map((group) => (
                                <button
                                    key={group._id}
                                    onClick={() => handleForward(group._id, true)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-base-200 transition-all rounded-xl text-left"
                                >
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        {group.image ? (
                                            <img src={group.image} className="size-10 rounded-full border" alt="" />
                                        ) : (
                                            <Users className="size-5 text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">
                                            {group.sellerId?.companyName ? `${Math.abs(group.sellerIndex + 1)} - ${group.sellerId.companyName}` : group.name}
                                        </div>
                                        <div className="text-xs opacity-50">{group.members?.length} members</div>
                                    </div>
                                    <Send className="size-4 opacity-0 group-hover:opacity-100 text-primary" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Users Section */}
                    {filteredUsers.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50">Contacts</div>
                            {filteredUsers.map((user) => (
                                <button
                                    key={user._id}
                                    onClick={() => handleForward(user._id, false)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-base-200 transition-all rounded-xl text-left"
                                >
                                    <div className="avatar">
                                        <div className="size-10 rounded-full">
                                            <img src={user.image || '/avatar.png'} alt={user.fullName} />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{user.fullName}</div>
                                        <div className="text-xs opacity-50">{user.role}</div>
                                    </div>
                                    <Send className="size-4 opacity-0 group-hover:opacity-100 text-primary" />
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredUsers.length === 0 && filteredGroups.length === 0 && (
                        <div className="p-8 text-center text-base-content/50">
                            No results found
                        </div>
                    )}
                </div>
            </div>
            <div className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={() => setForwardingMessage(null)}></div>
        </div>
    );
};

export default ForwardModal;
