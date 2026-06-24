import React, { useState } from 'react';
import { 
  signUpWithEmail,
  signInWithEmail,
  saveSupabaseUserProfile,
  DEFAULT_MENTORS
} from '../lib/supabase';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  User, 
  Briefcase, 
  Building, 
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [department, setDepartment] = useState('Computer Science');
  const [studentId, setStudentId] = useState('');
  const [mentorId, setMentorId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const departments = [
    'Computer Science',
    'Data Science & AI',
    'Information Technology',
    'Software Engineering',
    'Electronics & Communication',
    'Mechanical Engineering'
  ];

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const emailKey = email.trim().toLowerCase();
    const localAccountsRaw = localStorage.getItem('collabpm_local_accounts');
    const localAccounts = localAccountsRaw ? JSON.parse(localAccountsRaw) : [];

    try {
      if (isLogin) {
        // Always attempt real Supabase login first. Local sandbox accounts are only
        // fallbacks when Supabase is unavailable or the user explicitly bypasses it.
        let profile: UserProfile;
        try {
          profile = await signInWithEmail(email, password);
          
          // Keep a non-authoritative copy for emergency offline fallback only.
          const filtered = localAccounts.filter((acc: any) => acc.email.toLowerCase() !== emailKey);
          filtered.push({ email: email.trim(), password, profile });
          localStorage.setItem('collabpm_local_accounts', JSON.stringify(filtered));
          
          setSuccess('Successfully logged in!');
          onAuthSuccess(profile);
        } catch (supaErr: any) {
          console.warn("Supabase signIn failed:", supaErr);
          
          const lowerErr = supaErr.message?.toLowerCase() || '';
          
          // Only use local cached credentials if the server/client is unavailable.
          const emailMatchOnly = localAccounts.find((acc: any) => acc.email.toLowerCase() === emailKey);
          const isConnectionProblem =
            lowerErr.includes('not configured') ||
            lowerErr.includes('failed to fetch') ||
            lowerErr.includes('network') ||
            lowerErr.includes('timeout') ||
            lowerErr.includes('abort');

          if (isConnectionProblem && emailMatchOnly) {
            if (emailMatchOnly.password === password) {
              localStorage.setItem('collabpm_sandbox_user', JSON.stringify(emailMatchOnly.profile));
              setSuccess(`Logged in from offline fallback: ${emailMatchOnly.profile.displayName}`);
              onAuthSuccess(emailMatchOnly.profile);
              return;
            } else {
              throw new Error('Incorrect password. Please try again.');
            }
          }

          throw supaErr;
        }
      } else {
        // Sign Up Flow
        if (!displayName) throw new Error('Please enter your full name');
        if (role === 'student' && !studentId) throw new Error('Please enter your Student Roll Number / ID');
        if (role === 'mentor' && !mentorId) throw new Error('Please enter your Employee / Mentor ID');

        let profile: UserProfile;
        try {
          // Try standard signup
          profile = await signUpWithEmail(
            email,
            password,
            displayName,
            role,
            department,
            role === 'student' ? studentId : undefined,
            role === 'mentor' ? mentorId : undefined
          );
        } catch (supaErr: any) {
          const lowerErr = supaErr.message?.toLowerCase() || '';
          const isConnectionProblem =
            lowerErr.includes('not configured') ||
            lowerErr.includes('failed to fetch') ||
            lowerErr.includes('network') ||
            lowerErr.includes('timeout') ||
            lowerErr.includes('abort');

          if (!isConnectionProblem) {
            throw supaErr;
          }

          console.warn("Supabase signup unavailable, creating offline fallback profile:", supaErr);
          
          // Generate resilient sandbox profile
          const customUid = `sandbox-${Math.random().toString(36).substring(2, 10)}`;
          profile = {
            uid: customUid,
            email: email.trim(),
            displayName: displayName.trim(),
            role: role,
            department: department,
            studentId: role === 'student' ? studentId : undefined,
            mentorId: role === 'mentor' ? mentorId : undefined,
            createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
          };

          try {
            await saveSupabaseUserProfile(customUid, profile).catch(() => {});
          } catch (e) {}
        }

        // Cache this new account locally so that login works instantly and perfectly
        const filtered = localAccounts.filter((acc: any) => acc.email.toLowerCase() !== emailKey);
        filtered.push({ email: email.trim(), password, profile });
        localStorage.setItem('collabpm_local_accounts', JSON.stringify(filtered));

        setSuccess('Account created successfully!');
        onAuthSuccess(profile);
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      
      if (msg.includes('Invalid login credentials') || msg.includes('invalid login')) {
        msg = 'Incorrect password or email. Please check your Supabase account credentials.';
      } else if (msg.includes('User already registered')) {
        msg = 'This email is already registered. Please log in instead.';
      } else if (msg.includes('relation "public.users" does not exist')) {
        msg = 'Database tables are missing. Please run the SQL Setup script in your Supabase SQL Editor!';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Quick sandbox login for smooth review and testing
  const handleQuickLogin = (type: 'student' | 'mentor', mentorIndex?: number) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let profile: UserProfile;

      if (type === 'student') {
        const studentUid = 'demo-student-alice';
        profile = {
          uid: studentUid,
          email: 'alice.smith@university.edu',
          displayName: 'Alice Smith',
          role: 'student',
          department: 'Computer Science',
          studentId: 'STU-202688',
          createdAt: null as any
        };
        setSuccess('Welcome back, Alice (Demo Student)!');
      } else {
        const mentor = DEFAULT_MENTORS[mentorIndex ?? 0];
        profile = {
          uid: mentor.uid,
          email: mentor.email,
          displayName: mentor.displayName,
          role: 'mentor',
          department: mentor.department,
          mentorId: 'EMP-' + mentor.uid.split('-')[2].toUpperCase(),
          createdAt: null as any
        };
        setSuccess(`Welcome back, ${mentor.displayName} (Demo Mentor)!`);
      }

      localStorage.setItem('collabpm_sandbox_user', JSON.stringify(profile));
      onAuthSuccess(profile);
      saveSupabaseUserProfile(profile.uid, profile).catch((err) => {
        console.warn('Demo profile database sync skipped:', err);
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Immediate local sandbox bypass to prevent any Supabase auth restrictions or email errors
  const handleSandboxBypass = () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const emailValue = email.trim() || 'guest@university.edu';
      const emailKey = emailValue.toLowerCase();
      
      // Try to recover existing local account profile values to preserve identity
      const localAccountsRaw = localStorage.getItem('collabpm_local_accounts');
      const localAccounts = localAccountsRaw ? JSON.parse(localAccountsRaw) : [];
      const matched = localAccounts.find((acc: any) => acc.email.toLowerCase() === emailKey);

      let sandboxProfile: UserProfile;

      if (matched) {
        sandboxProfile = matched.profile;
      } else {
        const nameValue = displayName.trim() || emailValue.split('@')[0];
        const customUid = `sandbox-${Math.random().toString(36).substring(2, 10)}`;
        
        sandboxProfile = {
          uid: customUid,
          email: emailValue,
          displayName: nameValue,
          role: role,
          department: department,
          studentId: role === 'student' ? (studentId || `STU-${Math.floor(100000 + Math.random() * 900000)}`) : undefined,
          mentorId: role === 'mentor' ? (mentorId || `EMP-${Math.floor(100000 + Math.random() * 900000)}`) : undefined,
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
        };

        // Cache this bypass credentials so they can login with any password next time
        localAccounts.push({ email: emailValue, password, profile: sandboxProfile });
        localStorage.setItem('collabpm_local_accounts', JSON.stringify(localAccounts));
      }

      // Store in localStorage for complete persistence across page reloads
      localStorage.setItem('collabpm_sandbox_user', JSON.stringify(sandboxProfile));
      
      // Attempt to gracefully cache in the public.users database table as well if table exists
      try {
        saveSupabaseUserProfile(sandboxProfile.uid, sandboxProfile).catch(() => {});
      } catch (e) {}

      setSuccess(`Welcome to CollabPM! Bypassed auth and logged in as ${sandboxProfile.displayName}.`);
      onAuthSuccess(sandboxProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to enter sandbox mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Side: Interactive Portal Intro */}
        <div className="lg:col-span-5 text-left space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/60 text-indigo-700 text-xs font-semibold tracking-wide">
            <GraduationCap className="h-4 w-4" /> Academic Excellence Portal
          </div>
          
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
            Manage, Review & Deploy Student Projects
          </h1>
          
          <p className="text-slate-600 text-sm leading-relaxed max-w-md">
            CollabPM is a professional, high-performance portal designed to bridge the gap between ambitious students and academic mentors. Register projects, track milestones, and receive peerless feedback.
          </p>

          {/* Key Value Badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-xs">
              <div className="text-indigo-600 font-bold font-display text-xl">100%</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Supabase Auth</div>
            </div>
            <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-xs">
              <div className="text-emerald-600 font-bold font-display text-xl">Real-time</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Progress Trackers</div>
            </div>
          </div>

          {/* Sandbox login section */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-xl space-y-3.5">
            <div>
              <h3 className="font-display font-bold text-sm text-indigo-200 uppercase tracking-wider">
                Instant Sandbox Playgrounds
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Skip registration! Login immediately to test any user viewpoint:
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('student')}
                className="w-full flex items-center justify-between text-left px-3.5 py-2.5 text-xs font-medium rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-300" />
                  <div>
                    <span className="block text-white">Alice Smith</span>
                    <span className="text-[10px] text-indigo-200">Demo Student Role</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-indigo-200" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('mentor', 0)}
                  className="flex items-center justify-between text-left px-3 py-2 text-xs font-medium rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-300" />
                    <div>
                      <span className="block text-emerald-100 truncate max-w-[100px]">Dr. Sarah</span>
                      <span className="text-[9px] text-emerald-300">CS Mentor</span>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-emerald-300" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('mentor', 1)}
                  className="flex items-center justify-between text-left px-3 py-2 text-xs font-medium rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-300" />
                    <div>
                      <span className="block text-emerald-100 truncate max-w-[100px]">Prof. Alan</span>
                      <span className="text-[9px] text-emerald-300">Data Sci Mentor</span>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-emerald-300" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card Form */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <h2 className="font-display font-extrabold text-2xl text-slate-800">
                {isLogin ? 'Welcome Back' : 'Create Academic Profile'}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {isLogin ? 'Access your student milestones and reviews' : 'Register details to submit projects'}
              </p>
            </div>

            {/* Error & Success States */}
            {error && (
              <div className="space-y-2">
                <div className="flex items-start gap-2.5 p-3.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl">
                  <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{error}</p>
                    <p className="text-[11px] text-slate-500">
                      <strong>Supabase response:</strong> fix the account details or table setup, then try again.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSandboxBypass}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  Offline Fallback as {role === 'student' ? 'Student' : 'Mentor'} ({email || 'user@university.edu'})
                </button>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 p-3.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Academic Role
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      >
                        <option value="student">Student</option>
                        <option value="mentor">Mentor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Department
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {role === 'student' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Student ID / Roll Number
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                          <Building className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="e.g. STU-202611"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                          required={!isLogin && role === 'student'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Mentor Employee ID
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                          <Building className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          value={mentorId}
                          onChange={(e) => setMentorId(e.target.value)}
                          placeholder="e.g. EMP-998811"
                          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                          required={!isLogin && role === 'mentor'}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  University Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-100 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Instant Sandbox Direct login button to bypass any rate limiting or email issues immediately */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSandboxBypass}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 font-semibold text-xs rounded-xl border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer"
                >
                  Offline Sandbox Login
                </button>
                <p className="text-[10px] text-center text-slate-500 mt-1.5 leading-normal">
                  Skip external SMTP checks, invalid email alerts, and Supabase auth rate-limiting.
                </p>
              </div>
            </form>

            {/* Toggle Login/Signup */}
            <div className="text-center pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-indigo-600 text-xs font-semibold hover:underline"
              >
                {isLogin ? "Don't have an account? Sign Up" : 'Already registered? Log In'}
              </button>
              <button
                type="button"
                onClick={() => { window.location.hash = '#admin/login'; }}
                className="text-slate-500 hover:text-indigo-750 text-xs font-medium inline-flex items-center justify-center gap-1 hover:underline cursor-pointer"
              >
                <Briefcase className="h-3 w-3" /> Access Separate Admin Portal
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
