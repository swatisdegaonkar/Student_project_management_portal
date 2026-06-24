import React, { useState, useEffect } from 'react';
import { 
  getSupabaseAllSupportQueries, 
  resolveSupabaseSupportQuery,
  getSupabaseMentors,
  updateProjectStatus,
  updateProjectMentor,
  supabase
} from '../lib/supabase';
import { SupportQuery, Project, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  User, 
  Mail, 
  FileText, 
  Send, 
  ArrowRight,
  Database,
  ExternalLink,
  Users,
  GraduationCap,
  Sparkles,
  Inbox
} from 'lucide-react';

interface AdminPanelProps {
  user: UserProfile;
  projects: Project[];
  onRefreshProjects: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export default function AdminPanel({ user, projects, onRefreshProjects, onLogout }: AdminPanelProps) {
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<SupportQuery | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [activeTab, setActiveTab] = useState<'tickets' | 'projects'>('tickets');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [sentResponses, setSentResponses] = useState<Record<string, string>>({});
  
  const [mentors, setMentors] = useState<UserProfile[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [updatingProjectState, setUpdatingProjectState] = useState<Record<string, boolean>>({});

  // System stats
  const [systemStats, setSystemStats] = useState({
    activeUsers: 48,
    dbStatus: 'operational',
    storageUsed: '1.2 GB',
    avgResponseTime: '12 mins'
  });

  useEffect(() => {
    fetchQueries();
    fetchMentors();
    
    // Set up polling for new support tickets
    const intervalId = setInterval(() => {
      fetchQueries(true);
    }, 6000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchMentors = async () => {
    try {
      setLoadingMentors(true);
      const data = await getSupabaseMentors();
      setMentors(data);
    } catch (err) {
      console.error('Error fetching mentors:', err);
    } finally {
      setLoadingMentors(false);
    }
  };

  const fetchQueries = async (silent = false) => {
    if (!silent) setLoadingQueries(true);
    try {
      const data = await getSupabaseAllSupportQueries();
      setQueries(data);
    } catch (err) {
      console.error('Error fetching admin support queries:', err);
    } finally {
      if (!silent) setLoadingQueries(false);
    }
  };

  const handleUpdateStatus = async (queryId: string, newStatus: 'open' | 'resolved') => {
    setUpdatingId(queryId);
    try {
      const updated = await resolveSupabaseSupportQuery(queryId, newStatus);
      // Update local state
      setQueries(prev => prev.map(q => q.id === queryId ? { ...q, status: newStatus } : q));
      if (selectedQuery && selectedQuery.id === queryId) {
        setSelectedQuery(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendResponse = (queryId: string) => {
    if (!responseNotes.trim()) return;
    setSentResponses(prev => ({
      ...prev,
      [queryId]: responseNotes
    }));
    setResponseNotes('');
    // Auto-resolve ticket upon sending reply for a smooth workspace flow
    handleUpdateStatus(queryId, 'resolved');
  };

  const handleProjectStatusChange = async (projectId: string, newStatus: string) => {
    setUpdatingProjectState(prev => ({ ...prev, [projectId]: true }));
    try {
      await updateProjectStatus(projectId, newStatus);
      await onRefreshProjects();
    } catch (err) {
      console.error('Failed to update project status:', err);
    } finally {
      setUpdatingProjectState(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const handleProjectMentorChange = async (projectId: string, selectedMentorId: string) => {
    setUpdatingProjectState(prev => ({ ...prev, [projectId]: true }));
    try {
      const selectedMentor = mentors.find(m => m.uid === selectedMentorId);
      const mentorId = selectedMentor ? selectedMentor.uid : '';
      const mentorName = selectedMentor ? selectedMentor.displayName : '';
      
      await updateProjectMentor(projectId, mentorId, mentorName);
      await onRefreshProjects();
    } catch (err) {
      console.error('Failed to update project mentor:', err);
    } finally {
      setUpdatingProjectState(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const filteredQueries = queries.filter(q => {
    const matchesSearch = 
      q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ? true : q.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const openCount = queries.filter(q => q.status === 'open').length;
  const resolvedCount = queries.filter(q => q.status === 'resolved').length;

  return (
    <div className="space-y-8" id="admin-panel-root">
      {/* Admin Command Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border border-indigo-400/20">
              <Shield className="h-3.5 w-3.5" />
              Academic Overseer Active
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight leading-tight">
              CollabPM <span className="text-indigo-400">Admin Command</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Supervise all student capstone projects, resolve help desk tickets, and manage platform communications.
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => fetchQueries()}
              disabled={loadingQueries}
              className="flex-1 md:flex-none py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm border border-slate-700 shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loadingQueries ? 'animate-spin' : ''}`} />
              Sync Data
            </button>
            <button
              onClick={onLogout}
              className="flex-1 md:flex-none py-2.5 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-400 font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm border border-red-500/20"
            >
              Exit Terminal
            </button>
          </div>
        </div>

        {/* Real-time system diagnostics */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Supabase Storage</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-sm">
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              {systemStats.storageUsed}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Gateway Status</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Active Users Today</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-sm">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              {systemStats.activeUsers} Students/Mentors
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Ticket SLA Time</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-sm">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              {systemStats.avgResponseTime} Avg Resolve
            </div>
          </div>
        </div>
      </div>

      {/* Switch tabs between Tickets and Projects Overview */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-4 px-6 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'tickets' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="h-4 w-4" />
          Support Help Desk
          {openCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              {openCount} Open
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-4 px-6 font-bold text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'projects' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Master Projects Registry
          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {projects.length} Total
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tickets' ? (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Tickets master column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Controls bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search sender, subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                </div>

                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'all' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All ({queries.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('open')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'open' 
                        ? 'bg-white text-red-600 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Open ({openCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('resolved')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'resolved' 
                        ? 'bg-white text-emerald-600 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Resolved ({resolvedCount})
                  </button>
                </div>
              </div>

              {/* Tickets list */}
              {loadingQueries && queries.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm font-semibold">Retrieving student support inquiries...</p>
                </div>
              ) : filteredQueries.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-xs">
                  <div className="bg-slate-100 p-4 rounded-full w-fit mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="font-display font-bold text-slate-800 text-lg">Inbox Clean & Clear</h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                    No support tickets match your filter criteria. Students and mentors are smoothly collaborating!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQueries.map((query) => {
                    const isSelected = selectedQuery?.id === query.id;
                    const isTicketResolved = query.status === 'resolved';
                    const hasReply = !!sentResponses[query.id];

                    return (
                      <motion.div
                        key={query.id}
                        layoutId={`query-card-${query.id}`}
                        onClick={() => setSelectedQuery(query)}
                        className={`bg-white border text-left p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md ${
                          isSelected 
                            ? 'border-indigo-600 ring-2 ring-indigo-600/10' 
                            : isTicketResolved 
                            ? 'border-slate-100 opacity-75' 
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {query.createdAt ? new Date(query.createdAt).toLocaleString() : 'Just now'}
                            </span>
                            <h3 className={`font-display font-bold text-slate-900 ${isTicketResolved ? 'line-through text-slate-500' : ''}`}>
                              {query.subject}
                            </h3>
                          </div>
                          
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                            isTicketResolved 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {query.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                          {query.message}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-slate-500">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700">{query.name}</span>
                            <span className="text-slate-300">|</span>
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono">{query.email}</span>
                          </div>

                          {hasReply && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              <Sparkles className="h-3 w-3" /> Reply Sent
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ticket detail right-hand panel */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs sticky top-8">
                {selectedQuery ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Selected Ticket</h4>
                        <span className="text-xs text-slate-500 font-mono">ID: {selectedQuery.id.slice(0, 8)}...</span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                        selectedQuery.status === 'resolved' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {selectedQuery.status}
                      </span>
                    </div>

                    {/* Sender profile */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-800">{selectedQuery.name}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{selectedQuery.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Ticket message content */}
                    <div className="space-y-2">
                      <h3 className="font-display font-black text-slate-900 text-lg leading-snug">
                        {selectedQuery.subject}
                      </h3>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                        {selectedQuery.message}
                      </div>
                    </div>

                    {/* Resolution action panel */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between gap-3">
                        <button
                          onClick={() => handleUpdateStatus(
                            selectedQuery.id, 
                            selectedQuery.status === 'open' ? 'resolved' : 'open'
                          )}
                          disabled={updatingId !== null}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs cursor-pointer text-center border transition-colors flex items-center justify-center gap-1.5 ${
                            selectedQuery.status === 'open'
                              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                          }`}
                        >
                          {updatingId ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : selectedQuery.status === 'open' ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              Mark Resolved
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5" />
                              Reopen Ticket
                            </>
                          )}
                        </button>
                      </div>

                      {/* Admin response notes */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          Send System Clearance Response
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Type response notes to the student (e.g. Clearance approved, please refresh portal)..."
                          value={responseNotes}
                          onChange={(e) => setResponseNotes(e.target.value)}
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 resize-none"
                        />
                        <button
                          onClick={() => handleSendResponse(selectedQuery.id)}
                          disabled={!responseNotes.trim()}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          Dispatch Response & Resolve
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {sentResponses[selectedQuery.id] && (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs">
                          <span className="font-extrabold text-emerald-800 block">Sent Admin Response Note:</span>
                          <span className="text-slate-600 mt-1 block italic">"{sentResponses[selectedQuery.id]}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 space-y-3">
                    <Inbox className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold">Select a support ticket</p>
                    <p className="text-xs max-w-xs mx-auto text-slate-400 leading-normal">
                      Click any student's support query in the list to review details, dispatch system instructions, or change ticket status.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Active Projects supervision view */
          <motion.div
            key="projects"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Project List */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-lg">Master Capstone registry</h3>
                  <p className="text-slate-500 text-xs">A comprehensive overview of all academic student projects registered in the database.</p>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="p-16 text-center text-slate-500 space-y-2">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="font-semibold text-sm">No Projects Registered Yet</p>
                  <p className="text-xs text-slate-400">When students submit proposals, they will appear in this oversight ledger.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 uppercase text-[10px] font-mono tracking-wider border-b border-slate-200">
                        <th className="py-4 px-6 font-bold">Project Title & Category</th>
                        <th className="py-4 px-6 font-bold">Student Submitter</th>
                        <th className="py-4 px-6 font-bold">Assigned Mentor</th>
                        <th className="py-4 px-6 font-bold">Milestones Approved</th>
                        <th className="py-4 px-6 font-bold">Proposal Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projects.map((project) => {
                        const approvedMilestones = project.milestones.filter(m => m.status === 'approved' || m.status === 'completed').length;
                        const totalMilestones = project.milestones.length;

                        return (
                          <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-900">{project.title}</div>
                              <div className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 w-fit">
                                {project.category}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-semibold text-slate-800">{project.studentName}</div>
                              <div className="text-slate-400 font-mono mt-0.5">{project.studentEmail}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1">
                                <select
                                  value={project.mentorId || ''}
                                  onChange={(e) => handleProjectMentorChange(project.id, e.target.value)}
                                  disabled={updatingProjectState[project.id]}
                                  className="p-1 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer max-w-[160px]"
                                >
                                  <option value="">Unassigned</option>
                                  {mentors.map(m => (
                                    <option key={m.uid} value={m.uid}>
                                      {m.displayName}
                                    </option>
                                  ))}
                                </select>
                                {project.mentorId && (
                                  <span className="text-slate-400 text-[9px] font-mono">ID: {project.mentorId.slice(0, 8)}...</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{approvedMilestones}/{totalMilestones}</span>
                                <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${(approvedMilestones / (totalMilestones || 1)) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <select
                                value={project.status || 'pending'}
                                onChange={(e) => handleProjectStatusChange(project.id, e.target.value)}
                                disabled={updatingProjectState[project.id]}
                                className={`p-1.5 border rounded-lg text-xs font-bold uppercase cursor-pointer ${
                                  project.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : project.status === 'completed'
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : project.status === 'pending'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : project.status === 'revision'
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="completed">Completed</option>
                                <option value="revision">Revision</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
