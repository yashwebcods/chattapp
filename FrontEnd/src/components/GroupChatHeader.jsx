import React from 'react';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const GroupChatHeader = ({ selectedGroup, onAddMember }) => {
    const navigate = useNavigate();
    const { authUser } = useAuthStore();

    return (
        <div className='flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border-b border-base-300 bg-base-100/50 backdrop-blur-md sticky top-0 z-10'>
            <button
                onClick={() => navigate('/groups')}
                className='btn btn-ghost btn-sm btn-circle'
            >
                <ArrowLeft className='size-4 sm:size-5' />
            </button>
            <div className='flex items-center gap-3 flex-1'>
                <div className='avatar placeholder'>
                    <div className='bg-primary text-primary-content rounded-full w-10 sm:w-12'>
                        <Users className='size-5 sm:size-6 align-middle mt-2 sm:mt-3' />
                    </div>
                </div>
                <div>
                    <h2 className='font-bold text-base sm:text-lg truncate max-w-[150px] sm:max-w-none'>{selectedGroup.name}</h2>
                    <p className='text-xs sm:text-sm text-base-content/60'>
                        {selectedGroup.members?.length || 0} members
                    </p>
                </div>
            </div>

            <button
                className='btn btn-sm btn-ghost gap-2'
                onClick={() => document.getElementById('members_modal').showModal()}
            >
                <Users className='size-4' />
                <span className='hidden md:inline'>Members</span>
            </button>

            {(authUser?.role === 'owner' || authUser?.role === 'manager') && (
                <button
                    className='btn btn-sm btn-primary gap-2'
                    onClick={onAddMember}
                >
                    <UserPlus className='size-4' />
                    <span className='hidden md:inline'>Add Member</span>
                </button>
            )}
        </div>
    );
};

export default GroupChatHeader;
