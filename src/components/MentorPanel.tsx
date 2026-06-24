import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  MessageSquare, 
  ExternalLink, 
  FileText, 
  AlertTriangle, 
  FileCheck2,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  BookmarkCheck,
  Github,
  Link,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { Project, UserProfile } from '../types';
import { addSupabaseMentorFeedback as addMentorFeedback, updateSupabaseMilestoneStatus } from '../lib/supabase';

interface MentorPanelProps {
  user: UserProfile;
  projects: Project[];
  onRefreshProjects: () => void;
}

export default function MentorPanel({ user, projects, onRefreshProjects }: MentorPanelProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingMilestoneId, setUpdatingMilestoneId] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  // Filters specific to this logged in mentor
  const mentorProjects = projects.filter(p => p.mentorId === user.uid);
  const getCompletedMilestonesCount = (project: Project) => project.milestones.filter(m => m.status === 'completed' || m.status === 'approved').length;
  const isProjectFullyCompleted = (project: Project) => project.milestones.length > 0 && getCompletedMilestonesCount(project) === project.milestones.length;
  const getDisplayStatus = (project: Project): Project['status'] => {
    return project.status === 'approved' && isProjectFullyCompleted(project) ? 'completed' : project.status;
  };
  const pendingCount = mentorProjects.filter(p => p.status === 'pending').length;
  const completedCount = mentorProjects.filter(p => getDisplayStatus(p) === 'completed').length;
  const approvedCount = mentorProjects.filter(p => getDisplayStatus(p) === 'approved').length;
  const revisionCount = mentorProjects.filter(p => p.status === 'revision').length;

  const handleUpdateMilestoneStatus = async (milestoneId: string, newStatus: 'pending' | 'completed' | 'approved' | 'rejected') => {
    if (!selectedProject) return;
    setUpdatingMilestoneId(milestoneId);
    setError(null);
    setSuccess(null);

    const updatedMilestones = selectedProject.milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: newStatus,
          completedAt: (newStatus === 'approved' || newStatus === 'completed') ? (m.completedAt || new Date().toISOString()) : null
        };
      }
      return m;
    });

    try {
      await updateSupabaseMilestoneStatus(selectedProject.id, updatedMilestones);
      setSuccess(`Phase status updated to ${newStatus.toUpperCase()} successfully!`);
      onRefreshProjects();
    } catch (err: any) {
      console.error(err);
      setError('Failed to update phase status.');
    } finally {
      setUpdatingMilestoneId(null);
    }
  };

  const handleReviewSubmit = async (status: Project['status']) => {
    if (!selectedProject) return;
    if (!comment.trim()) {
      setError('Please provide review comments or directions for the student.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await addMentorFeedback(
        selectedProject.id,
        user.uid,
        user.displayName,
        comment,
        status
      );

      setSuccess(`Successfully marked project as: ${status.toUpperCase()}!`);
      setComment('');
      onRefreshProjects();
    } catch (err: any) {
      setError(err.message || 'Error occurred while updating review state.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Faculty Mentor Panel</h2>
          <p className="text-xs text-slate-500">Inspect student proposals, milestones, repository linkages, and issue approvals</p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4" /> Secure Faculty Clearance Mode
        </div>
      </div>

      {/* Mentor Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs">
          <div className="text-2xl font-extrabold text-slate-800 font-display">{mentorProjects.length}</div>
          <div className="text-xs text-slate-400 font-medium">Assigned Proposals</div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs border-l-4 border-l-blue-500">
          <div className="text-2xl font-extrabold text-blue-700 font-display">{pendingCount}</div>
          <div className="text-xs text-slate-400 font-medium">Pending Review</div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs border-l-4 border-l-emerald-500">
          <div className="text-2xl font-extrabold text-emerald-700 font-display">{approvedCount}</div>
          <div className="text-xs text-slate-400 font-medium">In Development</div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs border-l-4 border-l-indigo-500">
          <div className="text-2xl font-extrabold text-indigo-700 font-display">{completedCount}</div>
          <div className="text-xs text-slate-400 font-medium">Completed</div>
        </div>

        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-xs border-l-4 border-l-amber-500">
          <div className="text-2xl font-extrabold text-amber-600 font-display">{revisionCount}</div>
          <div className="text-xs text-slate-400 font-medium">Revisions Requested</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Submissions List */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="font-display font-bold text-sm text-slate-700 uppercase tracking-wider">Submissions Queue</h3>

          {mentorProjects.length === 0 ? (
            <div className="bg-white border border-slate-100 p-8 rounded-3xl text-center space-y-3">
              <FolderOpen className="h-10 w-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-slate-800">No Student Proposals</h4>
                <p className="text-slate-400 text-xs max-w-xs mx-auto">Students can select you as their faculty mentor when filling out their submission forms.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {mentorProjects.map((project) => {
                const isActive = selectedProject?.id === project.id;
                const displayStatus = getDisplayStatus(project);
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setError(null);
                      setSuccess(null);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isActive 
                        ? 'border-indigo-600 bg-indigo-50/20 shadow-xs' 
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                          {project.category}
                        </span>
                        
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          displayStatus === 'completed'
                            ? 'bg-indigo-500'
                            : displayStatus === 'approved' 
                            ? 'bg-emerald-500' 
                            : displayStatus === 'rejected'
                            ? 'bg-red-500'
                            : displayStatus === 'revision'
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-blue-500'
                        }`} />
                      </div>

                      <div>
                        <h4 className="font-display font-bold text-sm text-slate-800 line-clamp-1">{project.title}</h4>
                        <span className="text-[10px] text-slate-400">By: {project.studentName} ({project.studentEmail})</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>Milestones: {getCompletedMilestonesCount(project)}/{project.milestones.length}</span>
                        <span className="capitalize">{displayStatus === 'pending' ? 'under review' : displayStatus}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Detailed review area */}
        <div className="lg:col-span-7">
          {selectedProject ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              
              {/* Header and status badge */}
              <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-50">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md">
                    {selectedProject.category}
                  </span>
                  <h3 className="font-display font-black text-xl text-slate-800 mt-2">{selectedProject.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Submitted by: <span className="font-bold text-slate-700">{selectedProject.studentName}</span> • {selectedProject.studentEmail}
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                  getDisplayStatus(selectedProject) === 'completed'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-100'
                    : getDisplayStatus(selectedProject) === 'approved' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                    : getDisplayStatus(selectedProject) === 'rejected'
                    ? 'bg-red-50 text-red-800 border-red-100'
                    : getDisplayStatus(selectedProject) === 'revision'
                    ? 'bg-amber-50 text-amber-800 border-amber-100'
                    : 'bg-blue-50 text-blue-800 border-blue-100'
                }`}>
                  {getDisplayStatus(selectedProject) === 'pending' ? 'Pending Review' : getDisplayStatus(selectedProject)}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Proposal</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  {selectedProject.description}
                </p>
              </div>

              {/* Attachments & links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* File Attachment */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Documents</span>
                  {selectedProject.attachmentUrl ? (
                    <a 
                      href={selectedProject.attachmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200/60 text-slate-700 hover:text-indigo-600 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold truncate">{selectedProject.attachmentName || 'Proposal Document'}</span>
                        <span className="block text-[9px] text-slate-400">Click to view/download</span>
                      </div>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic block p-1">No file attached</span>
                  )}
                </div>

                {/* Code Links */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Interactive Links</span>
                  <div className="flex flex-col gap-1.5">
                    {selectedProject.githubUrl ? (
                      <a 
                        href={selectedProject.githubUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between text-xs text-slate-600 hover:text-indigo-600 px-1 py-0.5 font-medium"
                      >
                        <span className="truncate max-w-[150px]">GitHub Repository</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No GitHub URL</span>
                    )}

                    {selectedProject.demoUrl ? (
                      <a 
                        href={selectedProject.demoUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between text-xs text-slate-600 hover:text-indigo-600 px-1 py-0.5 font-medium"
                      >
                        <span className="truncate max-w-[150px]">Live Deployment</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No Demo URL</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Milestones Checklist status */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Milestones Checklist</h4>
                <div className="grid grid-cols-1 gap-3">
                  {selectedProject.milestones.map((milestone) => (
                    <div 
                      key={milestone.id} 
                      className={`p-4 rounded-2xl border transition-all text-xs ${
                        milestone.status === 'approved'
                          ? 'bg-emerald-50/20 border-emerald-200'
                          : milestone.status === 'rejected'
                          ? 'bg-rose-50/20 border-rose-100'
                          : milestone.status === 'completed'
                          ? 'bg-amber-50/20 border-amber-200'
                          : 'bg-slate-50/50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          {/* Phase Status Badge */}
                          {milestone.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider">
                              <Check className="h-2.5 w-2.5" /> Approved
                            </span>
                          )}
                          {milestone.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-extrabold uppercase tracking-wider">
                              <X className="h-2.5 w-2.5" /> Rejected
                            </span>
                          )}
                          {milestone.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
                              <Clock className="h-2.5 w-2.5" /> Submitted
                            </span>
                          )}
                          {milestone.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                              In Progress
                            </span>
                          )}

                          <span className={`font-bold truncate text-slate-800 ${milestone.status === 'approved' ? 'line-through text-slate-400' : ''}`}>
                            {milestone.title}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold font-mono whitespace-nowrap pt-1">
                          Due: {milestone.dueDate}
                        </span>
                      </div>
                      
                      {milestone.description && (
                        <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                          {milestone.description}
                        </p>
                      )}

                      {milestone.accomplishments && (
                        <div className="mt-2.5 bg-white border border-indigo-100/30 p-2.5 rounded-xl">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Student Accomplishments Log</p>
                          <p className="text-slate-600 text-xs mt-1 italic leading-relaxed">
                            "{milestone.accomplishments}"
                          </p>
                        </div>
                      )}

                      {/* Deliverables and Attachments specifically for this milestone phase */}
                      {(milestone.attachmentUrl || milestone.githubUrl || milestone.demoUrl) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex flex-wrap gap-2 items-center">
                          {milestone.attachmentUrl && (
                            <a 
                              href={milestone.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-[10px] rounded border border-indigo-100/30 transition-all cursor-pointer"
                            >
                              <FileText className="h-2.5 w-2.5 text-indigo-500" />
                              <span className="max-w-[120px] truncate">{milestone.attachmentName || 'Phase Document'}</span>
                              <ExternalLink className="h-2 w-2" />
                            </a>
                          )}
                          {milestone.githubUrl && (
                            <a 
                              href={milestone.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] rounded border border-slate-200/55 transition-all cursor-pointer"
                            >
                              <Github className="h-2.5 w-2.5" />
                              <span>Repository</span>
                              <ExternalLink className="h-2 w-2" />
                            </a>
                          )}
                          {milestone.demoUrl && (
                            <a 
                              href={milestone.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[10px] rounded border border-emerald-100/30 transition-all cursor-pointer"
                            >
                              <Link className="h-2.5 w-2.5 text-emerald-500" />
                              <span>Live Demo</span>
                              <ExternalLink className="h-2 w-2" />
                            </a>
                          )}
                        </div>
                      )}

                      {milestone.completedAt && (
                        <div className="text-[9px] text-slate-400 font-medium font-mono mt-2">
                          Submitted on {new Date(milestone.completedAt).toLocaleDateString()}
                        </div>
                      )}

                      {/* Mentor Decision Controls on specific phase */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Phase Decision:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateMilestoneStatus(milestone.id, 'approved')}
                            disabled={updatingMilestoneId === milestone.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                              milestone.status === 'approved'
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            <Check className="h-3 w-3 shrink-0" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMilestoneStatus(milestone.id, 'rejected')}
                            disabled={updatingMilestoneId === milestone.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                              milestone.status === 'rejected'
                                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/10'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            <X className="h-3 w-3 shrink-0" /> Reject
                          </button>
                          {(milestone.status === 'approved' || milestone.status === 'rejected' || milestone.status === 'completed') && (
                            <button
                              type="button"
                              onClick={() => handleUpdateMilestoneStatus(milestone.id, 'pending')}
                              disabled={updatingMilestoneId === milestone.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all cursor-pointer"
                              title="Reset to In Progress"
                            >
                              <RefreshCw className="h-2.5 w-2.5 shrink-0" /> Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action review form */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isProjectFullyCompleted(selectedProject) ? 'Project Completion Summary' : 'Leave Faculty Feedback'}
                </h4>
                
                {error && <div className="text-xs text-red-600 font-medium">{error}</div>}
                {success && <div className="text-xs text-emerald-600 font-medium">{success}</div>}

                {isProjectFullyCompleted(selectedProject) ? (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-800">
                    All project milestones are complete. This project now appears as Completed on mentor and student dashboards.
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter your professional directions, revisions required or grading notes..."
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                  />
                )}

                {!isProjectFullyCompleted(selectedProject) && (
                <div className="flex flex-wrap items-center gap-2.5 justify-end">
                  <button
                    onClick={() => handleReviewSubmit('revision')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                    Request Revision
                  </button>

                  <button
                    onClick={() => handleReviewSubmit('rejected')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Reject Proposal
                  </button>

                  <button
                    onClick={() => handleReviewSubmit('approved')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-100 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Approve Proposal
                  </button>

                </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-slate-400 space-y-3.5">
              <FolderOpen className="h-10 w-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-slate-800">Select student proposal to inspect</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Click on any active item in your Submissions Queue to view files, links, milestones, and record approvals.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
