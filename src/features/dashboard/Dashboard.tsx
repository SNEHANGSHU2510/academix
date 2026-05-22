import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabaseClient';
import { 
  Users, 
  Megaphone, 
  MessageSquare, 
  Sparkles, 
  ArrowRight,
  Plus,
  Loader2,
  Bell,
  Award
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, activeSession, setActiveView } = useUIStore();
  const [stats, setStats] = useState({
    studentsCount: 0,
    teachersCount: 0,
    noticesCount: 0,
    chatsCount: 0,
    syllabusCount: 0,
  });
  const [studentClassName, setStudentClassName] = useState<string>('');
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch student's actual class from student_promotions (runs once)
  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return;

    const fetchStudentClass = async () => {
      try {
        const { data } = await supabase
          .from('student_promotions')
          .select('class_id, classes:class_id(name)')
          .eq('student_id', user.id)
          .limit(1)
          .maybeSingle();

        if (data) {
          const className = (data as any).classes?.name || '';
          setStudentClassName(className);
          setStudentClassId(data.class_id);
        }
      } catch (err) {
        console.warn('Failed to fetch student class:', err);
      }
    };
    fetchStudentClass();
  }, [user?.id]);

  // Fetch stats + subscribe to real-time. Re-runs when studentClassId resolves.
  useEffect(() => {
    fetchStats();

    const usersChannel = supabase
      .channel('public:dashboard_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchStats();
      })
      .subscribe();

    const noticesChannel = supabase
      .channel('public:dashboard_notices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        fetchStats();
      })
      .subscribe();

    const chatsChannel = supabase
      .channel('public:dashboard_chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchStats();
      })
      .subscribe();

    const syllabusChannel = supabase
      .channel('public:dashboard_syllabuses_' + (studentClassId || 'all'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'syllabuses' }, () => {
        fetchStats();
      })
      .subscribe();

    const scheduleChannel = supabase
      .channel('public:dashboard_schedules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faculty_schedules' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(noticesChannel);
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(syllabusChannel);
      supabase.removeChannel(scheduleChannel);
    };
  }, [studentClassId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const isGuest = user?.id === '00000000-0000-0000-0000-000000000000';

      const studentsPromise = supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'STUDENT');

      const teachersPromise = supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'TEACHER');

      const noticesPromise = supabase
        .from('notices')
        .select('*', { count: 'exact', head: true });

      const chatsPromise = supabase
        .from('chats')
        .select('*', { count: 'exact', head: true });

      let syllabusPromise;
      if (user?.role === 'TEACHER') {
        syllabusPromise = supabase
          .from('faculty_schedules')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id);
      } else if (user?.role === 'STUDENT' && studentClassId) {
        syllabusPromise = supabase
          .from('syllabuses')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', studentClassId);
      } else {
        syllabusPromise = supabase
          .from('syllabuses')
          .select('*', { count: 'exact', head: true });
      }

      // 5-second query timeout to prevent any infinite spinner hang
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Stats fetch timeout')), 5000)
      );

      const results = await Promise.race([
        Promise.all([
          studentsPromise,
          teachersPromise,
          noticesPromise,
          chatsPromise,
          syllabusPromise
        ]),
        timeoutPromise
      ]) as any[];

      const students = results[0]?.count;
      const teachers = results[1]?.count;
      const notices = results[2]?.count;
      const chats = results[3]?.count;
      const syllabusCount = results[4]?.count || 0;

      setStats({
        studentsCount: students ?? (isGuest ? 120 : 0),
        teachersCount: teachers ?? (isGuest ? 48 : 0),
        noticesCount: notices ?? (isGuest ? 5 : 0),
        chatsCount: chats ?? (isGuest ? 28 : 0),
        syllabusCount,
      });
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerPushNotification = () => {
    showToast('Simulated push notice broadcasted successfully!', 'success');
  };

  // 1. SCHOOL ADMINISTRATOR VIEW
  const renderAdminDashboard = () => (
    <div className="flex flex-col space-y-7">
      {/* Header bar with avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3.5 animate-scale-in">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent-purple to-primary flex items-center justify-center font-bold text-background font-display shadow-glow-primary border border-primary/20">
            AH
          </div>
          <div>
            <h2 className="text-lg font-display font-extrabold text-neutral-text leading-tight">
              Administrator Hub
            </h2>
            <p className="text-[10px] text-neutral-muted uppercase tracking-wider font-semibold opacity-85">
              Managing Academic Term {activeSession?.name || '2025-26'}
            </p>
          </div>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      {/* Stats Cards Grid (Recessed containment wells) */}
      <div className="grid grid-cols-2 gap-3.5 animate-slide-up">
        <div 
          onClick={() => setActiveView('promotions')}
          className="glass-card p-4 rounded-xl flex flex-col space-y-1.5 border border-neutral-border/20 hover:border-primary/40 cursor-pointer active:scale-98 transition-all hover:bg-surface/10"
        >
          <div className="flex items-center justify-between text-neutral-muted">
            <span className="text-[9px] font-extrabold uppercase tracking-wider">Total Students</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-display font-black text-neutral-text">{stats.studentsCount}</p>
        </div>

        <div 
          onClick={() => setActiveView('promotions')}
          className="glass-card p-4 rounded-xl flex flex-col space-y-1.5 border border-neutral-border/20 hover:border-accent-purple/40 cursor-pointer active:scale-98 transition-all hover:bg-surface/10"
        >
          <div className="flex items-center justify-between text-neutral-muted">
            <span className="text-[9px] font-extrabold uppercase tracking-wider">Lecturer Faculty</span>
            <Users className="w-4 h-4 text-accent-purple" />
          </div>
          <p className="text-2xl font-display font-black text-neutral-text">{stats.teachersCount}</p>
        </div>

        <div 
          onClick={() => setActiveView('notices')}
          className="glass-card p-4 rounded-xl flex flex-col space-y-1.5 border border-neutral-border/20 hover:border-accent-gold/40 cursor-pointer active:scale-98 transition-all hover:bg-surface/10"
        >
          <div className="flex items-center justify-between text-neutral-muted">
            <span className="text-[9px] font-extrabold uppercase tracking-wider">Active Bulletins</span>
            <Megaphone className="w-4 h-4 text-accent-gold" />
          </div>
          <p className="text-2xl font-display font-black text-neutral-text">{stats.noticesCount}</p>
        </div>

        <div 
          onClick={() => setActiveView('chat')}
          className="glass-card p-4 rounded-xl flex flex-col space-y-1.5 border border-neutral-border/20 hover:border-primary/40 cursor-pointer active:scale-98 transition-all hover:bg-surface/10"
        >
          <div className="flex items-center justify-between text-neutral-muted">
            <span className="text-[9px] font-extrabold uppercase tracking-wider">System Chat Logs</span>
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-display font-black text-neutral-text">{stats.chatsCount}</p>
        </div>
      </div>

      {/* Active Session Spotlight (Glassmorphic Spotlight banner) */}
      <div className="glass-panel p-5 rounded-xl relative overflow-hidden select-none border-l-4 border-primary">
        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest">Platform Spotlight</span>
            </div>
            <h3 className="text-xs font-bold text-neutral-text uppercase tracking-wider">Academic Session {activeSession?.name || '2025-26'}</h3>
            <p className="text-[10px] text-neutral-muted mt-0.5 opacity-90 leading-relaxed">Centralized database controls, triggers, and Row Level Security active.</p>
          </div>
          <span className="text-[9px] font-extrabold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 uppercase tracking-wider">
            ACTIVE
          </span>
        </div>
      </div>

      {/* Operations List */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-border pb-2.5">
          <h3 className="text-[10px] font-black text-neutral-muted uppercase tracking-widest">System Operations</h3>
          <button 
            onClick={triggerPushNotification}
            className="text-[10px] font-bold text-primary hover:text-neutral-text flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <span>Post Notice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <div 
            onClick={() => setActiveView('notices')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-primary/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-accent-purple/20 border border-primary/10 text-primary flex items-center justify-center font-bold">
                📢
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">Post Notice</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Target notices to all users or specific classes</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div 
            onClick={() => setActiveView('chat')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-primary/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/10 text-primary flex items-center justify-center font-bold">
                💬
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">Direct Chats</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Secure correspondence with teachers and students</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div 
            onClick={() => setActiveView('promotions')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-accent-gold/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-accent-gold/20 border border-accent-gold/10 text-accent-gold flex items-center justify-center font-bold">
                🛡️
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">Student Promotion Registry</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Audit class enrollments and system permissions</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. SENIOR LECTURER VIEW
  const renderTeacherDashboard = () => {
    const teacherName = user?.full_name || 'Faculty';
    const teacherInitials = teacherName.split(' ').map((w: string) => w.charAt(0).toUpperCase()).join('').slice(0, 2);

    return (
    <div className="flex flex-col space-y-7">
      {/* Header bar with Lecturer details */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3.5 animate-scale-in">
          {user?.avatar_url ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-primary/20 shadow-glow-primary flex-shrink-0">
              <img src={user.avatar_url} alt={teacherName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center font-bold text-background font-display shadow-glow-primary border border-primary/20">
              {teacherInitials}
            </div>
          )}
          <div>
            <h2 className="text-lg font-display font-extrabold text-neutral-text leading-tight">
              {teacherName}
            </h2>
            <p className="text-[10px] text-neutral-muted uppercase tracking-wider font-semibold opacity-85">
              Faculty • Session {activeSession?.name || '2025-26'}
            </p>
          </div>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      {/* Recessed stats wells */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up">
        <div 
          onClick={() => setActiveView('syllabus')}
          className="glass-card p-3 rounded-xl flex flex-col space-y-1.5 border border-neutral-border/20 text-center hover:border-primary/40 cursor-pointer active:scale-98 transition-all hover:bg-surface/10"
        >
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-neutral-muted block">My Schedule</span>
          <p className="text-lg font-display font-black text-neutral-text">{stats.syllabusCount}</p>
        </div>

        <div 
          onClick={() => setActiveView('notices')}
          className="glass-card p-3 rounded-xl flex flex-col space-y-1.5 border border-neutral-border/20 text-center hover:border-accent-rose/40 cursor-pointer active:scale-98 transition-all hover:bg-surface/10"
        >
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-neutral-muted block">Bulletins</span>
          <p className="text-lg font-display font-black text-neutral-text">{stats.noticesCount}</p>
        </div>
      </div>

      {/* Active Tasks Spotlight (Glassmorphic Spotlight banner) */}
      <div className="glass-panel p-5 rounded-xl relative overflow-hidden border-l-4 border-accent-rose">
        <div className="absolute right-0 top-0 w-24 h-24 bg-accent-rose/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 mb-1">
              <Bell className="w-3.5 h-3.5 text-accent-rose animate-pulse" />
              <span className="text-[9px] font-extrabold text-accent-rose uppercase tracking-widest">Urgent Duty Spotlight</span>
            </div>
            <h3 className="text-xs font-bold text-neutral-text uppercase tracking-wider">Examination Preparations</h3>
            <p className="text-[10px] text-neutral-muted mt-0.5 opacity-90 leading-relaxed">Final Term Examination papers and rubric approvals are due in 4 days.</p>
          </div>
        </div>
      </div>

      {/* Operations List */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-border pb-2.5">
          <h3 className="text-[10px] font-black text-neutral-muted uppercase tracking-widest">Class Registry Actions</h3>
        </div>

        <div className="space-y-3">
          <div 
            onClick={() => setActiveView('syllabus')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-primary/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/10 text-primary flex items-center justify-center font-bold">
                📋
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">View Teaching Schedule</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Your personalized routine published by admin</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div 
            onClick={() => setActiveView('notices')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-accent-gold/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-accent-gold/20 border border-accent-gold/10 text-accent-gold flex items-center justify-center font-bold">
                📣
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">Post Class Bulletin</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Broadcast announcements to your assigned student classes</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div 
            onClick={() => setActiveView('chat')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-primary/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-accent-purple/20 border border-primary/10 text-primary flex items-center justify-center font-bold">
                💬
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">Secure Student Chats</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Consult privately with students (Realtime enabled)</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  // 3. STUDENT DASHBOARD VIEW
  const renderStudentDashboard = () => {
    const displayName = user?.full_name || 'Student';
    const initials = displayName.split(' ').map((w: string) => w.charAt(0).toUpperCase()).join('').slice(0, 2);
    const classLabel = studentClassName || user?.class_id || '';

    return (
    <div className="flex flex-col space-y-7">
      {/* Header bar with Student details */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3.5 animate-scale-in">
          {user?.avatar_url ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-primary/20 shadow-glow-primary flex-shrink-0">
              <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center font-bold text-background font-display shadow-glow-primary border border-primary/20">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-lg font-display font-extrabold text-neutral-text leading-tight">
              {displayName}
            </h2>
            <p className="text-[10px] text-neutral-muted uppercase tracking-wider font-semibold opacity-85">
              {classLabel ? `Class ${classLabel} • ` : ''}Session {activeSession?.name || '2025-26'}
            </p>
          </div>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      {/* Recessed stats wells */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up">
        <div 
          onClick={() => setActiveView('syllabus')}
          className="glass-card p-3 rounded-xl flex flex-col space-y-1.5 border border-neutral-border/20 text-center hover:border-primary/40 cursor-pointer active:scale-98 transition-all hover:bg-surface/10"
        >
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-neutral-muted block">Syllabus</span>
          <p className="text-lg font-display font-black text-neutral-text">{stats.syllabusCount}</p>
        </div>

        <div 
          onClick={() => setActiveView('notices')}
          className="glass-card p-3 rounded-xl flex flex-col space-y-1.5 border border-neutral-border/20 text-center hover:border-primary/40 cursor-pointer active:scale-98 transition-all hover:bg-surface/10"
        >
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-neutral-muted block">Active Notices</span>
          <p className="text-lg font-display font-black text-neutral-text">{stats.noticesCount}</p>
        </div>
      </div>

      {/* Syllabus Spotlight (Glassmorphic Spotlight banner) */}
      <div className="glass-panel p-5 rounded-xl relative overflow-hidden border-l-4 border-primary">
        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest">Latest Syllabus Highlight</span>
            </div>
            <h3 className="text-xs font-bold text-neutral-text uppercase tracking-wider">Mathematics Syllabus Updated</h3>
            <p className="text-[10px] text-neutral-muted mt-0.5 opacity-90 leading-relaxed">PDF uploaded by Dr. Elizabeth Vance.</p>
          </div>
        </div>
      </div>

      {/* Operations List */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-border pb-2.5">
          <h3 className="text-[10px] font-black text-neutral-muted uppercase tracking-widest">Student Activities</h3>
        </div>

        <div className="space-y-3">
          <div 
            onClick={() => setActiveView('syllabus')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-primary/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/10 text-primary flex items-center justify-center font-bold">
                📊
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">View Class Syllabus</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Access formal curriculum structure and subject breakdown</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div 
            onClick={() => setActiveView('notices')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-accent-gold/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-accent-gold/20 border border-accent-gold/10 text-accent-gold flex items-center justify-center font-bold">
                📢
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">Central Bulletin Board</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Read active notices, alerts, and calendar notifications</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div 
            onClick={() => setActiveView('chat')}
            className="glass-card p-4 rounded-xl flex items-center justify-between hover:scale-[1.01] transition-all hover:bg-surface/10 cursor-pointer border border-neutral-border/10 hover:border-primary/30"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-accent-purple/20 border border-primary/10 text-primary flex items-center justify-center font-bold">
                💬
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-text">Direct Counselor Chat</p>
                <p className="text-[10px] text-neutral-muted opacity-85">Secure channel for career advising or grading issues</p>
              </div>
            </div>
            <button className="p-1.5 rounded-lg bg-neutral-border text-neutral-muted hover:text-neutral-text transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col px-4 py-5 animate-fade-in bg-background selection:bg-primary/30 selection:text-primary-50">
      {user?.role === 'ADMIN' ? renderAdminDashboard() :
       user?.role === 'TEACHER' ? renderTeacherDashboard() :
       renderStudentDashboard()}
    </div>
  );
};
