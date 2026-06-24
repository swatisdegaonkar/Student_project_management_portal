import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Link, 
  Github, 
  UserPlus, 
  Tag, 
  Layers,
  CheckCircle2, 
  Loader2, 
  AlertTriangle,
  X
} from 'lucide-react';
import { createSupabaseProject as createProject, uploadSupabaseAttachment as uploadProjectAttachment, DEFAULT_MENTORS, getSupabaseMentors } from '../lib/supabase';
import { UserProfile, Project } from '../types';

interface ProjectSubmissionProps {
  user: UserProfile;
  setActiveTab: (tab: string) => void;
  onRefreshProjects: () => void;
}

export default function ProjectSubmission({ user, setActiveTab, onRefreshProjects }: ProjectSubmissionProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Web Development');
  const [teamMembers, setTeamMembers] = useState('');
  const [mentorIndex, setMentorIndex] = useState(0);
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [mentorsList, setMentorsList] = useState<UserProfile[]>(
    DEFAULT_MENTORS.map(m => ({
      uid: m.uid,
      email: m.email,
      displayName: m.displayName,
      role: 'mentor',
      department: m.department,
      createdAt: null
    }))
  );

  useEffect(() => {
    getSupabaseMentors().then(setMentorsList).catch(err => {
      console.error("Error loading mentors in submission form:", err);
    });
  }, []);
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // App status handlers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please fill in the project title and detailed description.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedMentor = mentorsList[mentorIndex] || DEFAULT_MENTORS[0];
      
      let attachmentUrl = '';
      let attachmentName = '';

      // Upload file first if selected
      if (file) {
        // Create a temporary project ID/hash for folder structure
        const tempId = `proj-${Date.now()}`;
        const fileUploadResult = await uploadProjectAttachment(tempId, file);
        attachmentUrl = fileUploadResult.url;
        attachmentName = fileUploadResult.name;
      }

      // Save project metadata to Supabase
      const newProjectId = await createProject({
        title,
        description,
        category,
        teamMembers,
        studentId: user.uid,
        studentName: user.displayName,
        studentEmail: user.email,
        mentorId: selectedMentor.uid,
        mentorName: selectedMentor.displayName,
        mentorEmail: selectedMentor.email,
        githubUrl: githubUrl || undefined,
        demoUrl: demoUrl || undefined,
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
      });

      setSuccess('Project proposal submitted successfully to mentor review queue!');
      
      // Clear inputs
      setTitle('');
      setDescription('');
      setTeamMembers('');
      setGithubUrl('');
      setDemoUrl('');
      setFile(null);

      onRefreshProjects();
      
      // Delay navigation slightly to let the student see success
      setTimeout(() => {
        setActiveTab('dashboard');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while submitting your project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Project Submission Page</h2>
        <p className="text-xs text-slate-500">Submit your academic proposals, link source codes, and attach relevant materials</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-2xl">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Row 1: Title & Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Project Title
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FileText className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="e.g. Neural Router Framework"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Category / Domain
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Tag className="h-4 w-4" />
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Project Description & Objectives
          </label>
          <textarea
            rows={4}
            placeholder="Provide a thorough, professional writeup detailing your project, its stack, objectives, and real-world utility..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
            required
          />
        </div>

        {/* Row 3: Mentors & Team Members */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Assigned Faculty Mentor
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Layers className="h-4 w-4" />
              </span>
              <select
                value={mentorIndex}
                onChange={(e) => setMentorIndex(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              >
                {mentorsList.map((mentor, index) => (
                  <option key={mentor.uid} value={index}>
                    {mentor.displayName} ({mentor.department || 'General'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Team Members / Collaborators
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserPlus className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="e.g. Alice Smith, Bob Johnson (leave blank if solo)"
                value={teamMembers}
                onChange={(e) => setTeamMembers(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 4: URLs (Optional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              GitHub Repository URL
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Github className="h-4 w-4" />
              </span>
              <input
                type="url"
                placeholder="https://github.com/username/project"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Live Demo / Deploy Link
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Link className="h-4 w-4" />
              </span>
              <input
                type="url"
                placeholder="https://my-app.vercel.app"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 5: Project Documentation / Proposal Attachment */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Project Proposal / Document (PDF, ZIP, DOCX)
          </label>
          
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2.5 ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-50/50' 
                : file 
                ? 'border-emerald-500 bg-emerald-50/20' 
                : 'border-slate-200 bg-slate-50/30 hover:border-indigo-400'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              accept=".pdf,.zip,.doc,.docx,.jpg,.png"
            />

            {file ? (
              <div className="flex items-center gap-3 bg-white border p-3 rounded-xl shadow-xs relative max-w-sm w-full">
                <FileText className="h-7 w-7 text-emerald-600" />
                <div className="text-left flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 truncate">{file.name}</span>
                  <span className="block text-[10px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    Drag and drop file here, or <span className="text-indigo-600 hover:underline">browse</span>
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Supports PDF, ZIP, images or documents (Max 10MB)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-3 border-t border-slate-50 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-100 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting to Firebase...
              </>
            ) : (
              'Submit Project Proposal'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
