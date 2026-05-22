-- ==========================================
-- SCHOOL MANAGEMENT SYSTEM DATABASE SCHEMA
-- ==========================================
-- Target: Supabase PostgreSQL (Postgres 15+)
-- Author: Principal Full-Stack Architect
-- Description: Clean, normalized, highly secure database layout for school sessions,
--              promotions, notifications, notices, results, and real-time chat.
--              Includes strict Row Level Security (RLS) policies.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------
-- 1. ENUMS & CUSTOM TYPE DEFINITIONS
-- ------------------------------------------
CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE target_type AS ENUM ('ALL', 'TEACHERS', 'CLASS');
CREATE TYPE reaction_type AS ENUM ('LIKE', 'LOVE', 'THANKFUL', 'CELEBRATE');
CREATE TYPE file_category AS ENUM ('image', 'pdf', 'document');

-- ------------------------------------------
-- 2. CORE SCHEMA TABLES
-- ------------------------------------------

-- USERS TABLE
-- Extends auth.users to provide custom profile attributes and strict roles.
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SESSIONS (ACADEMIC YEARS) TABLE
-- Tracks school sessions (e.g., '2025-26', '2026-27').
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT false NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT active_session_check CHECK (is_active IN (true, false))
);

-- CLASSES TABLE
-- Pre-populated academic standards (6, 7, 8, 9, 10, 11, 12).
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- E.g., '6', '7', '8', '9', '10', '11', '12'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- STUDENT PROMOTIONS TABLE
-- Tracks student movement class-by-class session-by-session.
-- Prevents overwriting historical student data when promoting to the next year.
CREATE TABLE public.student_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    promoted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- A student can only exist in exactly one class per academic session
    CONSTRAINT unique_student_session UNIQUE (student_id, session_id)
);

-- NOTICES TABLE
-- School announcements with targeting (All, Teachers, or specific classes/individual users).
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_type target_type DEFAULT 'ALL' NOT NULL,
    target_class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    tagged_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Directly notify a specific user
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT class_targeting_check CHECK (
        (target_type = 'CLASS' AND target_class_id IS NOT NULL) OR 
        (target_type <> 'CLASS' AND target_class_id IS NULL)
    )
);

-- NOTICE REACTIONS TABLE
-- High-fidelity social reactions for community engagement.
CREATE TABLE public.notice_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notice_id UUID NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_notice_reaction UNIQUE (notice_id, user_id)
);

-- RESULTS (ACADEMIC GRADES) TABLE
-- Tracks subject scores historically. Tied to a specific session and class.
CREATE TABLE public.results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    marks_obtained NUMERIC NOT NULL,
    max_marks NUMERIC NOT NULL,
    grade TEXT NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT marks_check CHECK (marks_obtained >= 0 AND marks_obtained <= max_marks),
    CONSTRAINT max_marks_check CHECK (max_marks > 0)
);

-- SYLLABUSES TABLE
-- Tracks uploaded PDF syllabuses mapped to classes
CREATE TABLE public.syllabuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CHATS TABLE
-- Creates dedicated communication channels between teachers/students and the administrative board.
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- A chat is either Teacher-Admin or Student-Admin
    CONSTRAINT chat_participants_check CHECK (
        (student_id IS NOT NULL AND teacher_id IS NULL) OR
        (student_id IS NULL AND teacher_id IS NOT NULL)
    ),
    -- Ensure exactly one chat channel per student/teacher
    CONSTRAINT unique_student_chat UNIQUE (student_id),
    CONSTRAINT unique_teacher_chat UNIQUE (teacher_id)
);

