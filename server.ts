import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Standard default mentors list so users can easily select or connect
const DEFAULT_MENTORS = [
  { uid: 'mentor-dr-sarah', displayName: 'Dr. Sarah Connor', email: 'sarah.connor@university.edu', department: 'Computer Science & AI', role: 'mentor' },
  { uid: 'mentor-prof-alan', displayName: 'Prof. Alan Turing', email: 'alan.turing@university.edu', department: 'Data Science & Cyber', role: 'mentor' },
  { uid: 'mentor-dr-grace', displayName: 'Dr. Grace Hopper', email: 'grace.hopper@university.edu', department: 'Software Engineering', role: 'mentor' },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits higher to support base64 file uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Supabase Client on the server side (safe from browser restrictions)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || process.env.VITE_SUPABASE_STORAGE_BUCKET || 'project-files';

  const serverSupabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
  const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(serverSupabaseKey);
  const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, serverSupabaseKey!) : null;

  console.log(`Server starting... Supabase configured: ${isSupabaseConfigured}; storage bucket: ${storageBucket}; service role: ${supabaseServiceRoleKey ? 'enabled' : 'missing'}`);

  // DB Object Mapping Helpers
  function mapDbProfile(db: any) {
    return {
      uid: db.uid,
      email: db.email,
      displayName: db.display_name ?? db.displayName ?? '',
      photoURL: db.photo_url ?? db.photoURL,
      role: db.role || 'student',
      department: db.department,
      studentId: db.student_id ?? db.studentId,
      mentorId: db.mentor_id ?? db.mentorId,
      createdAt: db.created_at ?? db.createdAt
    };
  }

  function mapDbProject(db: any) {
    return {
      id: db.id,
      title: db.title,
      description: db.description,
      category: db.category,
      teamMembers: db.team_members ?? db.teamMembers ?? '',
      studentId: db.student_id ?? db.studentId ?? '',
      studentName: db.student_name ?? db.studentName ?? '',
      studentEmail: db.student_email ?? db.studentEmail ?? '',
      mentorId: db.mentor_id ?? db.mentorId ?? '',
      mentorName: db.mentor_name ?? db.mentorName ?? '',
      status: db.status || 'pending',
      createdAt: db.created_at ?? db.createdAt,
      githubUrl: db.github_url ?? db.githubUrl,
      demoUrl: db.demo_url ?? db.demoUrl,
      attachmentUrl: db.attachment_url ?? db.attachmentUrl,
      attachmentName: db.attachment_name ?? db.attachmentName,
      milestones: Array.isArray(db.milestones) ? db.milestones : [],
      feedback: Array.isArray(db.feedback) ? db.feedback : []
    };
  }

  function mapDbSupportQuery(db: any) {
    return {
      id: db.id,
      name: db.name,
      email: db.email,
      subject: db.subject,
      message: db.message,
      status: db.status || 'open',
      createdAt: db.created_at ?? db.createdAt
    };
  }

  // Helper to ensure user exists in both 'profiles' and 'users' table (safely handling both schemas/FK constraints)
  async function ensureUserInDb(uid: string, email: string, displayName: string, role: string, studentId?: string, mentorId?: string, photoUrl?: string, department?: string) {
    if (!supabase) return;

    let resolvedEmail = email;
    if (!resolvedEmail) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('uid', uid)
          .maybeSingle();
        resolvedEmail = existingProfile?.email;
      } catch (e: any) {
        console.warn('Could not resolve existing profile email:', e.message || e);
      }
    }

    if (!resolvedEmail) {
      resolvedEmail = `${uid}@university.edu`;
    }

    // 1. Try to upsert to 'profiles'
    try {
      const profileData: any = {
        uid,
        email: resolvedEmail,
        display_name: displayName || (role === 'student' ? 'Student' : 'Mentor'),
        role: role || 'student',
        created_at: new Date().toISOString()
      };
      if (photoUrl) profileData.photo_url = photoUrl;
      if (department) profileData.department = department;

      if (role === 'student') {
        profileData.student_id = studentId || `STU-${Math.floor(100000 + Math.random() * 900000)}`;
      } else if (role === 'mentor') {
        profileData.mentor_id = mentorId || `EMP-${Math.floor(100000 + Math.random() * 900000)}`;
        if (!profileData.department) profileData.department = department || 'Computer Science';
      }

      // Remove undefined values
      Object.keys(profileData).forEach(key => profileData[key] === undefined && delete profileData[key]);

      const { error } = await supabase.from('profiles').upsert(profileData);
      if (error) {
        console.warn(`Upsert to 'profiles' table failed:`, error.message);
      } else {
        console.log(`Successfully upserted profile for ${uid} to 'profiles' table.`);
      }
    } catch (e: any) {
      console.warn('Error in profiles table upsert:', e.message || e);
    }

    // 2. Try to upsert to 'users' table (to satisfy any projects_student_id_fkey referencing users)
    try {
      const userData: any = {
        uid,
        id: uid, // frequently the primary key in a 'users' table
        email: resolvedEmail,
        display_name: displayName || (role === 'student' ? 'Student' : 'Mentor'),
        displayName: displayName || (role === 'student' ? 'Student' : 'Mentor'),
        role: role || 'student',
        student_id: uid, // To satisfy projects_student_id_fkey pointing to student_id or uid!
        studentId: uid,
        photo_url: photoUrl,
        photoURL: photoUrl,
        department,
        created_at: new Date().toISOString()
      };

      if (role === 'student') {
        userData.student_id = studentId || uid;
        userData.studentId = studentId || uid;
      } else if (role === 'mentor') {
        userData.mentor_id = mentorId || uid;
        userData.mentorId = mentorId || uid;
      }

      // Remove undefined values
      Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key]);

      // Dynamically filter keys based on what PostgreSQL accepts
      let keys = Object.keys(userData);
      let success = false;
      let attempts = 0;
      while (keys.length > 0 && !success && attempts < 15) {
        attempts++;
        const payload: any = {};
        keys.forEach(k => payload[k] = userData[k]);
        
        const { error } = await supabase.from('users').upsert(payload);
        if (!error) {
          success = true;
          console.log(`Successfully upserted user ${uid} to 'users' table with keys:`, keys);
        } else {
          const errMsg = error.message || '';
          // Check for column missing errors, e.g., column "displayName" of relation "users" does not exist
          // Or: Could not find the 'displayName' column of 'users' in the schema cache
          const match = errMsg.match(/column ['"]([^'"]+)['"]/i) || 
                        errMsg.match(/['"]([^'"]+)['"] column/i) || 
                        errMsg.match(/column "([^"]+)" of/i) || 
                        errMsg.match(/column "([^"]+)" does not exist/i);
          if (match && match[1]) {
            const badCol = match[1];
            keys = keys.filter(k => k !== badCol && k.toLowerCase() !== badCol.toLowerCase());
            console.log(`Column '${badCol}' does not exist in 'users' table. Removing and retrying with remaining keys...`);
          } else {
            console.warn(`Upsert to 'users' table failed with error:`, errMsg);
            break; // Non-column error, stop attempting
          }
        }
      }
    } catch (e: any) {
      console.warn('Error in users table upsert:', e.message || e);
    }
  }

  // API Status & Configuration Route
  app.get('/api/supabase/config', (req, res) => {
    res.json({ configured: isSupabaseConfigured });
  });

  // User Profile Endpoints
  app.post('/api/supabase/profile', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { uid, data } = req.body;
      
      // Ensure the user exists in both tables
      await ensureUserInDb(
        uid,
        data.email,
        data.displayName,
        data.role,
        data.studentId,
        data.mentorId,
        data.photoURL,
        data.department
      );

      // Now query back the created profile from 'profiles' to return
      const { data: dbData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();

      if (error) throw error;
      res.json({ profile: mapDbProfile(dbData || { uid }) });
    } catch (err: any) {
      console.error('Error saving profile:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/supabase/profile', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { uid } = req.query;
      if (!uid) return res.status(400).json({ error: 'Missing uid' });

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.json({ profile: null });
      res.json({ profile: mapDbProfile(data) });
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Projects Endpoints
  app.post('/api/supabase/project', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { projectData } = req.body;

      // Ensure student profile exists in both profiles and users tables to satisfy any FK constraint
      if (projectData.studentId) {
        await ensureUserInDb(
          projectData.studentId,
          projectData.studentEmail,
          projectData.studentName,
          'student',
          projectData.studentId
        );
      }

      // Ensure mentor profile exists in both profiles and users tables to satisfy any FK constraint
      if (projectData.mentorId) {
        const matchedDefault = DEFAULT_MENTORS.find(m => m.uid === projectData.mentorId);
        let mentorEmail = projectData.mentorEmail || matchedDefault?.email;
        let mentorDepartment = matchedDefault?.department;

        try {
          const { data: existingMentor } = await supabase
            .from('profiles')
            .select('email, department')
            .eq('uid', projectData.mentorId)
            .maybeSingle();
          mentorEmail = mentorEmail || existingMentor?.email;
          mentorDepartment = mentorDepartment || existingMentor?.department;
        } catch (e: any) {
          console.warn('Could not load existing mentor profile before project insert:', e.message || e);
        }

        await ensureUserInDb(
          projectData.mentorId,
          mentorEmail,
          matchedDefault?.displayName || projectData.mentorName,
          'mentor',
          undefined,
          projectData.mentorId,
          undefined,
          mentorDepartment
        );
      }

      const initialMilestones = [
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

      const mapped = {
        title: projectData.title,
        description: projectData.description,
        category: projectData.category,
        team_members: projectData.teamMembers,
        student_id: projectData.studentId,
        student_name: projectData.studentName,
        student_email: projectData.studentEmail,
        mentor_id: projectData.mentorId,
        mentor_name: projectData.mentorName,
        github_url: projectData.githubUrl,
        demo_url: projectData.demoUrl,
        attachment_url: projectData.attachmentUrl,
        attachment_name: projectData.attachmentName,
        status: 'pending',
        milestones: initialMilestones,
        feedback: []
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(mapped)
        .select('id')
        .single();

      if (error) throw error;
      res.json({ id: data.id });
    } catch (err: any) {
      console.error('Error creating project:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/supabase/projects/student', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { studentId } = req.query;
      if (!studentId) return res.status(400).json({ error: 'Missing studentId' });

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ projects: (data || []).map(mapDbProject) });
    } catch (err: any) {
      console.error('Error fetching student projects:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/supabase/projects/mentor', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { mentorId } = req.query;
      if (!mentorId) return res.status(400).json({ error: 'Missing mentorId' });

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ projects: (data || []).map(mapDbProject) });
    } catch (err: any) {
      console.error('Error fetching mentor projects:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/supabase/projects/all', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ projects: (data || []).map(mapDbProject) });
    } catch (err: any) {
      console.error('Error fetching all projects:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/supabase/projects/milestones', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { projectId, milestones, status } = req.body;
      const updatePayload: any = { milestones };
      if (status) updatePayload.status = status;

      const { error } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId);

      if (error && status) {
        const { error: fallbackError } = await supabase
          .from('projects')
          .update({ milestones })
          .eq('id', projectId);
        if (fallbackError) throw fallbackError;
      } else if (error) {
        throw error;
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error updating milestones:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/supabase/projects/feedback', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { projectId, mentorId, mentorName, comment, newStatus } = req.body;
      
      const { data: projectData, error: fetchError } = await supabase
        .from('projects')
        .select('feedback')
        .eq('id', projectId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      const dbFeedback = projectData && Array.isArray(projectData.feedback) ? projectData.feedback : [];

      const feedbackItem = {
        id: `fb-${Math.floor(100000 + Math.random() * 900000)}`,
        mentorId,
        mentorName,
        comment,
        status: newStatus,
        createdAt: new Date().toISOString()
      };

      const updatedFeedback = [...dbFeedback, feedbackItem];

      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus,
          feedback: updatedFeedback
        })
        .eq('id', projectId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error adding feedback:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Support Queries Endpoints
  app.post('/api/supabase/support', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { name, email, subject, message } = req.body;
      const { data, error } = await supabase
        .from('support_queries')
        .insert({ name, email, subject, message, status: 'open' })
        .select('id')
        .single();

      if (error) throw error;
      res.json({ id: data.id });
    } catch (err: any) {
      console.error('Error creating support query:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/supabase/support', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: 'Missing email' });

      const { data, error } = await supabase
        .from('support_queries')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ queries: (data || []).map(mapDbSupportQuery) });
    } catch (err: any) {
      console.error('Error fetching support queries:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Support Queries Endpoints
  app.get('/api/supabase/support/all', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { data, error } = await supabase
        .from('support_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ queries: (data || []).map(mapDbSupportQuery) });
    } catch (err: any) {
      console.error('Error fetching all support queries for admin:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/supabase/support/resolve', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { queryId, status } = req.body;
      if (!queryId || !status) {
        return res.status(400).json({ error: 'Missing parameters queryId or status' });
      }

      const { data, error } = await supabase
        .from('support_queries')
        .update({ status })
        .eq('id', queryId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, query: mapDbSupportQuery(data) });
    } catch (err: any) {
      console.error('Error resolving support query:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update Status or message of Support Query
  app.post('/api/admin/support/:id/status', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { id } = req.params;
      const { status, message } = req.body;
      
      const payload: any = {};
      if (status) payload.status = status;
      if (message) payload.message = message;

      const { data, error } = await supabase
        .from('support_queries')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, query: mapDbSupportQuery(data) });
    } catch (err: any) {
      console.error('Error updating support query:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get all Projects
  app.get('/api/admin/projects/all', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ projects: (data || []).map(mapDbProject) });
    } catch (err: any) {
      console.error('Error fetching all projects:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update project status
  app.post('/api/admin/projects/:id/status', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { id } = req.params;
      const { status } = req.body;

      const { data, error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, project: mapDbProject(data) });
    } catch (err: any) {
      console.error('Error updating project status:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update project mentor assignment
  app.post('/api/admin/projects/:id/mentor', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { id } = req.params;
      const { mentorId, mentorName } = req.body;

      const { data, error } = await supabase
        .from('projects')
        .update({ 
          mentor_id: mentorId, 
          mentor_name: mentorName 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, project: mapDbProject(data) });
    } catch (err: any) {
      console.error('Error updating project mentor:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get all profiles
  app.get('/api/admin/users/all', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json({ users: (data || []).map(mapDbProfile) });
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update user role and department
  app.post('/api/admin/users/:uid/role', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { uid } = req.params;
      const { role, department } = req.body;

      // Update profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role, department })
        .eq('uid', uid);

      if (profileError) {
        console.warn('Profile update error:', profileError.message);
      }

      // Update users table
      try {
        await supabase
          .from('users')
          .update({ role, department })
          .eq('uid', uid);
      } catch (e: any) {
        console.warn('Could not update users table role:', e.message || e);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('Error updating user role:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Attachment Upload Proxy
  app.post('/api/supabase/upload', async (req, res) => {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase is not configured on the server.' });
    }
    try {
      const { projectId, fileName, fileData } = req.body;
      if (!projectId || !fileName || !fileData) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      // Convert base64 data url back to a buffer
      const base64Content = fileData.split(';base64,').pop();
      const buffer = Buffer.from(base64Content!, 'base64');

      const fileExt = fileName.split('.').pop();
      const dbFileName = `${projectId}_${Date.now()}.${fileExt}`;
      const filePath = `${projectId}/${dbFileName}`;

      const uploadBuckets = [storageBucket, 'attachments', 'projects'].filter((bucket, index, buckets) => {
        return bucket && buckets.indexOf(bucket) === index;
      });

      let uploadedBucket = '';
      let lastUploadError: any = null;

      for (const bucket of uploadBuckets) {
        try {
          await supabase.storage.createBucket(bucket, { public: true });
        } catch (e: any) {
          console.log(`Attempted to create ${bucket} bucket or verified existence:`, e.message || e);
        }

        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, buffer, { contentType: 'application/octet-stream', cacheControl: '3600', upsert: true });

        if (!error) {
          uploadedBucket = bucket;
          break;
        }

        lastUploadError = error;
        console.warn(`Upload to ${bucket} bucket failed:`, error.message);
      }

      if (!uploadedBucket) throw lastUploadError || new Error('Storage upload failed.');

      const { data: publicUrlData } = supabase.storage
        .from(uploadedBucket)
        .getPublicUrl(filePath);

      res.json({ url: publicUrlData.publicUrl, name: fileName, bucket: uploadedBucket });
    } catch (err: any) {
      console.error('Upload failed on server:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get dynamic mentors
  app.get('/api/supabase/mentors', async (req, res) => {
    const mentorsMap = new Map();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'mentor');

        if (!error && data) {
          data.forEach(db => {
            const profile = mapDbProfile(db);
            mentorsMap.set(profile.uid, profile);
          });
        }
      } catch (e) {
        console.warn('Could not load mentors from Supabase on server:', e);
      }
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

    res.json({ mentors: Array.from(mentorsMap.values()) });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
