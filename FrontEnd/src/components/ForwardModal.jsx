import React, { useState } from 'react';
import { useMessageStore } from '../store/useMessageStore';
import { Search, User, Users, X, Send, CheckCircle2, Circle } from 'lucide-react';
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
    const [selectedTargets, setSelectedTargets] = useState([]); // Array of { id, isGroup, name }
    const [isSending, setIsSending] = useState(false);

    if (!forwardingMessage) return null;

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredGroups = groups.filter(group =>
        group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.sellerId?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const toggleTarget = (id, isGroup, name) => {
        setSelectedTargets(prev => {
            const exists = prev.find(t => t.id === id);
            if (exists) {
                return prev.filter(t => t.id !== id);
            } else {
                return [...prev, { id, isGroup, name }];
            }
        });
    };

    const handleBatchForward = async () => {
        if (selectedTargets.length === 0) {
            toast.error('Please select at least one recipient');
            return;
        }

        setIsSending(true);
        const loadingToast = toast.loading(`Forwarding message to ${selectedTargets.length} recipients...`);

        try {
            // Process forwarding sequentially or in parallel? 
            // Better to do it in a loop with individual results
            for (const target of selectedTargets) {
                await forwardMessage(forwardingMessage, target.id, target.isGroup);
            }
            toast.success('Message forwarded successfully', { id: loadingToast });
            setForwardingMessage(null);
            setSelectedTargets([]);
        } catch (error) {
            toast.error('Failed to forward to some recipients', { id: loadingToast });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-md bg-base-100 p-0 overflow-hidden border border-base-300 shadow-2xl rounded-2xl flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
                    <div className="flex items-center gap-2">
                        <Send className="size-5 text-primary" />
                        <h3 className="font-bold text-lg">Forward Message</h3>
                    </div>
                    <button
                        onClick={() => {
                            setForwardingMessage(null);
                            setSelectedTargets([]);
                        }}
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

                {/* Selected Count / Multi-Forward Button */}
                {selectedTargets.length > 0 && (
                    <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                            {selectedTargets.length} recipient{selectedTargets.length > 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={handleBatchForward}
                            disabled={isSending}
                            className="btn btn-primary btn-sm rounded-full gap-2 px-6"
                        >
                            {isSending ? <span className="loading loading-spinner loading-xs"></span> : <Send className="size-3" />}
                            Forward
                        </button>
                    </div>
                )}

                {/* Recipients List */}
                <div className="flex-1 overflow-y-auto">
                    {/* Groups Section */}
                    {filteredGroups.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50">Groups</div>
                            {filteredGroups.map((group) => {
                                const isSelected = selectedTargets.some(t => t.id === group._id);
                                const groupName = group.sellerId?.companyName ? `${Math.abs(group.sellerIndex + 1)} - ${group.sellerId.companyName}` : group.name;
                                return (
                                    <button
                                        key={group._id}
                                        onClick={() => toggleTarget(group._id, true, groupName)}
                                        className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl text-left mb-1 ${isSelected ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-base-200'}`}
                                    >
                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            {group.image ? (
                                                <img src={group.image} className="size-10 rounded-full border" alt="" />
                                            ) : (
                                                <Users className="size-5 text-primary" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{groupName}</div>
                                            <div className="text-xs opacity-50">{group.members?.length} members</div>
                                        </div>
                                        {isSelected ? (
                                            <CheckCircle2 className="size-5 text-primary fill-primary/10" />
                                        ) : (
                                            <Circle className="size-5 opacity-20" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Users Section */}
                    {filteredUsers.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50">Contacts</div>
                            {filteredUsers.map((user) => {
                                const isSelected = selectedTargets.some(t => t.id === user._id);
                                return (
                                    <button
                                        key={user._id}
                                        onClick={() => toggleTarget(user._id, false, user.fullName)}
                                        className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl text-left mb-1 ${isSelected ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-base-200'}`}
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
                                        {isSelected ? (
                                            <CheckCircle2 className="size-5 text-primary fill-primary/10" />
                                        ) : (
                                            <Circle className="size-5 opacity-20" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {filteredUsers.length === 0 && filteredGroups.length === 0 && (
                        <div className="p-8 text-center text-base-content/50">
                            No results found
                        </div>
                    )}
                </div>

                {/* Bottom Stats (Optional) */}
                <div className="p-4 bg-base-200/30 text-[10px] opacity-40 text-center uppercase tracking-widest font-bold">
                    Select recipients to forward
                </div>
            </div>
            <div className="modal-backdrop bg-black/40 backdrop-blur-sm" onClick={() => {
                setForwardingMessage(null);
                setSelectedTargets([]);
            }}></div>
        </div>
    );
};

export default ForwardModal;
