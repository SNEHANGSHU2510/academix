export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type TargetType = 'ALL' | 'TEACHERS' | 'CLASS';
export type ReactionType = 'LIKE' | 'LOVE' | 'THANKFUL' | 'CELEBRATE';
export type FileCategory = 'image' | 'pdf' | 'document' | 'zip' | 'spreadsheet' | 'presentation';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  class_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface ClassStandard {
  id: string;
  name: string;
  created_at: string;
}

export interface StudentPromotion {
  id: string;
  student_id: string;
  class_id: string;
  session_id: string;
  promoted_at: string;
  created_at: string;
  student?: UserProfile;
  class_standard?: ClassStandard;
  session?: AcademicSession;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  author_id: string;
  target_type: TargetType;
  target_class_id?: string;
  tagged_user_id?: string;
  attachment_url?: string;
  photo_url?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
  author?: UserProfile;
  reactions?: NoticeReaction[];
  reactions_count?: Record<ReactionType, number>;
  user_reaction?: ReactionType;
}

export interface NoticeReaction {
  id: string;
  notice_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
  user?: UserProfile;
}

export interface AcademicResult {
  id: string;
  student_id: string;
  session_id: string;
  class_id: string;
  subject: string;
  marks_obtained: number;
  max_marks: number;
  grade: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  student?: UserProfile;
  class_standard?: ClassStandard;
  session?: AcademicSession;
}

export interface ChatChannel {
  id: string;
  student_id?: string;
  teacher_id?: string;
  created_at: string;
  student?: UserProfile;
  teacher?: UserProfile;
  last_message?: string;
  last_message_at?: string;
  messages?: { id: string; sender_id: string }[];
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content?: string;
  is_read?: boolean;
  created_at: string;
  sender?: UserProfile;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: FileCategory;
  file_size: number;
  created_at: string;
}

export interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}
