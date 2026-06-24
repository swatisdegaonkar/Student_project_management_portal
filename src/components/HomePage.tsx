import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Users, 
  Bookmark, 
  Award,
  Zap,
  BookOpen,
  Send,
  HelpCircle,
  Database,
  Copy,
  Check
} from 'lucide-react';
import { UserProfile } from '../types';
import { isSupabaseConfigured, SUPABASE_SQL_SETUP, getSupabaseMentors, DEFAULT_MENTORS } from '../lib/supabase';

interface HomePageProps {
  user: UserProfile | null;
  setActiveTab: (tab: string) => void;
  stats: {
    totalProjects: number;
    approved: number;
    pending: number;
    completedMilestones: number;
  };
}

export default function HomePage({ user, setActiveTab, stats }: HomePageProps) {
  const isMentor = user?.role === 'mentor';
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [mentors, setMentors] = useState<UserProfile[]>([]);

  useEffect(() => {
    getSupabaseMentors().then(setMentors).catch(err => {
      console.error("Error loading mentors in HomePage:", err);
      // Fallback
      setMentors(DEFAULT_MENTORS.map(m => ({
        uid: m.uid,
        email: m.email,
        displayName: m.displayName,
        role: 'mentor',
        department: m.department,
        createdAt: null
      })));
    });
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 shadow-xl border border-indigo-950">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl relative z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-200 text-xs font-semibold tracking-wide backdrop-blur-xs">
            <Zap className="h-3.5 w-3.5 text-indigo-400" /> Platform Overview & Setup Live
          </div>
          
          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Academic Project Management & Reviews, Simplified.
          </h1>
          
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Welcome, <span className="text-white font-semibold">{user?.displayName || 'User'}</span>! Manage your academic projects, submit milestones, upload proposals, and interface directly with mentors inside a highly responsive workspace.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            {isMentor ? (
              <button
                onClick={() => setActiveTab('mentor')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                Access Mentor Review Panel
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('submit')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-900/30 cursor-pointer"
              >
                Submit New Project
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            
            {isMentor ? (
              <button
                onClick={() => setActiveTab('mentor')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm rounded-xl transition-all border border-white/10 cursor-pointer"
              >
                Review Active Projects
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('progress')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm rounded-xl transition-all border border-white/10 cursor-pointer"
              >
                Track Active Milestones
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Portal Activity Metrics</h2>
          <p className="text-xs text-slate-500">Real-time counts loaded from your Supabase project data</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-display">{stats.totalProjects}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Projects</div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-display">{stats.approved}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved Work</div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-display">{stats.pending}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Reviews</div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="bg-pink-50 text-pink-600 p-3 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 font-display">{stats.completedMilestones}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Milestones Passed</div>
            </div>
          </div>
        </div>
      </section>



      {/* Bento Grid Platform Core Features */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Key Features of CollabPM</h2>
          <p className="text-xs text-slate-500">Explore the advanced modules built for academic workflows</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">1</div>
              <h3 className="font-display font-bold text-slate-800 text-lg">Project Submissions</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {isMentor 
                  ? "Access and review incoming student academic proposals, analyze external repository links, and examine attached project documentation."
                  : "Upload your academic proposals, outline team participants, specify external repository links, and attach relevant materials securely."}
              </p>
            </div>
            <button 
              onClick={() => setActiveTab(isMentor ? 'mentor' : 'submit')} 
              className="text-indigo-600 hover:text-indigo-800 text-xs font-bold inline-flex items-center gap-1 mt-4 cursor-pointer text-left self-start"
            >
              {isMentor ? 'Review Proposals' : 'Go to Submissions'} <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">2</div>
              <h3 className="font-display font-bold text-slate-800 text-lg">Interactive Milestones</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {isMentor 
                  ? "Track project progression systematically. Check deliverables, verify completed milestones, and approve active phases."
                  : "Track project progression systematically. Break down deliverables into defined milestones, and toggle progress flags to keep assigned mentors appraised."}
              </p>
            </div>
            <button 
              onClick={() => setActiveTab(isMentor ? 'mentor' : 'progress')} 
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold inline-flex items-center gap-1 mt-4 cursor-pointer text-left self-start"
            >
              {isMentor ? 'Verify Milestones' : 'Track Progress'} <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">3</div>
              <h3 className="font-display font-bold text-slate-800 text-lg">Continuous Review</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {isMentor 
                  ? "Provide structured feedback comments to students. Maintain clear logs and update approval states (Approved, Requested Revision, Rejected) inside a unified panel."
                  : "Receive structured feedback comments from assigned faculty. Access full review logs and track approval states inside a unified dashboard."}
              </p>
            </div>
            <button 
              onClick={() => setActiveTab(isMentor ? 'mentor' : 'dashboard')} 
              className="text-amber-600 hover:text-amber-850 text-xs font-bold inline-flex items-center gap-1 mt-4 cursor-pointer text-left self-start"
            >
              {isMentor ? 'Provide Feedback' : 'View Student Dashboard'} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* University Department Mentors */}
      <section className="bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-900 tracking-tight">Verified Academic Mentors</h3>
            <p className="text-xs text-slate-500">Contact or submit project proposals directly to the appropriate department head</p>
          </div>
          <button
            onClick={() => setActiveTab('contact')}
            className="inline-flex items-center gap-1 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Submit General Query
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mentors.map((mentor) => {
            const MENTOR_DESCRIPTIONS: Record<string, string> = {
              'mentor-dr-sarah': "Specializes in neural network compilation, neural routing algorithms, and multi-agent AI alignment protocols.",
              'mentor-prof-alan': "Specializes in complex cryptosystems, database optimizations, discrete logic patterns, and quantum computing foundations.",
              'mentor-dr-grace': "Specializes in system compilers, structured software patterns, test-driven validation, and clean-code engineering."
            };
            
            const desc = MENTOR_DESCRIPTIONS[mentor.uid] || `Faculty Mentor in the ${mentor.department || 'Academic'} department. Available for academic project advising, milestone reviews, and feedback.`;
            const seed = mentor.uid.replace('mentor-', '') || mentor.displayName;
            const imgUrl = mentor.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
            
            return (
              <div key={mentor.uid} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img className="h-10 w-10 rounded-full border bg-slate-50" src={imgUrl} alt={mentor.displayName} referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{mentor.displayName}</h4>
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide">{mentor.department || 'Computer Science'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
                
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{mentor.email}</span>
                  {mentor.mentorId && (
                    <span className="bg-slate-50 px-1.5 py-0.5 rounded border text-[9px] font-semibold text-slate-600 uppercase">
                      ID: {mentor.mentorId}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
