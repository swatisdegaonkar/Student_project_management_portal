import { createClient } from '@supabase/supabase-js';
import { Project, UserProfile, Milestone, FeedbackComment, SupportQuery } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase keys are provided. Do not block a real project just because
// it matches a previously generated template value.
export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  typeof supabaseAnonKey === 'string' &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl.trim()) &&
  supabaseAnonKey.trim().length > 20;

// Initialize actual Supabase client (only if direct access is needed, but we prefer Express API proxy to avoid fetch CORS/iframe issues)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl.trim(), supabaseAnonKey.trim())
  : null;

export const SUPABASE_SQL_SETUP = `-- Active Dynamic CollabPM SQL Schema Setup
-- Run these statements in your Supabase SQL Editor to provision all dynamic modules instantly!

-- 1. Create Profile / Users Table
CREATE TABLE IF NOT EXISTS public.profiles (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'mentor')),
  department TEXT,
  student_id TEXT,
  mentor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow user all access on own profile" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Create Projects Submissions Table
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  team_members TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  mentor_id TEXT NOT NULL,
  mentor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision', 'completed')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  github_url TEXT,
  demo_url TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Enable Row Level Security (RLS) on Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Allow anyone to create projects" ON public.projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow student/mentor updates on relevant projects" ON public.projects
  FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Create Support Queries Table
CREATE TABLE IF NOT EXISTS public.support_queries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on Support Queries
ALTER TABLE public.support_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to insert support queries" ON public.support_queries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow user select on support queries" ON public.support_queries
  FOR SELECT USING (true);

-- 4. Create public storage bucket for project/progress attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public project file reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow project file uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow project file updates" ON storage.objects;

CREATE POLICY "Allow public project file reads" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'project-files');

CREATE POLICY "Allow project file uploads" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Allow project file updates" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'project-files') WITH CHECK (bucket_id = 'project-files');
`;

// Standard default mentors list so users can easily select or connect
export const DEFAULT_MENTORS = [
  { uid: 'mentor-dr-sarah', displayName: 'Dr. Sarah Connor', email: 'sarah.connor@university.edu', department: 'Computer Science & AI', role: 'mentor' as const },
  { uid: 'mentor-prof-alan', displayName: 'Prof. Alan Turing', email: 'alan.turing@university.edu', department: 'Data Science & Cyber', role: 'mentor' as const },
  { uid: 'mentor-dr-grace', displayName: 'Dr. Grace Hopper', email: 'grace.hopper@university.edu', department: 'Software Engineering', role: 'mentor' as const },
];

/**
 * Cache projects locally to guarantee reliable offline updates and cross-role synchronization
 */
function cacheProjectsLocally(projects: Project[]): void {
  try {
    const raw = localStorage.getItem('collabpm_local_projects');
    const localList: Project[] = raw ? JSON.parse(raw) : [];
    const localMap = new Map<string, Project>();

    localList.forEach(p => localMap.set(p.id, p));

    projects.forEach(p => {
      const existing = localMap.get(p.id);
      if (existing) {
        const localMilestonesCount = (existing.milestones || []).filter(m => m.status === 'completed' || m.status === 'approved').length;
        const dbMilestonesCount = (p.milestones || []).filter(m => m.status === 'completed' || m.status === 'approved').length;

        const localCustomCount = (existing.milestones || []).length;
        const dbCustomCount = (p.milestones || []).length;

        if (localMilestonesCount > dbMilestonesCount || localCustomCount > dbCustomCount || (existing.feedback || []).length > (p.feedback || []).length) {
          return;
        }
      }
      localMap.set(p.id, p);
    });

    localStorage.setItem('collabpm_local_projects', JSON.stringify(Array.from(localMap.values())));
  } catch (e) {
    console.warn("Failed to cache projects locally:", e);
  }
}

/**
 * Helper to execute API requests with direct fallback & helpful error logging
 */
async function apiRequest<T>(url: string, options: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 6000);

  const res = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  }).finally(() => window.clearTimeout(timeoutId));

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function getLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem('collabpm_local_projects');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * User Profile Operations
 */
export async function saveSupabaseUserProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
  const result = await apiRequest<{ profile: UserProfile }>('/api/supabase/profile', {
    method: 'POST',
    body: JSON.stringify({ uid, data })
  });
  return result.profile;
}

export async function getSupabaseUserProfile(uid: string): Promise<UserProfile | null> {
  const result = await apiRequest<{ profile: UserProfile | null }>(`/api/supabase/profile?uid=${encodeURIComponent(uid)}`, {
    method: 'GET'
  });
  return result.profile;
}

/**
 * Project Operations
 */
