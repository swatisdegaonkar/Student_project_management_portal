import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FolderGit, 
  User, 
  Users, 
  Eye, 
  Plus,
  MessageSquare,
  FileText
} from 'lucide-react';
import { Project, UserProfile } from '../types';

interface StudentDashboardProps {
  user: UserProfile;
  projects: Project[];
  setActiveTab: (tab: string) => void;
  setSelectedProject: (project: Project) => void;
}

export default function StudentDashboard({ user, projects, setActiveTab, setSelectedProject }: StudentDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewingFeedbackFor, setViewingFeedbackFor] = useState<Project | null>(null);

  const categories = [
    'Web Development',
    'Mobile Application',
    'Artificial Intelligence / ML',
    'Data Science & Analytics',
    'Internet of Things (IoT)',
    'Cybersecurity & Cryptography',
    'Cloud Architecture',
    'Research / Scientific'
  ];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const completedCount = project.milestones.filter(m => m.status === 'completed' || m.status === 'approved').length;
    const derivedStatus = project.status === 'approved' && project.milestones.length > 0 && completedCount === project.milestones.length ? 'completed' : project.status;
    const matchesStatus = statusFilter === 'all' || derivedStatus === statusFilter;
    const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getCompletedMilestonesCount = (project: Project) => {
    return project.milestones.filter(m => m.status === 'completed' || m.status === 'approved').length;
  };

  const isProjectFullyCompleted = (project: Project) => {
    return project.milestones.length > 0 && getCompletedMilestonesCount(project) === project.milestones.length;
  };

  const getDisplayStatus = (project: Project): Project['status'] => {
    return project.status === 'approved' && isProjectFullyCompleted(project) ? 'completed' : project.status;
  };

  const currentProject = projects[0];
  const currentCompletedCount = currentProject ? getCompletedMilestonesCount(currentProject) : 0;
  const currentTotalCount = currentProject?.milestones.length || 0;
  const currentProgressRatio = currentTotalCount > 1 ? Math.max(0, currentCompletedCount - 1) / (currentTotalCount - 1) : 0;
  const currentReachedDesign = currentCompletedCount >= 2;
  const currentReachedDevelopment = currentCompletedCount >= 3;
  const currentIsComplete = currentProject ? isProjectFullyCompleted(currentProject) || currentProject.status === 'completed' : false;
  const currentPhaseLabel = currentIsComplete
    ? 'Completed'
    : currentReachedDevelopment
    ? 'Development'
    : currentReachedDesign
    ? 'Design'
    : currentProject?.status === 'approved'
    ? 'Approved'
    : 'Proposal Review';

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
            <AlertCircle className="h-3.5 w-3.5" /> Rejected
          </span>
        );
      case 'revision':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
            <Clock className="h-3.5 w-3.5" /> Revision Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <Clock className="h-3.5 w-3.5" /> Under Review
          </span>
        );
    }
  };

  const handleTrackProject = (project: Project) => {
    setSelectedProject(project);
    setActiveTab('progress');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with quick summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Student Dashboard</h2>
          <p className="text-xs text-slate-500">Monitor proposal statuses, complete active milestones and respond to feedback</p>
        </div>

        <button
          onClick={() => setActiveTab('submit')}
          className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Submit New Project
        </button>
      </div>

      {/* Statistics Row (Matching Professional Polish Theme) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Projects</p>
          <p className="text-3xl font-extrabold text-slate-900 font-display">
            {String(projects.length).padStart(2, '0')}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Upcoming Milestones</p>
          <p className="text-3xl font-extrabold text-amber-600 font-display">
            {String(projects.reduce((acc, p) => acc + p.milestones.filter(m => m.status === 'pending').length, 0)).padStart(2, '0')}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Approval Status</p>
          <p className="text-3xl font-extrabold text-emerald-600 font-display">
            {projects.length > 0 ? `${Math.round((projects.filter(p => p.status === 'approved' || p.status === 'completed').length / projects.length) * 100)}%` : '0%'}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Days to Deadline</p>
          <p className="text-3xl font-extrabold text-slate-900 font-display">14</p>
        </div>
      </div>

      {/* Progress Tracking Banner (Matching Professional Polish Theme) */}
      {projects.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-indigo-600 tracking-wider">Current Project Overview</span>
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base mt-0.5">
                {projects[0].title}
              </h3>
            </div>
            <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/30">
              Phase: {currentPhaseLabel}
            </span>
          </div>

          <div className="relative flex items-center justify-between px-2 sm:px-6">
            <div className="absolute h-1 bg-slate-100 w-[90%] left-[5%] top-1/2 -translate-y-1/2 z-0"></div>
            <div 
              className="absolute h-1 bg-indigo-600 top-1/2 -translate-y-1/2 z-0 transition-all duration-500"
              style={{ 
                width: currentIsComplete
                  ? '90%'
                  : `${Math.max(20, Math.min(85, 20 + 65 * currentProgressRatio))}%`,
                left: '5%'
              }}
            ></div>

            <div className="z-10 flex flex-col items-center gap-1.5 bg-white px-1 sm:px-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 border-4 border-white flex items-center justify-center text-white text-xs font-bold shadow-xs">✓</div>
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500">Proposal</span>
            </div>
            <div className="z-10 flex flex-col items-center gap-1.5 bg-white px-1 sm:px-2">
              <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-xs font-bold shadow-xs ${
                currentReachedDesign
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {currentReachedDesign ? 'OK' : '2'}
              </div>
              <span className={`text-[9px] uppercase font-extrabold tracking-wider ${currentReachedDesign ? 'text-indigo-600' : 'text-slate-400'}`}>Design</span>
            </div>
            <div className="z-10 flex flex-col items-center gap-1.5 bg-white px-1 sm:px-2">
              <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-xs font-bold shadow-xs ${
                currentReachedDevelopment
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {currentReachedDevelopment ? 'OK' : '3'}
              </div>
              <span className={`text-[9px] uppercase font-extrabold tracking-wider ${currentReachedDevelopment ? 'text-indigo-600' : 'text-slate-400'}`}>Development</span>
            </div>
            <div className="z-10 flex flex-col items-center gap-1.5 bg-white px-1 sm:px-2">
              <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-xs font-bold shadow-xs ${
                currentIsComplete
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {currentIsComplete ? 'OK' : '4'}
              </div>
              <span className={`text-[9px] uppercase font-extrabold tracking-wider ${currentIsComplete ? 'text-indigo-600' : 'text-slate-400'}`}>Testing</span>
            </div>
            <div className="z-10 flex flex-col items-center gap-1.5 bg-white px-1 sm:px-2">
              <div className={`w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-xs font-bold shadow-xs ${
                currentIsComplete ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>{currentIsComplete ? 'OK' : '5'}</div>
              <span className={`text-[9px] uppercase font-extrabold tracking-wider text-center ${currentIsComplete ? 'text-indigo-600' : 'text-slate-400'}`}>Final Review</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[280px] relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search submitted projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Under Review</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="revision">Revision Required</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white outline-none max-w-[200px]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects List Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="h-14 w-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
            <FolderGit className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-extrabold text-lg text-slate-800">No Projects Found</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {projects.length === 0 
                ? "You haven't registered any academic project submissions yet. Get started by submitting a project proposal." 
                : "No projects match your active search terms or filter configurations."}
            </p>
          </div>
          {projects.length === 0 && (
            <button
              onClick={() => setActiveTab('submit')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer"
            >
              Submit Proposal Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => {
            const completed = getCompletedMilestonesCount(project);
            const total = project.milestones.length;
            const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div 
                key={project.id} 
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Category and Status Bar */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100/30">
                      {project.category}
                    </span>
                    {getStatusBadge(getDisplayStatus(project))}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="font-display font-extrabold text-lg text-slate-800 tracking-tight line-clamp-1">
                      {project.title}
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  {/* Mentor & Team */}
                  <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-50 py-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-slate-50 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Assigned Mentor</span>
                        <span className="font-semibold text-slate-800 truncate block max-w-[140px]">{project.mentorName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-slate-50 text-slate-400">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium">Project Team</span>
                        <span className="font-semibold text-slate-800 truncate block max-w-[140px]">{project.teamMembers || 'Individual'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Milestones Mini Tracker */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Milestones Progression</span>
                      <span className="text-indigo-600">{completed} / {total} Completed</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-5 mt-5 border-t border-slate-50">
                  {/* Left: View Feedback trigger */}
                  <div>
                    {project.feedback && project.feedback.length > 0 ? (
                      <button
                        onClick={() => setViewingFeedbackFor(project)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {project.feedback.length} Mentor Feedback Log{project.feedback.length > 1 ? 's' : ''}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No feedback registered yet</span>
                    )}
                  </div>

                  {/* Right: Detailed track button */}
                  <button
                    onClick={() => handleTrackProject(project)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> Full Progress Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mentor Feedback Modal */}
      {viewingFeedbackFor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col justify-between border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-display font-extrabold text-lg text-slate-900">Faculty Review Feedback</h3>
                <p className="text-xs text-slate-500 line-clamp-1">{viewingFeedbackFor.title}</p>
              </div>
              <button 
                onClick={() => setViewingFeedbackFor(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {viewingFeedbackFor.feedback.map((item, index) => (
                <div key={item.id || index} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                        {item.mentorName.split(' ')[0][0]}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800">{item.mentorName}</span>
                        <span className="block text-[9px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      item.status === 'approved' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : item.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border-red-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-3 rounded-xl border border-slate-100">
                    "{item.comment}"
                  </p>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-50 flex justify-end">
              <button
                onClick={() => setViewingFeedbackFor(null)}
                className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