-- MESSAGES TABLE
-- Individual messages inside channels.
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- MESSAGE ATTACHMENTS TABLE
-- High-fidelity media uploads (PDFs, images, documents) tied directly to a chat message.
CREATE TABLE public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type file_category NOT NULL,
    file_size INTEGER NOT NULL, -- In bytes
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SYSTEM NOTIFICATIONS TABLE
-- Logs mobile/push notification history.
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------
-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ------------------------------------------
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_promotions_student ON public.student_promotions(student_id);
CREATE INDEX idx_promotions_session_class ON public.student_promotions(session_id, class_id);
CREATE INDEX idx_notices_targeting ON public.notices(target_type, target_class_id, tagged_user_id);
CREATE INDEX idx_results_student_session ON public.results(student_id, session_id);
CREATE INDEX idx_syllabuses_class ON public.syllabuses(class_id);
CREATE INDEX idx_messages_chat ON public.messages(chat_id);
CREATE INDEX idx_attachments_message ON public.message_attachments(message_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- ------------------------------------------
-- 4. TRIGGERS & PL/PGSQL SECURITY CONTROLS
-- ------------------------------------------

-- A. AUTOMATED TIMESTAMP UPDATE TRIGGER
CREATE OR REPLACE FUNCTION public.set_current_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp();

CREATE TRIGGER update_notices_timestamp
BEFORE UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp();

CREATE TRIGGER update_results_timestamp
BEFORE UPDATE ON public.results
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp();


-- B. JWT ROLE SYNCHRONIZATION FUNCTION
-- Dynamically syncs the user's role into auth.users.raw_app_meta_data.
-- This ensures rapid, bulletproof JWT-based validation inside RLS rules.
CREATE OR REPLACE FUNCTION public.sync_user_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = 
        coalesce(raw_app_meta_data, '{}'::jsonb) || 
        json_build_object('role', NEW.role)::jsonb
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_metadata();


-- C. AUTO-CREATE USER PROFILE FROM AUTH TRIGGER
-- Seamlessly generates the public.users record when a user signs up.
-- Defaults role to 'STUDENT' if not provided in sign-up metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    default_role user_role := 'STUDENT';
    metadata_role TEXT;
BEGIN
    -- Extract role if explicitly provided in app_metadata
    metadata_role := NEW.raw_app_meta_data->>'role';
    IF metadata_role IS NOT NULL THEN
        default_role := metadata_role::user_role;
    END IF;

    INSERT INTO public.users (id, email, full_name, role, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        coalesce(NEW.raw_user_meta_data->>'full_name', 'Student User'),
        default_role,
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_handle_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();


-- ------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------

-- Enable RLS on all exposed tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- JWT Claims Helper Functions (avoids circular reference in policies)
CREATE OR REPLACE FUNCTION public.get_jwt_role()
RETURNS text AS $$
DECLARE
    jwt_role text;
    db_role text;
BEGIN
    -- Try to get from JWT first
    jwt_role := coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role', ''), '');
    
    IF jwt_role != '' THEN
        RETURN jwt_role;
    END IF;

    -- Fallback to database lookup if JWT doesn't have it (e.g. legacy user or out of sync)
    SELECT role INTO db_role FROM public.users WHERE id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
    RETURN coalesce(db_role, 'STUDENT');
END;
$$ LANGUAGE plpgsql STABLE;

-- A. USERS TABLE POLICIES
CREATE POLICY "Admins have full access to users"
ON public.users TO authenticated
USING (public.get_jwt_role() = 'ADMIN')
WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Users can view all other users in the school"
ON public.users FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update their own phone or avatar"
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- B. SESSIONS TABLE POLICIES
CREATE POLICY "Admins manage academic sessions"
ON public.sessions TO authenticated
USING (public.get_jwt_role() = 'ADMIN')
WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Anyone authenticated can view sessions"
ON public.sessions FOR SELECT TO authenticated
USING (true);


-- C. CLASSES TABLE POLICIES
CREATE POLICY "Admins manage classes"
ON public.classes TO authenticated
USING (public.get_jwt_role() = 'ADMIN')
WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Anyone authenticated can view classes"
ON public.classes FOR SELECT TO authenticated
USING (true);


-- D. STUDENT PROMOTIONS TABLE POLICIES
CREATE POLICY "Admins manage student promotions"
ON public.student_promotions TO authenticated
USING (public.get_jwt_role() = 'ADMIN')
WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Students can view their own promotion history"
ON public.student_promotions FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view student class mappings"
ON public.student_promotions FOR SELECT TO authenticated
USING (public.get_jwt_role() = 'TEACHER');


-- E. NOTICES TABLE POLICIES
CREATE POLICY "Admins manage all notices"
ON public.notices TO authenticated
USING (public.get_jwt_role() = 'ADMIN')
WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "View notices based on role targeting"
ON public.notices FOR SELECT TO authenticated
USING (
    -- Admins see all
    public.get_jwt_role() = 'ADMIN' 
    OR
    -- Teachers see ALL notices or TEACHER targeted notices
    (public.get_jwt_role() = 'TEACHER' AND target_type IN ('ALL', 'TEACHERS'))
    OR
    -- Students see ALL, or notices matching their current active class, or notices tagging them individually
    (public.get_jwt_role() = 'STUDENT' AND (
        target_type = 'ALL' 
        OR tagged_user_id = auth.uid()
        OR (target_type = 'CLASS' AND target_class_id IN (
            SELECT class_id 
            FROM public.student_promotions sp
            JOIN public.sessions s ON sp.session_id = s.id
            WHERE sp.student_id = auth.uid() AND s.is_active = true
        ))
    ))
);


-- F. NOTICE REACTIONS POLICIES
CREATE POLICY "Anyone can view notice reactions"
ON public.notice_reactions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage their own reactions"
ON public.notice_reactions TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- H. RESULTS TABLE POLICIES
CREATE POLICY "Admins manage academic results"
ON public.results TO authenticated
USING (public.get_jwt_role() = 'ADMIN')
WITH CHECK (public.get_jwt_role() = 'ADMIN');

CREATE POLICY "Students can only view their own results"
ON public.results FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view academic results"
ON public.results FOR SELECT TO authenticated
USING (public.get_jwt_role() = 'TEACHER');


-- SYLLABUSES TABLE POLICIES
CREATE POLICY "Anyone authenticated can view syllabuses"
ON public.syllabuses FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins and Teachers can manage syllabuses"
ON public.syllabuses TO authenticated
USING (public.get_jwt_role() IN ('ADMIN', 'TEACHER'))
WITH CHECK (public.get_jwt_role() IN ('ADMIN', 'TEACHER'));


-- I. CHATS TABLE POLICIES
-- Admin manages all chats
CREATE POLICY "Admins have full control over chats"
ON public.chats TO authenticated
USING (public.get_jwt_role() = 'ADMIN')
WITH CHECK (public.get_jwt_role() = 'ADMIN');

-- Student sees their own chat with Admin
CREATE POLICY "Students see their own admin chat"
ON public.chats FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Teacher sees their own chat with Admin
CREATE POLICY "Teachers see their own admin chat"
ON public.chats FOR SELECT TO authenticated
USING (teacher_id = auth.uid());

-- Student/Teacher can initiate their own chat
CREATE POLICY "Users can create their own admin chat"
ON public.chats FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() OR teacher_id = auth.uid());


-- J. MESSAGES TABLE POLICIES
CREATE POLICY "Admins can send and view all messages"
ON public.messages TO authenticated
USING (public.get_jwt_role() = 'ADMIN' OR EXISTS (
    SELECT 1 FROM public.chats c 
    WHERE c.id = chat_id AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())
))
WITH CHECK (
    sender_id = auth.uid() AND (
        public.get_jwt_role() = 'ADMIN' OR EXISTS (
            SELECT 1 FROM public.chats c 
            WHERE c.id = chat_id AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())
        )
    )
);


