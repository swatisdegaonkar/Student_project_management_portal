import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Bookmark, 
  Sparkles, 
  AlertCircle, 
  HelpCircle, 
  FolderKanban, 
  MessageSquare, 
  ArrowRight, 
  Pencil, 
  X, 
  Save,
  FileText,
  Github,
  Link,
  UploadCloud,
  ExternalLink,
  Check,
  XCircle
} from 'lucide-react';
import { Project, Milestone, UserProfile } from '../types';
import { updateSupabaseMilestoneStatus as updateMilestoneStatus, uploadSupabaseAttachment } from '../lib/supabase';

interface ProgressTrackingProps {
  user: UserProfile;
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  onRefreshProjects: () => void;
  setActiveTab: (tab: string) => void;
}

export default function ProgressTracking({ 
  user, 
  projects, 
  selectedProject, 
  setSelectedProject, 
  onRefreshProjects,
  setActiveTab
}: ProgressTrackingProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newPhaseTitle, setNewPhaseTitle] = useState('');
  const [newPhaseDesc, setNewPhaseDesc] = useState('');
  const [newPhaseDueDate, setNewPhaseDueDate] = useState('');
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [addingPhaseLoading, setAddingPhaseLoading] = useState(false);
  const [addPhaseError, setAddPhaseError] = useState<string | null>(null);

  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editGithubUrl, setEditGithubUrl] = useState('');
  const [editDemoUrl, setEditDemoUrl] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editAttachmentUrl, setEditAttachmentUrl] = useState('');
  const [editAttachmentName, setEditAttachmentName] = useState('');
  const [editAccomplishments, setEditAccomplishments] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // States for adding next phase
  const [newPhaseGithubUrl, setNewPhaseGithubUrl] = useState('');
  const [newPhaseDemoUrl, setNewPhaseDemoUrl] = useState('');
  const [newPhaseFile, setNewPhaseFile] = useState<File | null>(null);

  const handleStartEdit = (milestone: Milestone) => {
    setEditingMilestoneId(milestone.id);
    setEditTitle(milestone.title);
    setEditDesc(milestone.description || '');
    setEditDueDate(milestone.dueDate);
    setEditGithubUrl(milestone.githubUrl || '');
    setEditDemoUrl(milestone.demoUrl || '');
    setEditAttachmentUrl(milestone.attachmentUrl || '');
    setEditAttachmentName(milestone.attachmentName || '');
    setEditAccomplishments(milestone.accomplishments || '');
    setEditFile(null);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingMilestoneId(null);
    setEditFile(null);
    setEditError(null);
  };

  const handleSaveEdit = async (milestoneId: string) => {
    if (!selectedProject) return;
    if (!editTitle.trim()) {
      setEditError('Title is required.');
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      let finalAttachmentUrl = editAttachmentUrl;
      let finalAttachmentName = editAttachmentName;

      if (editFile) {
        try {
          const uploadRes = await uploadSupabaseAttachment(selectedProject.id, editFile);
          finalAttachmentUrl = uploadRes.url;
          finalAttachmentName = uploadRes.name;
        } catch (uploadErr) {
          console.error("Error uploading milestone attachment:", uploadErr);
          setEditError("Failed to upload the document. Please try again.");
          setEditLoading(false);
          return;
        }
      }

      const updatedMilestones = selectedProject.milestones.map(m => {
        if (m.id === milestoneId) {
          const hasDeliverables = editAccomplishments.trim().length > 0 || editGithubUrl.trim().length > 0 || editDemoUrl.trim().length > 0 || finalAttachmentUrl.trim().length > 0;
          let newStatus = m.status;
          if (user.role === 'student' && hasDeliverables && (m.status === 'pending' || m.status === 'rejected')) {
            newStatus = 'completed';
          }
          return {
            ...m,
            title: editTitle.trim(),
            description: editDesc.trim(),
            dueDate: editDueDate,
            githubUrl: editGithubUrl.trim() || undefined,
            demoUrl: editDemoUrl.trim() || undefined,
            attachmentUrl: finalAttachmentUrl || undefined,
            attachmentName: finalAttachmentName || undefined,
            accomplishments: editAccomplishments.trim() || undefined,
            status: newStatus,
            completedAt: (newStatus === 'completed' && !m.completedAt) ? new Date().toISOString() : m.completedAt
          };
        }
        return m;
      });

      await updateMilestoneStatus(selectedProject.id, updatedMilestones);
      
      setSelectedProject({
        ...selectedProject,
        milestones: updatedMilestones
      });

      setEditingMilestoneId(null);
      setEditFile(null);
      onRefreshProjects();
    } catch (err) {
      console.error("Error saving milestone edit:", err);
      setEditError('Failed to save changes.');
    } finally {
      setEditLoading(false);
    }
  };

  // Auto-select first project if none is active but user has projects
  React.useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject, setSelectedProject]);

  const handleAddNextPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!newPhaseTitle.trim()) {
      setAddPhaseError('Please specify a title for the next phase.');
      return;
    }

    setAddingPhaseLoading(true);
    setAddPhaseError(null);

    try {
      let finalAttachmentUrl = '';
      let finalAttachmentName = '';

      if (newPhaseFile) {
        try {
          const uploadRes = await uploadSupabaseAttachment(selectedProject.id, newPhaseFile);
          finalAttachmentUrl = uploadRes.url;
          finalAttachmentName = uploadRes.name;
        } catch (uploadErr) {
          console.error("Error uploading phase attachment:", uploadErr);
          setAddPhaseError("Failed to upload the custom document. Please try again.");
          setAddingPhaseLoading(false);
          return;
        }
      }

      const newMilestone: Milestone = {
        id: `m-custom-${Math.random().toString(36).substring(2, 10)}`,
        title: newPhaseTitle.trim(),
        description: newPhaseDesc.trim() || 'No description provided.',
        dueDate: newPhaseDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        githubUrl: newPhaseGithubUrl.trim() || undefined,
        demoUrl: newPhaseDemoUrl.trim() || undefined,
        attachmentUrl: finalAttachmentUrl || undefined,
        attachmentName: finalAttachmentName || undefined
      };

      const updatedMilestones = [...selectedProject.milestones, newMilestone];

      await updateMilestoneStatus(selectedProject.id, updatedMilestones);
      
      // Update state locally
      setSelectedProject({
        ...selectedProject,
        milestones: updatedMilestones
      });

      // Reset form
      setNewPhaseTitle('');
      setNewPhaseDesc('');
      setNewPhaseDueDate('');
      setNewPhaseGithubUrl('');
      setNewPhaseDemoUrl('');
      setNewPhaseFile(null);
      setIsAddingPhase(false);
      onRefreshProjects();
    } catch (err) {
      console.error("Error adding next phase:", err);
      setAddPhaseError('Could not append the next phase to the project timeline.');
    } finally {
      setAddingPhaseLoading(false);
    }
  };

  const handleMilestoneToggle = async (milestoneId: string) => {
    if (!selectedProject) return;
    setUpdatingId(milestoneId);

    const updatedMilestones = selectedProject.milestones.map(m => {
      if (m.id === milestoneId) {
        const isCompleted = m.status === 'completed';
        return {
          ...m,
          status: (isCompleted ? 'pending' : 'completed') as 'pending' | 'completed',
          completedAt: isCompleted ? null : new Date().toISOString()
        };
      }
      return m;
    });

    try {
      await updateMilestoneStatus(selectedProject.id, updatedMilestones);
      
      // Update state locally
      setSelectedProject({
        ...selectedProject,
        milestones: updatedMilestones
      });

      onRefreshProjects();
    } catch (error) {
      console.error("Failed to update milestone status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const getCompletedCount = (project: Project) => {
    return project.milestones.filter(m => m.status === 'completed' || m.status === 'approved').length;
  };

  const getPercent = (project: Project) => {
    const total = project.milestones.length;
    if (total === 0) return 0;
    return Math.round((getCompletedCount(project) / total) * 100);
  };

  // Advice based on project status
  const getStatusAdvice = (status: Project['status']) => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-emerald-50 border-emerald-100 text-emerald-800',
          title: 'Proposal Approved!',
          desc: 'Your faculty mentor has approved your project scope and objectives. You are clear to develop and update active milestones.'
        };
      case 'completed':
        return {
          bg: 'bg-indigo-50 border-indigo-100 text-indigo-800',
          title: 'Project Completed',
          desc: 'All milestones have been completed and verified for this project.'
        };
      case 'revision':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          title: 'Revision Requested',
          desc: 'Your mentor requested custom modifications. Read the comments in the feedback section below, update deliverables, and discuss with your mentor.'
        };
      case 'rejected':
        return {
          bg: 'bg-red-50 border-red-100 text-red-800',
          title: 'Proposal Rejected',
          desc: 'This project scope was rejected. Please review the mentor feedback to learn why, or speak with support to submit a separate concept.'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-100 text-blue-800',
          title: 'Under Mentor Review',
          desc: 'Your project proposal has been submitted to your assigned mentor. While they review, you can still toggle and outline milestones.'
        };
    }
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="h-14 w-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
          <Activity className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-extrabold text-lg text-slate-800">No Projects Active</h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Progress Tracking tracks milestones, checklists and grades for submitted projects. Please submit a project proposal first.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('submit')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer"
        >
          Submit Project Proposal <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const projectAdvice = selectedProject ? getStatusAdvice(selectedProject.status) : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Project Select */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Milestone Progress Tracking</h2>
          <p className="text-xs text-slate-500">Tick off deliverables, visualize phase completions, and review logs</p>
        </div>

        {/* Project Dropdown Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline-block">Select Project:</span>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const proj = projects.find(p => p.id === e.target.value);
              setSelectedProject(proj || null);
            }}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedProject && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Progression Meters & Feedback */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Progression Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs text-center space-y-5">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100/30">
                {selectedProject.category}
              </span>

              {/* Circular gauge or dynamic bar */}
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    className="text-slate-100"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="52"
                    cx="64"
                    cy="64"
                  />
                  <circle
                    className="text-indigo-600 transition-all duration-500"
                    strokeWidth="10"
                    strokeDasharray={326}
                    strokeDashoffset={326 - (326 * getPercent(selectedProject)) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="52"
                    cx="64"
                    cy="64"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="block text-2xl font-black font-display text-slate-800">{getPercent(selectedProject)}%</span>
                  <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Completed</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-3 text-slate-600">
                <div>
                  <span className="block text-[10px] text-slate-400">Completed</span>
                  <span className="font-bold text-slate-800">{getCompletedCount(selectedProject)} Phases</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Assigned Mentor</span>
                  <span className="font-bold text-slate-800 truncate block max-w-[120px]">{selectedProject.mentorName}</span>
                </div>
              </div>
            </div>

            {/* Live Advice card */}
            {projectAdvice && (
              <div className={`p-4 border rounded-2xl space-y-2 ${projectAdvice.bg}`}>
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {projectAdvice.title}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{projectAdvice.desc}</p>
              </div>
            )}

            {/* Team listing */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Participants</h4>
              <div className="text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border">
                {selectedProject.teamMembers ? (
                  <ul className="list-disc list-inside space-y-1">
                    {selectedProject.teamMembers.split(',').map((member, i) => (
                      <li key={i} className="truncate">{member.trim()}</li>
                    ))}
                  </ul>
                ) : (
                  <span>Individual Student Submission ({selectedProject.studentName})</span>
                )}
              </div>
            </div>

          </div>

          {/* Right: Timeline Roadmap Checklist */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <h3 className="font-display font-extrabold text-lg text-slate-800">Milestone Roadmap</h3>
                <span className="text-xs text-slate-400 italic">
                  {user.role === 'student' 
                    ? 'Statuses are managed and approved by your faculty mentor' 
                    : 'Toggle checkbox to check off phases'}
                </span>
              </div>

              {/* Vertical timeline items */}
              <div className="space-y-6 relative before:absolute before:inset-y-1 before:left-3.5 before:w-0.5 before:bg-slate-100">
                {selectedProject.milestones.map((milestone) => {
                  const isApproved = milestone.status === 'approved';
                  const isRejected = milestone.status === 'rejected';
                  const isCompleted = milestone.status === 'completed';
                  const isPending = milestone.status === 'pending' || !milestone.status;
                  const isEditing = editingMilestoneId === milestone.id;
                  return (
                    <div key={milestone.id} className="relative pl-10 group">
                      
                      {/* Circle dot trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          if (user.role === 'student') return;
                          handleMilestoneToggle(milestone.id);
                        }}
                        disabled={user.role === 'student' || updatingId === milestone.id || isEditing}
                        className={`absolute left-0 top-0.5 w-7.5 h-7.5 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                          user.role === 'student' 
                            ? 'cursor-not-allowed' 
                            : 'cursor-pointer hover:border-indigo-500'
                        } ${
                          isApproved 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : isRejected 
                            ? 'bg-rose-500 border-rose-500 text-white' 
                            : isCompleted 
                            ? 'bg-amber-500 border-amber-500 text-white animate-pulse' 
                            : 'bg-white border-slate-200'
                        }`}
                        title={
                          user.role === 'student' 
                            ? 'Status is managed and approved by your faculty mentor' 
                            : 'Toggle milestone status'
                        }
                      >
                        {updatingId === milestone.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        ) : isApproved ? (
                          <Check className="h-4 w-4" />
                        ) : isRejected ? (
                          <XCircle className="h-4 w-4" />
                        ) : isCompleted ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </button>

                      {/* Content block */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        isApproved 
                          ? 'bg-emerald-50/20 border-emerald-100/60' 
                          : isRejected 
                          ? 'bg-rose-50/20 border-rose-100/60' 
                          : isCompleted 
                          ? 'bg-amber-50/20 border-amber-100/60' 
                          : 'bg-slate-50/50 border-slate-100 group-hover:border-slate-200'
                      }`}>
                        {isEditing ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                                <Pencil className="h-3 w-3 text-indigo-500" /> Customize Phase Deliverables
                              </span>
                              <button 
                                type="button"
                                onClick={handleCancelEdit}
                                className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>

                            {editError && (
                              <div className="text-xs text-red-600 font-semibold">{editError}</div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Phase Title *</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none animate-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Target Due Date</label>
                                <input
                                  type="date"
                                  value={editDueDate}
                                  onChange={(e) => setEditDueDate(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Phase Description & Deliverables Checklist</label>
                              <textarea
                                rows={2}
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">What I completed / Did in this phase</label>
                              <textarea
                                rows={2}
                                placeholder="State what you worked on, completed next, and details of your phase work..."
                                value={editAccomplishments}
                                onChange={(e) => setEditAccomplishments(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none"
                              />
                            </div>

                            {/* Custom URL inputs specifically for the next phase / active phase */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                  <Github className="h-3 w-3 text-slate-500" /> GitHub Repo Link
                                </label>
                                <input
                                  type="url"
                                  placeholder="https://github.com/..."
                                  value={editGithubUrl}
                                  onChange={(e) => setEditGithubUrl(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                  <Link className="h-3 w-3 text-slate-500" /> Live Demo Link
                                </label>
                                <input
                                  type="url"
                                  placeholder="https://my-demo-app.com"
                                  value={editDemoUrl}
                                  onChange={(e) => setEditDemoUrl(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                                />
                              </div>
                            </div>

                            {/* Phase Deliverable PDF / Doc Uploader */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Phase Deliverable Documentation (PDF, ZIP, DOCX)</label>
                              {editAttachmentUrl ? (
                                <div className="flex items-center justify-between bg-emerald-50/40 border border-emerald-100 p-2 rounded-lg text-xs">
                                  <span className="flex items-center gap-1.5 text-emerald-800 font-medium truncate">
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> {editAttachmentName || 'Attached PDF/Doc'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditAttachmentUrl('');
                                      setEditAttachmentName('');
                                    }}
                                    className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase cursor-pointer"
                                  >
                                    Remove File
                                  </button>
                                </div>
                              ) : editFile ? (
                                <div className="flex items-center justify-between bg-indigo-50/40 border border-indigo-100 p-2 rounded-lg text-xs">
                                  <span className="flex items-center gap-1.5 text-indigo-800 font-medium truncate">
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-600" /> {editFile.name} (Ready to upload)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditFile(null)}
                                    className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                </div>
                              ) : (
                                <div className="relative border border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-3 text-center bg-slate-50/50 hover:bg-indigo-50/10 cursor-pointer transition-all">
                                  <input
                                    type="file"
                                    accept=".pdf,.zip,.doc,.docx,.jpg,.png"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        setEditFile(e.target.files[0]);
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <UploadCloud className="h-4 w-4 text-slate-400" />
                                    <span className="text-[10px] text-slate-500 font-semibold">
                                      Upload PDF or Project Deliverable for this phase
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(milestone.id)}
                                disabled={editLoading}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                {editLoading ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                {editLoading ? 'Saving...' : 'Save Details'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Badges */}
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider">
                                    <Check className="h-2.5 w-2.5" /> Approved
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-extrabold uppercase tracking-wider animate-bounce">
                                    <XCircle className="h-2.5 w-2.5" /> Rejected
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
                                    <Clock className="h-2.5 w-2.5" /> Review Pending
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                                    In Progress
                                  </span>
                                )}

                                <h4 className={`text-sm font-bold text-slate-800 ${isApproved ? 'line-through text-slate-400' : ''}`}>
                                  {milestone.title}
                                </h4>

                                {!isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(milestone)}
                                    title="Edit details of this phase"
                                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-semibold font-mono">
                                <Calendar className="h-3 w-3" /> Due: {milestone.dueDate}
                              </span>
                            </div>

                            {milestone.description && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{milestone.description}</p>
                            )}

                            {milestone.accomplishments && (
                              <div className="mt-3 bg-indigo-50/20 border border-indigo-100/30 p-3 rounded-xl">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Completed Deliverables & Accomplishments Log
                                </span>
                                <p className="text-xs text-slate-700 italic leading-relaxed">
                                  "{milestone.accomplishments}"
                                </p>
                              </div>
                            )}

                            {/* Attached Deliverables & Links for this specific milestone */}
                            {(milestone.attachmentUrl || milestone.githubUrl || milestone.demoUrl) && (
                              <div className="mt-3 pt-2.5 border-t border-slate-100/60 flex flex-wrap gap-2 items-center">
                                {milestone.attachmentUrl && (
                                  <a 
                                    href={milestone.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    referrerPolicy="no-referrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] rounded-lg border border-indigo-100/30 transition-all cursor-pointer"
                                  >
                                    <FileText className="h-3 w-3 text-indigo-500" />
                                    <span className="max-w-[150px] truncate">{milestone.attachmentName || 'Download Phase PDF'}</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                                {milestone.githubUrl && (
                                  <a 
                                    href={milestone.githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg border border-slate-200/55 transition-all cursor-pointer"
                                  >
                                    <Github className="h-3 w-3" />
                                    <span>Code Repository</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                                {milestone.demoUrl && (
                                  <a 
                                    href={milestone.demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] rounded-lg border border-emerald-100/30 transition-all cursor-pointer"
                                  >
                                    <Link className="h-3 w-3 text-emerald-500" />
                                    <span>Live Demonstration</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                            )}
                            
                            {milestone.completedAt && (
                              <div className="text-[10px] text-slate-400 font-medium font-mono mt-2 flex items-center gap-1">
                                <span>• Submitted on {new Date(milestone.completedAt).toLocaleDateString()}</span>
                                {isApproved && <span className="text-emerald-600 font-bold font-sans"> (Passed & Verified ✓)</span>}
                                {isRejected && <span className="text-rose-600 font-bold font-sans"> (Declined by Mentor ✗)</span>}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                    </div>
                  );
                })}

                {/* ADD NEXT PHASE TIMELINE ELEMENT */}
                <div className="relative pl-10 group mt-4">
                  {/* Circle dot trigger */}
                  <div className="absolute left-0 top-1 w-7.5 h-7.5 rounded-full border-2 border-dashed border-indigo-400 bg-indigo-50/50 flex items-center justify-center z-10">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
                  </div>

                  {!isAddingPhase ? (
                    <div 
                      className="p-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/5 hover:bg-indigo-50/10 hover:border-indigo-300 transition-all cursor-pointer" 
                      onClick={() => setIsAddingPhase(true)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-indigo-500" /> Suggest & Add Custom Phase
                        </h4>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                          Add Phase +
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Customize your project roadmap or expand on upcoming development tasks. Click here to append a custom phase or milestone to your live project.
                      </p>
                    </div>
                  ) : (
                      <form onSubmit={handleAddNextPhase} className="p-5 rounded-2xl border border-indigo-200 bg-white shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                          <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Define Custom Next Phase
                          </h4>
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsAddingPhase(false);
                              setNewPhaseGithubUrl('');
                              setNewPhaseDemoUrl('');
                              setNewPhaseFile(null);
                            }}
                            className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>

                        {addPhaseError && (
                          <div className="text-xs text-red-600 font-semibold">{addPhaseError}</div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Phase Title *</label>
                            <input
                              type="text"
                              required
                              value={newPhaseTitle}
                              onChange={(e) => setNewPhaseTitle(e.target.value)}
                              placeholder="e.g. Phase 4: Integration testing"
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Target Due Date</label>
                            <input
                              type="date"
                              value={newPhaseDueDate}
                              onChange={(e) => setNewPhaseDueDate(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Phase Deliverables Description</label>
                          <textarea
                            rows={2}
                            value={newPhaseDesc}
                            onChange={(e) => setNewPhaseDesc(e.target.value)}
                            placeholder="Provide a clear description of deliverables or task checklists for this phase..."
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none"
                          />
                        </div>

                        {/* Optional repositories & demo link fields for the proposed custom phase */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <Github className="h-3 w-3 text-slate-500" /> Phase GitHub Repo
                            </label>
                            <input
                              type="url"
                              placeholder="https://github.com/..."
                              value={newPhaseGithubUrl}
                              onChange={(e) => setNewPhaseGithubUrl(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <Link className="h-3 w-3 text-slate-500" /> Phase Demo Link
                            </label>
                            <input
                              type="url"
                              placeholder="https://my-demo-app.com"
                              value={newPhaseDemoUrl}
                              onChange={(e) => setNewPhaseDemoUrl(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                            />
                          </div>
                        </div>

                        {/* Optional custom deliverable file upload for the custom phase */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Phase Specific Document (PDF, ZIP, DOCX)</label>
                          {newPhaseFile ? (
                            <div className="flex items-center justify-between bg-indigo-50/40 border border-indigo-100 p-2 rounded-lg text-xs">
                              <span className="flex items-center gap-1.5 text-indigo-800 font-medium truncate">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-600" /> {newPhaseFile.name} (Ready to upload)
                              </span>
                              <button
                                type="button"
                                onClick={() => setNewPhaseFile(null)}
                                className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                          ) : (
                            <div className="relative border border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-3 text-center bg-slate-50/50 hover:bg-indigo-50/10 cursor-pointer transition-all">
                              <input
                                type="file"
                                accept=".pdf,.zip,.doc,.docx,.jpg,.png"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setNewPhaseFile(e.target.files[0]);
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex flex-col items-center justify-center gap-1">
                                <UploadCloud className="h-4 w-4 text-slate-400" />
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  Upload PDF, design files, or requirements document for this phase
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingPhase(false);
                              setNewPhaseGithubUrl('');
                              setNewPhaseDemoUrl('');
                              setNewPhaseFile(null);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Close
                          </button>
                          <button
                            type="submit"
                            disabled={addingPhaseLoading}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            {addingPhaseLoading ? 'Adding...' : 'Propose Phase'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
              </div>

            </div>

            {/* Mentor Feedback Feed below milestones */}
            {selectedProject.feedback && selectedProject.feedback.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="font-display font-extrabold text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-amber-500" /> Feedback Feed From Mentor
                </h3>

                <div className="space-y-3.5">
                  {selectedProject.feedback.map((item, idx) => (
                    <div key={item.id || idx} className="p-4 bg-slate-50 border rounded-2xl space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="font-bold text-slate-700">{item.mentorName}</div>
                        <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 italic">"{item.comment}"</p>
                      <div className="text-right">
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Action: {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