export async function createSupabaseProject(
  projectData: Omit<Project, 'id' | 'status' | 'createdAt' | 'milestones' | 'feedback'> & { mentorEmail?: string }
): Promise<string> {
  const result = await apiRequest<{ id: string }>('/api/supabase/project', {
    method: 'POST',
    body: JSON.stringify({ projectData })
  });

  const initialMilestones: Milestone[] = [
    {
      id: 'm1',
      title: 'Project Proposal',
      description: 'Submit detailed project architecture and objective roadmap.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'completed',
      completedAt: new Date().toISOString()
    },
    {
      id: 'm2',
      title: 'UI Design & Prototyping',
      description: 'Create interactive screens and wireframes.',
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending'
    },
    {
      id: 'm3',
      title: 'Core Development & Integration',
      description: 'Build backend handlers, frontend routes and integrate database APIs.',
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending'
    },
    {
      id: 'm4',
      title: 'Testing & Final Review',
      description: 'Perform system checks, edge case analyses and gather initial mentor feedback.',
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending'
    }
  ];

  // Back up locally
  try {
    const raw = localStorage.getItem('collabpm_local_projects');
    const localList = raw ? JSON.parse(raw) : [];
    localList.push({ id: result.id, ...projectData, status: 'pending', createdAt: new Date().toISOString(), milestones: initialMilestones, feedback: [] });
    localStorage.setItem('collabpm_local_projects', JSON.stringify(localList));
  } catch (e) { }

  return result.id;
}

export async function getSupabaseStudentProjects(studentId: string): Promise<Project[]> {
  try {
    const result = await apiRequest<{ projects: Project[] }>(`/api/supabase/projects/student?studentId=${encodeURIComponent(studentId)}`, {
      method: 'GET'
    });
    cacheProjectsLocally(result.projects);
    return result.projects;
  } catch (e) {
    console.warn("Student project sync failed, using local project cache:", e);
    return getLocalProjects().filter(p => p.studentId === studentId);
  }
}

export async function getSupabaseMentorProjects(mentorId: string): Promise<Project[]> {
  try {
    const result = await apiRequest<{ projects: Project[] }>(`/api/supabase/projects/mentor?mentorId=${encodeURIComponent(mentorId)}`, {
      method: 'GET'
    });
    cacheProjectsLocally(result.projects);
    return result.projects;
  } catch (e) {
    console.warn("Mentor project sync failed, using local project cache:", e);
    return getLocalProjects().filter(p => p.mentorId === mentorId);
  }
}

export async function getSupabaseAllProjects(): Promise<Project[]> {
  try {
    const result = await apiRequest<{ projects: Project[] }>('/api/supabase/projects/all', {
      method: 'GET'
    });
    cacheProjectsLocally(result.projects);
    return result.projects;
  } catch (e) {
    console.warn("Project sync failed, using local project cache:", e);
    return getLocalProjects();
  }
}

export async function updateSupabaseMilestoneStatus(
  projectId: string,
  milestones: Milestone[]
): Promise<void> {
  const isFullyCompleted = milestones.length > 0 && milestones.every(m => m.status === 'completed' || m.status === 'approved');

  try {
    const raw = localStorage.getItem('collabpm_local_projects');
    if (raw) {
      const localList: Project[] = JSON.parse(raw);
      const foundIdx = localList.findIndex(p => p.id === projectId);
      if (foundIdx !== -1) {
        localList[foundIdx].milestones = milestones;
        if (isFullyCompleted) {
          localList[foundIdx].status = 'completed';
        } else if (localList[foundIdx].status === 'completed') {
          localList[foundIdx].status = 'approved';
        }
        localStorage.setItem('collabpm_local_projects', JSON.stringify(localList));
      }
    }
  } catch (e) { }

  await apiRequest<void>('/api/supabase/projects/milestones', {
    method: 'PATCH',
    body: JSON.stringify({ projectId, milestones, status: isFullyCompleted ? 'completed' : undefined })
  });
}

export async function addSupabaseMentorFeedback(
  projectId: string,
  mentorId: string,
  mentorName: string,
  comment: string,
  newStatus: Project['status'],
  existingFeedback: FeedbackComment[] = []
): Promise<void> {
  const feedbackItem: FeedbackComment = {
    id: `fb-${Math.floor(100000 + Math.random() * 900000)}`,
    mentorId,
    mentorName,
    comment,
    status: newStatus,
    createdAt: new Date().toISOString()
  };

  const updatedFeedback = [...existingFeedback, feedbackItem];

  try {
    const raw = localStorage.getItem('collabpm_local_projects');
    if (raw) {
      const localList: Project[] = JSON.parse(raw);
      const foundIdx = localList.findIndex(p => p.id === projectId);
      if (foundIdx !== -1) {
        localList[foundIdx].feedback = updatedFeedback;
        localList[foundIdx].status = newStatus;
        localStorage.setItem('collabpm_local_projects', JSON.stringify(localList));
      }
    }
  } catch (e) { }

  await apiRequest<void>('/api/supabase/projects/feedback', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      mentorId,
      mentorName,
      comment,
      newStatus,
      existingFeedback
    })
  });
}

/**
 * Support Query Operations
 */
export async function submitSupabaseSupportQuery(
  name: string,
  email: string,
  subject: string,
  message: string
): Promise<string> {
  const result = await apiRequest<{ id: string }>('/api/supabase/support', {
    method: 'POST',
    body: JSON.stringify({ name, email, subject, message })
  });
  return result.id;
}

