export type UserRole = 'student' | 'mentor' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  department?: string;
  studentId?: string; // Student roll number/ID
  mentorId?: string; // Mentor ID/Employee code
  createdAt: any; // Firebase Timestamp or ISO string
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'approved' | 'rejected';
  completedAt?: any; // Firebase Timestamp or string
  attachmentUrl?: string;
  attachmentName?: string;
  githubUrl?: string;
  demoUrl?: string;
  accomplishments?: string;
}

export interface FeedbackComment {
  id: string;
  mentorId: string;
  mentorName: string;
  comment: string;
  status: 'approved' | 'rejected' | 'revision' | 'pending' | 'completed';
  createdAt: any;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  teamMembers: string; // Comma separated or text
  studentId: string;
  studentName: string;
  studentEmail: string;
  mentorId: string; // Assigned mentor
  mentorName: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision' | 'completed';
  createdAt: any;
  githubUrl?: string;
  demoUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  milestones: Milestone[];
  feedback: FeedbackComment[];
}

export interface SupportQuery {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: any;
  status: 'open' | 'resolved';
}
