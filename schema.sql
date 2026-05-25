-- ========================================================
-- SCHOOL MANAGEMENT APPLICATION DATABASE SCHEMA & MIGRATIONS
-- ========================================================

-- Drop old tables if they exist to avoid collision
DROP TABLE IF EXISTS public.notice_reactions CASCADE;
DROP TABLE IF EXISTS public.notices CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.society_settings CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;
DROP TYPE IF EXISTS balance_field CASCADE;

-- Create Roles Enum
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- 1. Create USERS table linked to auth.users
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'STUDENT',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Create ACADEMIC SESSIONS table
CREATE TABLE public.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- e.g. '2025-26'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Insert a default academic session
INSERT INTO public.sessions (name, start_date, end_date, is_active)
VALUES ('2025-26', '2025-06-01', '2026-04-30', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 3. Create CLASSES standard table
CREATE TABLE public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- e.g. '10-A', '9-B'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Insert default school classes
INSERT INTO public.classes (name) VALUES 
('5'), ('6'), ('7'), ('8'), ('9'), ('10'), ('11'), ('12')
ON CONFLICT (name) DO NOTHING;

-- 4. Create STUDENT PROMOTIONS mapping standard
CREATE TABLE public.student_promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT student_session_unique UNIQUE (student_id, session_id)
);

ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

-- 5. Create NOTICES board table
CREATE TABLE public.notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('ALL', 'TEACHERS', 'CLASS')),
    target_class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- 6. Create NOTICE REACTIONS table
CREATE TABLE public.notice_reactions (
    notice_id UUID REFERENCES public.notices(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reaction TEXT NOT NULL CHECK (reaction IN ('LIKE', 'LOVE', 'THANKFUL', 'CELEBRATE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (notice_id, user_id)
);

ALTER TABLE public.notice_reactions ENABLE ROW LEVEL SECURITY;

-- 7. Create ACADEMIC RESULTS scorecard
CREATE TABLE public.results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    marks_obtained NUMERIC NOT NULL,
    max_marks NUMERIC NOT NULL DEFAULT 100,
    grade TEXT NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- 8. Create CHATS thread mapping
CREATE TABLE public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chat_participants_check CHECK (student_id IS NOT NULL OR teacher_id IS NOT NULL)
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- 9. Create CHAT MESSAGES table
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 10. Create MESSAGE ATTACHMENTS mapping
CREATE TABLE public.message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'document')),
    file_size NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES DEFINITIONS
-- ========================================================

-- Users Policies
CREATE POLICY "Allow public select of user profiles" 
ON public.users FOR SELECT USING (true);

CREATE POLICY "Allow self profile update" 
ON public.users FOR UPDATE USING (auth.uid() = id);

-- Sessions Policies
CREATE POLICY "Allow public select of sessions" 
ON public.sessions FOR SELECT USING (true);

CREATE POLICY "Allow admins full sessions manage" 
ON public.sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Classes Policies
CREATE POLICY "Allow public select of classes" 
ON public.classes FOR SELECT USING (true);

CREATE POLICY "Allow admins full classes manage" 
ON public.classes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Student Promotions Policies
CREATE POLICY "Allow public select of promotions" 
ON public.student_promotions FOR SELECT USING (true);

CREATE POLICY "Allow admins full promotions manage" 
ON public.student_promotions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Notices Board Policies
CREATE POLICY "Allow view targeted notices" 
ON public.notices FOR SELECT USING (
    target_type = 'ALL' 
    OR (target_type = 'TEACHERS' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('TEACHER', 'ADMIN')))
    OR (target_type = 'CLASS' AND (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
        OR EXISTS (SELECT 1 FROM public.student_promotions WHERE student_id = auth.uid() AND class_id = target_class_id)
    ))
);

CREATE POLICY "Allow teachers and admins notice publish" 
ON public.notices FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('TEACHER', 'ADMIN'))
);

CREATE POLICY "Allow notice edit by author or admin" 
ON public.notices FOR ALL USING (
    author_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Notice Reactions Policies
CREATE POLICY "Allow public select of reactions" 
ON public.notice_reactions FOR SELECT USING (true);

CREATE POLICY "Allow self reaction write" 
ON public.notice_reactions FOR ALL USING (auth.uid() = user_id);

-- Results Scorecard Policies
CREATE POLICY "Allow students view own results" 
ON public.results FOR SELECT USING (
    student_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('TEACHER', 'ADMIN'))
);

CREATE POLICY "Allow teachers and admins results manage" 
ON public.results FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('TEACHER', 'ADMIN'))
);

-- Chats Policies
CREATE POLICY "Allow chat participants select" 
ON public.chats FOR SELECT USING (
    student_id = auth.uid() 
    OR teacher_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Allow authenticated chat create" 
ON public.chats FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Messages Policies
CREATE POLICY "Allow message thread view" 
ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.chats 
        WHERE id = chat_id AND (
            student_id = auth.uid() 
            OR teacher_id = auth.uid() 
            OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
        )
    )
);

CREATE POLICY "Allow send message inside chat" 
ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (
        SELECT 1 FROM public.chats 
        WHERE id = chat_id AND (
            student_id = auth.uid() 
            OR teacher_id = auth.uid() 
            OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
        )
    )
);

-- Message Attachments Policies
CREATE POLICY "Allow attachment select" 
ON public.message_attachments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.messages m 
        JOIN public.chats c ON m.chat_id = c.id 
        WHERE m.id = message_id AND (
            c.student_id = auth.uid() 
            OR c.teacher_id = auth.uid() 
            OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
        )
    )
);

CREATE POLICY "Allow attachment insert by sender" 
ON public.message_attachments FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.messages m 
        WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
);

-- ========================================================
-- AUTOMATIC NEW USER SIGNUP SYNCHRONIZATION FUNCTION
-- ========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    metadata_role TEXT;
    final_role public.user_role;
BEGIN
    -- Read metadata metadata_role with fallbacks
    metadata_role := COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT');
    
    IF metadata_role = 'ADMIN' THEN
        final_role := 'ADMIN';
    ELSIF metadata_role = 'TEACHER' THEN
        final_role := 'TEACHER';
    ELSE
        final_role := 'STUDENT';
    END IF;

    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        final_role
    )
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sync trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ========================================================
-- REAL-TIME ENABLEMENT FOR SYSTEM TABLES
-- ========================================================

begin;
  -- remove existing publications if any
  drop publication if exists supabase_realtime;
  
  -- create new publication including active tables
  create publication supabase_realtime for table 
    public.notices, 
    public.notice_reactions, 
    public.chats, 
    public.messages, 
    public.message_attachments;
commit;

-- ========================================================
-- STORAGE BUCKETS AND FILE POLICIES CONFIGURATION
-- ========================================================

-- Insert attachments bucket into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attachments', 
    'attachments', 
    true, 
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage objects (chats attachment folder structures)
CREATE POLICY "Allow public read of storage objects"
ON storage.objects FOR SELECT USING (bucket_id = 'attachments');

CREATE POLICY "Allow authenticated file upload"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'attachments' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow owners to delete storage objects"
ON storage.objects FOR DELETE USING (
    bucket_id = 'attachments' 
    AND owner = auth.uid()
);
