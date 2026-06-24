import React, { useState, useEffect, useRef } from 'react';
import {
  onSupabaseAuthStateChanged,
  signOutUser,
  getSupabaseStudentProjects,
  getSupabaseMentorProjects,
  getSupabaseAllProjects,
  DEFAULT_MENTORS,
  isSupabaseConfigured,
  supabase
} from './lib/supabase';
import { UserProfile, Project } from './types';
import { motion } from 'motion/react';
import { GraduationCap, LogOut, Loader2, RefreshCw } from 'lucide-react';

// Modular Page imports
import Navbar from './components/Navbar';
import AuthScreen from './components/AuthScreen';
import HomePage from './components/HomePage';
import StudentDashboard from './components/StudentDashboard';
import ProjectSubmission from './components/ProjectSubmission';
import ProgressTracking from './components/ProgressTracking';
import MentorPanel from './components/MentorPanel';
import ContactPage from './components/ContactPage';
import AdminPanel from './components/AdminPanel';

const ACTIVE_TAB_STORAGE_KEY = 'collabpm_active_tab';
const ALL_PORTAL_TABS = ['home', 'dashboard', 'submit', 'progress', 'mentor', 'contact'];

function getSavedActiveTab() {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return saved && ALL_PORTAL_TABS.includes(saved) ? saved : 'home';
  } catch (e) {
    return 'home';
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const initialAuthResolved = useRef(false);
  const [activeTab, setActiveTab] = useState<string>(() => getSavedActiveTab());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const enterSandboxProfile = (profile: UserProfile) => {
    localStorage.setItem('collabpm_sandbox_user', JSON.stringify(profile));
    setUser(profile);
    setAuthChecking(false);
  };

  // Router check for separate admin panel route (e.g. /admin or #admin/login)
  const [isAdminRoute, setIsAdminRoute] = useState(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    return path.startsWith('/admin') || hash.startsWith('#admin');
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      setIsAdminRoute(path.startsWith('/admin') || hash.startsWith('#admin'));
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const allowedTabs =
      user.role === 'mentor'
        ? ['home', 'mentor', 'contact']
        : user.role === 'admin'
          ? ['home', 'contact']
          : ['home', 'dashboard', 'submit', 'progress', 'contact'];

    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(user.role === 'mentor' ? 'mentor' : 'home');
      return;
    }

    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    } catch (e) { }
  }, [activeTab, user]);

  // Stats calculation
  const [stats, setStats] = useState({
    totalProjects: 0,
    approved: 0,
    pending: 0,
    completedMilestones: 0
  });

  // Check auth state on mount
  useEffect(() => {
    let finished = false;

    if (!isSupabaseConfigured || !supabase) {
      const localUserJson = localStorage.getItem('collabpm_sandbox_user');
      if (localUserJson) {
        try {
          setUser(JSON.parse(localUserJson));
        } catch (e) {
          localStorage.removeItem('collabpm_sandbox_user');
        }
      }
      setAuthChecking(false);
      finished = true;
      return;
    }

    const authTimeout = window.setTimeout(() => {
      if (!finished) {
        console.warn('Supabase auth check timed out; continuing with local portal access.');
        setAuthChecking(false);
      }
    }, 3500);

    const unsubscribe = onSupabaseAuthStateChanged(async (profile) => {
      finished = true;
      window.clearTimeout(authTimeout);

      if (profile) {
        setUser((current) => {
          if (
            current?.uid === profile.uid &&
            current?.role === profile.role &&
            current?.displayName === profile.displayName &&
            current?.email === profile.email
          ) {
            return current;
          }

          return profile;
        });
      } else {
        setUser(null);
        setProjects([]);
      }

      initialAuthResolved.current = true;
      setAuthChecking(false);
    });

    return () => {
      finished = true;
      window.clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  // Helper to recalculate statistics based on local projects list
  const recalculateStats = (sorted: Project[]) => {
    const approvedCount = sorted.filter(p => p.status === 'approved' || p.status === 'completed').length;
    const pendingCount = sorted.filter(p => p.status === 'pending').length;
    let finishedMilestones = 0;

    sorted.forEach(p => {
      finishedMilestones += (p.milestones || []).filter(m => m.status === 'completed' || m.status === 'approved').length;
    });

    setStats({
      totalProjects: sorted.length,
      approved: approvedCount,
      pending: pendingCount,
      completedMilestones: finishedMilestones
    });
  };

  // Fetch / Synchronize Projects list in real-time
  useEffect(() => {
    if (!user) return;

    setLoadingProjects(true);
    fetchProjectsOneTime();

    // High-frequency polling to ensure local/sandbox data changes synchronize immediately across roles/tabs
    const intervalId = setInterval(() => {
      fetchProjectsOneTime();
    }, 4000);

    let channel: any = null;

    if (isSupabaseConfigured && supabase) {
      // Set up Supabase Realtime channel
      channel = supabase
        .channel('public:projects')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects' },
          () => {
            fetchProjectsOneTime();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(intervalId);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const fetchProjectsOneTime = async () => {
    if (!user) return;
    try {
      let items: Project[] = [];
      if (user.role === 'admin') {
        items = await getSupabaseAllProjects();
      } else if (user.role === 'mentor') {
        items = await getSupabaseMentorProjects(user.uid);
      } else {
        items = await getSupabaseStudentProjects(user.uid);
      }

      const sorted = items.sort((a, b) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
        return dateB - dateA;
      });

      setProjects(sorted);

      // Keep selectedProject reference up to date
      if (selectedProject) {
        const updated = sorted.find(p => p.id === selectedProject.id);
        if (updated) {
          setSelectedProject(updated);
        }
      }

      recalculateStats(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('collabpm_sandbox_user');
      localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
      await signOutUser();
      setUser(null);
      setActiveTab('home');
      setSelectedProject(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setAuthChecking(false);
  };

  // Render proper screen with smooth fade-in
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomePage
            user={user}
            setActiveTab={setActiveTab}
            stats={stats}
          />
        );
      case 'dashboard':
        return (
          <StudentDashboard
            user={user!}
            projects={projects}
            setActiveTab={setActiveTab}
            setSelectedProject={setSelectedProject}
          />
        );
      case 'submit':
        return (
          <ProjectSubmission
            user={user!}
            setActiveTab={setActiveTab}
            onRefreshProjects={fetchProjectsOneTime}
          />
        );
      case 'progress':
        return (
          <ProgressTracking
            user={user!}
            projects={projects}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            onRefreshProjects={fetchProjectsOneTime}
            setActiveTab={setActiveTab}
          />
        );
      case 'mentor':
        return user?.role === 'mentor' ? (
          <MentorPanel
            user={user}
            projects={projects}
            onRefreshProjects={fetchProjectsOneTime}
          />
        ) : (
          <div className="text-center text-slate-500 py-12">Unauthorized view access.</div>
        );
      case 'contact':
        return (
          <ContactPage user={user!} />
        );
      default:
        return <HomePage user={user} setActiveTab={setActiveTab} stats={stats} />;
    }
  };

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  if (authChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl animate-bounce mb-4">
          <GraduationCap className="h-8 w-8" />
        </div>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            Connecting to Academic Database...
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs text-slate-500 space-y-3">
            <p className="leading-relaxed">
              If connection takes too long, you can bypass the database connection and load the portal immediately using a secure Sandbox Profile:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  enterSandboxProfile({
                    uid: 'demo-student-alice',
                    email: 'alice.smith@university.edu',
                    displayName: 'Alice Smith',
                    role: 'student',
                    department: 'Computer Science',
                    studentId: 'STU-202688',
                    createdAt: null as any
                  });
                }}
                className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Student Profile
              </button>
              <button
                onClick={() => {
                  enterSandboxProfile({
                    uid: 'mentor-dr-sarah',
                    email: 'sarah.connor@university.edu',
                    displayName: 'Dr. Sarah Connor',
                    role: 'mentor',
                    department: 'Computer Science & AI',
                    mentorId: 'EMP-SARAH',
                    createdAt: null as any
                  });
                }}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
              >
                Mentor Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    // Hardcoded administrative login block
    const emailKey = adminEmail.trim().toLowerCase();
    if (emailKey === 'admin@university.edu' || emailKey === 'admin') {
      const adminProfile: UserProfile = {
        uid: 'admin-academic-dean',
        email: 'admin@university.edu',
        displayName: 'Dean of Academic Oversight',
        role: 'admin',
        department: 'University Administration',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('collabpm_sandbox_user', JSON.stringify(adminProfile));
      setUser(adminProfile);
      setAdminLoading(false);
    } else if (emailKey === 'sysadmin@university.edu' || emailKey === 'sysadmin') {
      const adminProfile: UserProfile = {
        uid: 'admin-systems-engineer',
        email: 'sysadmin@university.edu',
        displayName: 'Principal Systems Administrator',
        role: 'admin',
        department: 'Systems & Infrastructure',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('collabpm_sandbox_user', JSON.stringify(adminProfile));
      setUser(adminProfile);
      setAdminLoading(false);
    } else {
      setTimeout(() => {
        setAdminError('Invalid administrative credentials. Use the Admin Quick Launch buttons below.');
        setAdminLoading(false);
      }, 605);
    }
  };

  const handleQuickAdminLogin = (roleType: 'dean' | 'sysadmin') => {
    setAdminLoading(true);
    const profile: UserProfile = roleType === 'dean' ? {
      uid: 'admin-academic-dean',
      email: 'admin@university.edu',
      displayName: 'Dean of Academic Oversight',
      role: 'admin',
      department: 'University Administration',
      createdAt: new Date().toISOString()
    } : {
      uid: 'admin-systems-engineer',
      email: 'sysadmin@university.edu',
      displayName: 'Principal Systems Administrator',
      role: 'admin',
      department: 'Systems & Infrastructure',
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('collabpm_sandbox_user', JSON.stringify(profile));
    setUser(profile);
    setAdminLoading(false);
  };

  if (isAdminRoute) {
    const isLoggedAsAdmin = user && user.role === 'admin';

    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        {/* Admin Header */}
        <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 sm:px-8 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-black text-lg text-white">
              Collab<span className="text-indigo-400">PM</span> <span className="text-xs text-slate-300 font-bold font-mono px-2 py-0.5 bg-slate-800 rounded border border-slate-700">Admin Area</span>
            </span>
          </div>
          <span className="text-xs text-slate-400 font-semibold font-mono bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            Secure Systems Shell
          </span>
        </header>

        {isLoggedAsAdmin ? (
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AdminPanel
              user={user!}
              projects={projects}
              onRefreshProjects={fetchProjectsOneTime}
              onLogout={handleLogout}
            />
          </main>
        ) : (
          /* Separate Admin Login Screen */
          <main className="flex-1 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="bg-slate-950 text-indigo-400 p-3 rounded-2xl w-fit mx-auto shadow-lg">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h2 className="font-display font-black text-slate-900 text-2xl tracking-tight">
                  Academic Systems Admin
                </h2>
                <p className="text-slate-500 text-xs">
                  Administrative gate. Authorized personnel credentials required.
                </p>
              </div>

              {/* Current user session alert */}
              {user && user.role !== 'admin' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                  <p>You are currently logged in as a <strong>{user.role}</strong> ({user.displayName}). You must sign out first to gain administrative access.</p>
                  <button
                    onClick={handleLogout}
                    className="w-full py-1.5 bg-amber-650 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Logout current session
                  </button>
                </div>
              )}

              {(!user || user.role === 'admin') && (
                <>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    {adminError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-650">
                        {adminError}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Administrative Email</label>
                      <input
                        type="text"
                        placeholder="admin@university.edu"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Security Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      {adminLoading ? 'Verifying Gateway...' : 'Initialize Terminal'}
                    </button>
                  </form>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">Quick Launch Bypass</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleQuickAdminLogin('dean')}
                      className="py-2.5 px-3 border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/20 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer text-center"
                    >
                      Academic Dean
                    </button>
                    <button
                      onClick={() => handleQuickAdminLogin('sysadmin')}
                      className="py-2.5 px-3 border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/20 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer text-center"
                    >
                      Systems Admin
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  window.location.hash = '';
                  setIsAdminRoute(false);
                }}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center border border-slate-200"
              >
                Return to Student / Mentor Hub
              </button>
            </div>
          </main>
        )}

        {/* Footer */}
        <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 mt-auto">
          <div>&copy; {new Date().getFullYear()} CollabPM Academic Project Portal. All rights reserved.</div>
          <div className="mt-1 flex items-center justify-center gap-3">
            <span className="hover:text-indigo-600 cursor-pointer font-bold text-indigo-600" onClick={() => { window.location.hash = ''; setIsAdminRoute(false); }}>Exit Admin View</span>
            <span>•</span>
            <span className="hover:text-slate-600 cursor-pointer">Security Guidelines</span>
            <span>•</span>
            <span className="hover:text-slate-600 cursor-pointer font-mono text-[11px]">v1.0.0</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Navbar visible when user is logged in */}
      {user ? (
        <>
          <Navbar
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Loading overlay for real-time operations */}
            {loadingProjects && projects.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Project State</span>
              </div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {renderTabContent()}
              </motion.div>
            )}
          </main>
        </>
      ) : (
        /* Not logged in: show professional Welcome & login */
        <div className="flex-1 flex flex-col justify-center">
          <header className="bg-white border-b border-slate-100 py-4 px-6 sm:px-8 flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="font-display font-black text-lg text-slate-900">
                Collab<span className="text-indigo-600">PM</span>
              </span>
            </div>
            <span className="text-xs text-slate-400 font-semibold font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
              v1.0.0
            </span>
          </header>

          <main className="flex-1">
            <AuthScreen onAuthSuccess={handleAuthSuccess} />
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <div>&copy; {new Date().getFullYear()} CollabPM Academic Project Portal. All rights reserved.</div>
        <div className="mt-1 flex items-center justify-center gap-3">
          <span className="hover:text-slate-600 cursor-pointer">Security Policy</span>
          <span>•</span>
          <span className="hover:text-slate-600 cursor-pointer">Academic Guidelines</span>
          <span>•</span>
          <span className="hover:text-slate-650 cursor-pointer text-indigo-650 font-bold" onClick={() => { window.location.hash = '#admin/login'; }}>Admin Portal</span>
          <span>•</span>
          <span className="hover:text-slate-600 cursor-pointer">Supabase Connected</span>
        </div>
      </footer>
    </div>
  );
}
