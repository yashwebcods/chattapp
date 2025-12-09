import { LogOut, MessageSquare, Settings, User } from 'lucide-react';
import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';

function Navbar() {
  const { logout, authUser } = useAuthStore();

  return (
    <header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg mx-2">
                <MessageSquare className="size-5 h-5 text-primary" />
              </div>
              <h1 className="text-primary font-bold">Chatty</h1>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {authUser && (
              <>
                {(authUser.role === 'manager' || authUser.role === 'owner') && (
                  <>
                    <Link to="/add-seller" className="btn btn-sm btn-ghost">
                      <User className="size-5 h-5 text-base-content" />
                      <span className="hidden sm:inline">Add Seller</span>
                    </Link>
                    <Link to="/signup" className="btn btn-sm btn-ghost">
                      <User className="size-5 h-5 text-base-content" />
                      <span className="hidden sm:inline">Add User</span>
                    </Link>
                  </>
                )}
                <Link to="/profile">
                  <User className="size-5 h-5 text-base-content" />
                </Link>
                <Link to="/setting">
                  <Settings className="size-5 h-5 text-base-content" />
                </Link>
                <button onClick={logout}>
                  <LogOut className="size-5 h-5 text-base-content" />
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
