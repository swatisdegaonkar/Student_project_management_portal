import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  Timestamp,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { Project, UserProfile, UserRole, Milestone, FeedbackComment, SupportQuery } from '../types';
import { 
  isSupabaseConfigured,
  saveSupabaseUserProfile,
  getSupabaseUserProfile,
  createSupabaseProject,
  getSupabaseStudentProjects,
  getSupabaseMentorProjects,
  getSupabaseAllProjects,
  updateSupabaseMilestoneStatus,
  addSupabaseMentorFeedback,
  submitSupabaseSupportQuery,
  supabase,
  uploadSupabaseAttachment
} from './supabase';

const firebaseConfig = {
  apiKey: "AIzaSyCNH551YbrOE0vYjWO9_lw0VUndCUT9n4E",
  authDomain: "alien-radio-mgxqk.firebaseapp.com",
  projectId: "alien-radio-mgxqk",
  storageBucket: "alien-radio-mgxqk.firebasestorage.app",
  messagingSenderId: "13108134993",
  appId: "1:13108134993:web:07867df1f0f3095a916470"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-930d4ae2-000d-4137-83cc-fd4e774dd9e3");
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Standard default mentors list so users can easily select or connect
export const DEFAULT_MENTORS = [
  { uid: 'mentor-dr-sarah', displayName: 'Dr. Sarah Connor', email: 'sarah.connor@university.edu', department: 'Computer Science & AI', role: 'mentor' as const },
  { uid: 'mentor-prof-alan', displayName: 'Prof. Alan Turing', email: 'alan.turing@university.edu', department: 'Data Science & Cyber', role: 'mentor' as const },
  { uid: 'mentor-dr-grace', displayName: 'Dr. Grace Hopper', email: 'grace.hopper@university.edu', department: 'Software Engineering', role: 'mentor' as const },
];

/**
 * Authentication Helper Functions
 */

// Save/Update User Profile in Firestore or Supabase
export async function saveUserProfile(uid: string, data: Partial<UserProfile>): Promise<UserProfile> {
  if (isSupabaseConfigured) {
    try {
      return await saveSupabaseUserProfile(uid, data);
    } catch (err) {
      console.warn("Supabase saveUserProfile failed, falling back to Firestore:", err);
    }
  }

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  let profile: UserProfile;
  
  if (userSnap.exists()) {
    const existing = userSnap.data() as UserProfile;
    profile = {
      ...existing,
      ...data,
      uid,
    };
    await setDoc(userRef, profile);
  } else {
    profile = {
      uid,
      email: data.email || '',
      displayName: data.displayName || 'Student User',
      photoURL: data.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`,
      role: data.role || 'student',
      department: data.department || 'Computer Science',
      studentId: data.studentId || `STU-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: Timestamp.now(),
      ...data
    };
    await setDoc(userRef, profile);
  }
  
  return profile;
}

// Get User Profile from Firestore or Supabase
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  // First check if it's one of our default hardcoded mentors
  const defaultMentor = DEFAULT_MENTORS.find(m => m.uid === uid);
  if (defaultMentor) {
    return {
      uid: defaultMentor.uid,
      email: defaultMentor.email,
      displayName: defaultMentor.displayName,
      role: 'mentor',
      department: defaultMentor.department,
      mentorId: 'EMP-' + defaultMentor.uid.split('-')[2].toUpperCase(),
      createdAt: Timestamp.now()
    };
  }

  if (isSupabaseConfigured) {
    try {
      const profile = await getSupabaseUserProfile(uid);
      if (profile) return profile;
    } catch (err) {
      console.warn("Supabase getUserProfile failed, falling back to Firestore:", err);
    }
  }

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }
  return null;
}