export async function getSupabaseSupportQueries(email: string): Promise<SupportQuery[]> {
  const result = await apiRequest<{ queries: SupportQuery[] }>(`/api/supabase/support?email=${encodeURIComponent(email)}`, {
    method: 'GET'
  });
  return result.queries;
}

export async function getSupabaseAllSupportQueries(): Promise<SupportQuery[]> {
  const result = await apiRequest<{ queries: SupportQuery[] }>('/api/supabase/support/all', {
    method: 'GET'
  });
  return result.queries;
}

export async function resolveSupabaseSupportQuery(queryId: string, status: 'open' | 'resolved'): Promise<SupportQuery> {
  const result = await apiRequest<{ success: boolean; query: SupportQuery }>('/api/supabase/support/resolve', {
    method: 'POST',
    body: JSON.stringify({ queryId, status })
  });
  return result.query;
}

/**
 * Storage Upload Helper
 */
export async function uploadSupabaseAttachment(
  projectId: string,
  file: File
): Promise<{ url: string; name: string }> {
  try {
    // Read file as base64 string
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const result = await apiRequest<{ url: string; name: string }>('/api/supabase/upload', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        fileName: file.name,
        fileData: base64Data
      })
    });
    return result;
  } catch (error) {
    console.warn("Supabase server storage upload failed, falling back to local base64:", error);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve({
          url: dataUrl.length < 500000 ? dataUrl : URL.createObjectURL(file),
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Fetch mentors dynamically
 */
export async function getSupabaseMentors(): Promise<UserProfile[]> {
  const mentorsMap = new Map<string, UserProfile>();

  // Supabase is the source of truth. Defaults are only an empty-state fallback.
  try {
    const result = await apiRequest<{ mentors: UserProfile[] }>('/api/supabase/mentors', {
      method: 'GET'
    });
    if (result && result.mentors) {
      result.mentors.forEach(m => {
        mentorsMap.set(m.uid, m);
      });
    }
  } catch (e) {
    console.warn("Could not load mentors from Supabase proxy:", e);
  }

  if (mentorsMap.size === 0) {
    DEFAULT_MENTORS.forEach(m => {
      mentorsMap.set(m.uid, {
        uid: m.uid,
        email: m.email,
        displayName: m.displayName,
        role: 'mentor',
        department: m.department,
        createdAt: null
      });
    });
  }

  return Array.from(mentorsMap.values());
}

/**
 * Firebase / Supabase Auth Handlers
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: 'student' | 'mentor',
  department: string,
  studentId?: string,
  mentorId?: string
): Promise<UserProfile> {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Sign up failed: user is null");

    return await saveSupabaseUserProfile(data.user.id, {
      email,
      displayName,
      role,
      department,
      studentId,
      mentorId,
      createdAt: new Date().toISOString()
    });
  }
  throw new Error("Supabase is not configured. Please use the sandbox or connect Supabase.");
}

export async function signInWithEmail(email: string, password: string): Promise<UserProfile> {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Sign in failed: user is null");

    const profile = await getSupabaseUserProfile(data.user.id);
    if (!profile) {
      return await saveSupabaseUserProfile(data.user.id, {
        email: data.user.email || email,
        displayName: data.user.email?.split('@')[0] || 'User',
        role: 'student',
        createdAt: new Date().toISOString()
      });
    }
    return profile;
  }
  throw new Error("Supabase is not configured. Please use the sandbox or connect Supabase.");
}

export async function signOutUser(): Promise<void> {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export function onSupabaseAuthStateChanged(
  callback: (user: UserProfile | null) => void
): () => void {
  if (supabase) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const profile = await getSupabaseUserProfile(session.user.id);
          if (profile) {
            callback(profile);
          } else {
            const fallbackProfile = await saveSupabaseUserProfile(session.user.id, {
              email: session.user.email || '',
              displayName: session.user.email?.split('@')[0] || 'User',
              role: 'student',
              createdAt: new Date().toISOString()
            });
            callback(fallbackProfile);
          }
        } catch (err) {
          console.error("Error fetching user profile on auth change:", err);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
    return () => subscription.unsubscribe();
  }
  return () => { };
}

export async function getSupabaseAllUsers(): Promise<UserProfile[]> {
  const result = await apiRequest<{ users: UserProfile[] }>('/api/admin/users/all', {
    method: 'GET'
  });
  return result.users;
}

export async function updateProjectStatus(projectId: string, status: string): Promise<Project> {
  const result = await apiRequest<{ success: boolean; project: Project }>(`/api/admin/projects/${projectId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
  return result.project;
}

export async function updateProjectMentor(projectId: string, mentorId: string, mentorName: string): Promise<Project> {
  const result = await apiRequest<{ success: boolean; project: Project }>(`/api/admin/projects/${projectId}/mentor`, {
    method: 'POST',
    body: JSON.stringify({ mentorId, mentorName })
  });
  return result.project;
}
