import { LogOut, MessageSquare, Settings, User, Menu } from 'lucide-react';
import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMessageStore } from '../store/useMessageStore';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const { logout, authUser } = useAuthStore();
  const { setSelectedUser, setSelectedGroup } = useMessageStore();
  const navigate = useNavigate();

  const handleChattyClick = () => {
    // Clear selected chat
    setSelectedUser(null);
    setSelectedGroup(null);
    // Navigate to home
    navigate('/');
  };

  return (
    <header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg">
      <div className="container mx-auto px-2 sm:px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-4 sm:gap-8">
            <button
              onClick={handleChattyClick}
              className="flex items-center btn btn-ghost hover:bg-transparent p-0"
            >
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg mx-1 sm:mx-2">
                <MessageSquare className="size-4 sm:size-5 text-primary" />
              </div>
              <h1 className="text-primary font-bold text-sm sm:text-base">Chatty</h1>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop View: Show buttons only on medium screens and larger */}
            {authUser && (
              <div className="hidden md:flex items-center gap-2">
                {(authUser.role === 'manager' || authUser.role === 'owner') && (
                  <>
                    <Link to="/add-seller" className="btn btn-sm btn-ghost gap-2">
                      <User className="size-5" />
                      <span>Add Seller</span>
                    </Link>
                    <Link to="/signup" className="btn btn-sm btn-ghost gap-2">
                      <User className="size-5" />
                      <span>Add User</span>
                    </Link>
                  </>
                )}
                <Link to="/profile" className="btn btn-sm btn-ghost gap-2">
                  <User className="size-5" />
                  <span>Profile</span>
                </Link>
                <Link to="/setting" className="btn btn-sm btn-ghost gap-2">
                  <Settings className="size-5" />
                  <span>Settings</span>
                </Link>
                <button onClick={logout} className="btn btn-sm btn-ghost gap-2">
                  <LogOut className="size-5" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {/* Mobile View: Show dropdown on screens smaller than medium */}
            {authUser && (
              <div className="dropdown dropdown-end md:hidden">
                <button tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                  <Menu className="size-6" />
                </button>
                <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow-lg border border-base-300">
                  {(authUser.role === 'manager' || authUser.role === 'owner') && (
                    <>
                      <li>
                        <Link to="/add-seller">
                          <User className="size-4" /> Add Seller
                        </Link>
                      </li>
                      <li>
                        <Link to="/signup">
                          <User className="size-4" /> Add User
                        </Link>
                      </li>
                    </>
                  )}
                  <li>
                    <Link to="/profile">
                      <User className="size-4" /> Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/setting">
                      <Settings className="size-4" /> Settings
                    </Link>
                  </li>
                  <div className="divider my-1"></div>
                  <li>
                    <button onClick={logout} className="text-error">
                      <LogOut className="size-4" /> Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