// Upload file to Firebase Storage with a base64 fallback for ultimate reliability
export async function uploadProjectAttachment(
  projectId: string, 
  file: File
): Promise<{ url: string; name: string }> {
  if (isSupabaseConfigured) {
    try {
      return await uploadSupabaseAttachment(projectId, file);
    } catch (err) {
      console.warn("Supabase uploadProjectAttachment failed, falling back to Firebase Storage:", err);
    }
  }

  try {
    const storageRef = ref(storage, `projects/${projectId}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { url, name: file.name };
  } catch (error) {
    console.warn("Storage upload failed or unauthorized, falling back to secure simulation:", error);
    // Standard secure base64/blob URL fallback for iframe compatibility
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // If the file is small, we can use the base64 data URL, otherwise use an object URL
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
 * Project Operations
 */

// Create Project Submission
export async function createProject(projectData: Omit<Project, 'id' | 'status' | 'createdAt' | 'milestones' | 'feedback'>): Promise<string> {
  if (isSupabaseConfigured) {
    try {
      return await createSupabaseProject(projectData);
    } catch (err) {
      console.warn("Supabase createProject failed, falling back to Firestore:", err);
    }
  }

  const projectsCol = collection(db, 'projects');
  
  const initialMilestones: Milestone[] = [
    {
      id: 'm1',
      title: 'Project Proposal',
      description: 'Submit detailed project architecture and objective roadmap.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week
      status: 'completed',
      completedAt: new Date().toISOString()
    },
    {
      id: 'm2',
      title: 'UI Design & Prototyping',
      description: 'Create interactive screens and wireframes.',
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 weeks
      status: 'pending'
    },
    {
      id: 'm3',
      title: 'Core Development & Integration',
      description: 'Build backend handlers, frontend routes and integrate database APIs.',
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 weeks
      status: 'pending'
    },
    {
      id: 'm4',
      title: 'Testing & Final Review',
      description: 'Perform system checks, edge case analyses and gather initial mentor feedback.',
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 weeks
      status: 'pending'
    }
  ];

  const projectDoc = {
    ...projectData,
    status: 'pending' as const,
    createdAt: Timestamp.now(),
    milestones: initialMilestones,
    feedback: []
  };

  const docRef = await addDoc(projectsCol, projectDoc);
  return docRef.id;
}

// Fetch Student's projects
export async function getStudentProjects(studentId: string): Promise<Project[]> {
  if (isSupabaseConfigured) {
    try {
      return await getSupabaseStudentProjects(studentId);
    } catch (err) {
      console.warn("Supabase getStudentProjects failed, falling back to Firestore:", err);
    }
  }

  const projectsCol = collection(db, 'projects');
  const q = query(projectsCol, where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
  
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  } catch (error) {
    console.error("Error with ordered query, falling back to simple query:", error);
    // In case indexes are still building in Firestore
    const qSimple = query(projectsCol, where('studentId', '==', studentId));
    const snap = await getDocs(qSimple);
    const projects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    return projects.sort((a, b) => {
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
      return dateB - dateA;
    });
  }
}

// Fetch All Projects (for Admin Oversight)
export async function getAllProjects(): Promise<Project[]> {
  if (isSupabaseConfigured) {
    try {
      return await getSupabaseAllProjects();
    } catch (err) {
      console.warn("Supabase getSupabaseAllProjects failed, falling back to Firestore:", err);
    }
  }

  const projectsCol = collection(db, 'projects');
  const snap = await getDocs(projectsCol);
  const projects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
  return projects.sort((a, b) => {
    const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
    const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
    return dateB - dateA;
  });
}

// Fetch Projects Assigned to a Mentor
export async function getMentorProjects(mentorId: string): Promise<Project[]> {
  if (isSupabaseConfigured) {
    try {
      return await getSupabaseMentorProjects(mentorId);
    } catch (err) {
      console.warn("Supabase getMentorProjects failed, falling back to Firestore:", err);
    }
  }

  const projectsCol = collection(db, 'projects');
  const q = query(projectsCol, where('mentorId', '==', mentorId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

// Update Project Milestone Status
export async function updateMilestoneStatus(
  projectId: string, 
  milestones: Milestone[]
): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      return await updateSupabaseMilestoneStatus(projectId, milestones);
    } catch (err) {
      console.warn("Supabase updateMilestoneStatus failed, falling back to Firestore:", err);
    }
  }

  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, { milestones });
}

// Add Feedback & Update Project Status
export async function addMentorFeedback(
  projectId: string,
  mentorId: string,
  mentorName: string,
  comment: string,
  newStatus: Project['status']
): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      return await addSupabaseMentorFeedback(projectId, mentorId, mentorName, comment, newStatus);
    } catch (err) {
      console.warn("Supabase addMentorFeedback failed, falling back to Firestore:", err);
    }
  }

  const projectRef = doc(db, 'projects', projectId);
  const feedbackItem: FeedbackComment = {
    id: `fb-${Math.floor(100000 + Math.random() * 900000)}`,
    mentorId,
    mentorName,
    comment,
    status: newStatus,
    createdAt: new Date().toISOString()
  };

  await updateDoc(projectRef, {
    status: newStatus,
    feedback: arrayUnion(feedbackItem)
  });
}

// Submit Support Query
export async function submitSupportQuery(name: string, email: string, subject: string, message: string): Promise<string> {
  if (isSupabaseConfigured) {
    try {
      return await submitSupabaseSupportQuery(name, email, subject, message);
    } catch (err) {
      console.warn("Supabase submitSupportQuery failed, falling back to Firestore:", err);
    }
  }

  const queriesCol = collection(db, 'queries');
  const newQuery: Omit<SupportQuery, 'id'> = {
    name,
    email,
    subject,
    message,
    createdAt: Timestamp.now(),
    status: 'open'
  };
  const docRef = await addDoc(queriesCol, newQuery);
  return docRef.id;
}