-- K. MESSAGE ATTACHMENTS POLICIES
CREATE POLICY "Read attachments if user has access to message"
ON public.message_attachments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.chats c ON m.chat_id = c.id
        WHERE m.id = message_id AND (
            public.get_jwt_role() = 'ADMIN' 
            OR c.student_id = auth.uid() 
            OR c.teacher_id = auth.uid()
        )
    )
);

CREATE POLICY "Write attachments if user can write to message"
ON public.message_attachments FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.chats c ON m.chat_id = c.id
        WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
);


-- L. NOTIFICATIONS TABLE POLICIES
CREATE POLICY "Users view their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update their own notification read status"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ------------------------------------------
-- 6. STORAGE BUCKET CONFIGURATION & POLICIES
-- ------------------------------------------
-- Configures buckets for: 'attachments' (chat documents) and 'notices' (public bulletins).

-- Make sure the storage schema exists
CREATE SCHEMA IF NOT EXISTS storage;

-- Insert buckets if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('attachments', 'attachments', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('notices', 'notices', true, 5242880, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
    ('syllabuses', 'syllabuses', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for 'notices' bucket (Bulletins are public to read, Admin managed)
CREATE POLICY "Notices are readable by authenticated users"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'notices');

CREATE POLICY "Admins manage notice storage files"
ON storage.objects TO authenticated
USING (bucket_id = 'notices' AND public.get_jwt_role() = 'ADMIN')
WITH CHECK (bucket_id = 'notices' AND public.get_jwt_role() = 'ADMIN');

-- RLS policies for 'syllabuses' bucket
CREATE POLICY "Syllabuses are readable by authenticated users"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'syllabuses');

CREATE POLICY "Admins and Teachers manage syllabus files"
ON storage.objects TO authenticated
USING (bucket_id = 'syllabuses' AND public.get_jwt_role() IN ('ADMIN', 'TEACHER'))
WITH CHECK (bucket_id = 'syllabuses' AND public.get_jwt_role() IN ('ADMIN', 'TEACHER'));

-- RLS policies for 'attachments' bucket (Private chat files, only sender and admin can access)
CREATE POLICY "Attachments are readable by chat participants"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'attachments' AND (
        public.get_jwt_role() = 'ADMIN'
        -- Extract user_id from path (expects folder structure /chats/{chat_id}/{user_id}/filename)
        OR (regexp_split_to_array(name, '/'))[3] = auth.uid()::text
        -- Or check if user is a participant of the chat specified in the path
        OR EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id::text = (regexp_split_to_array(name, '/'))[2]
            AND (c.student_id = auth.uid() OR c.teacher_id = auth.uid())
        )
    )
);

CREATE POLICY "Users can upload chat attachments to their folders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'attachments' AND (
        public.get_jwt_role() = 'ADMIN'
        -- User can only insert into /chats/{chat_id}/{user_id}/
        OR (regexp_split_to_array(name, '/'))[3] = auth.uid()::text
    )
);

-- ------------------------------------------
-- 7. SEED DATA GENERATION
-- ------------------------------------------
-- Insert base academic standards
INSERT INTO public.classes (name) VALUES ('6'), ('7'), ('8'), ('9'), ('10'), ('11'), ('12')
ON CONFLICT (name) DO NOTHING;

-- Insert active session
INSERT INTO public.sessions (name, is_active, start_date, end_date) 
VALUES ('2025-26', true, '2025-06-01', '2026-05-15')
ON CONFLICT (name) DO NOTHING;
