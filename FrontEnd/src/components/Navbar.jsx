import { LogOut, MessageSquare, Settings, User } from 'lucide-react';
import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';

function Navbar() {
  const { logout, authUser } = useAuthStore();

  return (
    <header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg">
      <div className="container mx-auto px-2 sm:px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/" className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg mx-1 sm:mx-2">
                <MessageSquare className="size-4 sm:size-5 text-primary" />
              </div>
              <h1 className="text-primary font-bold text-sm sm:text-base">Chatty</h1>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            {authUser && (
              <>
                {(authUser.role === 'manager' || authUser.role === 'owner') && (
                  <>
                    <Link to="/add-seller" className="btn btn-xs sm:btn-sm btn-ghost btn-circle">
                      <User className="size-3 sm:size-4 md:size-5 text-base-content" />
                      <span className="hidden md:inline">Add Seller</span>
                    </Link>
                    <Link to="/signup" className="btn btn-xs sm:btn-sm btn-ghost btn-circle">
                      <User className="size-3 sm:size-4 md:size-5 text-base-content" />
                      <span className="hidden md:inline">Add User</span>
                    </Link>
                  </>
                )}
                <Link to="/profile" className="btn btn-xs sm:btn-sm btn-ghost btn-circle">
                  <User className="size-3 sm:size-4 md:size-5 text-base-content" />
                </Link>
                <Link to="/setting" className="btn btn-xs sm:btn-sm btn-ghost btn-circle">
                  <Settings className="size-3 sm:size-4 md:size-5 text-base-content" />
                </Link>
                <button onClick={logout} className="btn btn-xs sm:btn-sm btn-ghost btn-circle">
                  <LogOut className="size-3 sm:size-4 md:size-5 text-base-content" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
