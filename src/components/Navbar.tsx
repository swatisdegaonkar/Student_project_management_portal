import React, { useState } from 'react';
import { 
  GraduationCap, 
  Home, 
  PlusCircle, 
  ShieldCheck, 
  Activity, 
  Mail, 
  LogOut, 
  Menu, 
  X, 
  User,
  LayoutDashboard
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Navbar({ user, activeTab, setActiveTab, onLogout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isMentor = user?.role === 'mentor';

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    ...(!isMentor ? [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'submit', label: 'Submit Project', icon: PlusCircle },
      { id: 'progress', label: 'Progress Tracking', icon: Activity },
    ] : []),
    { id: 'contact', label: 'Support & Help', icon: Mail },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false);
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer" onClick={() => handleTabClick('home')}>
              <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-100">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="font-display font-bold text-lg md:text-xl text-slate-900 tracking-tight">
                Collab<span className="text-indigo-600">PM</span>
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-50/80 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`mr-1.5 h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}

              {isMentor && (
                <button
                  type="button"
                  onClick={() => handleTabClick('mentor')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === 'mentor'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100'
                      : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
                  }`}
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                  Mentor Panel
                </button>
              )}
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="hidden lg:flex lg:items-center lg:space-x-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-800">{user.displayName}</div>
                  <div className="flex items-center justify-end gap-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium tracking-wide border ${
                      user.role === 'admin'
                        ? 'bg-slate-900 text-slate-100 border-slate-900'
                        : user.role === 'mentor' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {user.role === 'admin' ? 'SysAdmin' : user.role === 'mentor' ? 'Mentor' : 'Student'}
                    </span>
                    {user.department && (
                      <span className="text-[10px] text-slate-400 font-mono hidden xl:inline-block">
                        • {user.department}
                      </span>
                    )}
                  </div>
                </div>
                
                <img
                  className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 object-cover"
                  src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`}
                  alt={user.displayName}
                />

                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-b border-slate-100 px-4 pt-2 pb-4 space-y-1.5 animate-in fade-in slide-in-from-top-3 duration-200">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}

          {isMentor && (
            <button
              type="button"
              onClick={() => handleTabClick('mentor')}
              className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'mentor'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <ShieldCheck className="mr-3 h-5 w-5 text-emerald-600" />
              Mentor Panel
            </button>
          )}

          {user && (
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 object-cover"
                  src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`}
                  alt={user.displayName}
                />
                <div>
                  <div className="text-sm font-bold text-slate-800">{user.displayName}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
