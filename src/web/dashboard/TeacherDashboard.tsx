import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabaseClient';
import { 
  Users, 
  Calendar, 
  Megaphone,
  Clock,
  BookOpen,
  Award
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [classesCount, setClassesCount] = useState(0);
  const [noticesCount, setNoticesCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [classes, notices] = await Promise.all([
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('notices').select('*', { count: 'exact', head: true })
        ]);
        setClassesCount(classes.count || 0);
        setNoticesCount(notices.count || 0);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();

    const channels = [
      supabase.channel('teacher-stats-classes').on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchStats).subscribe(),
      supabase.channel('teacher-stats-notices').on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, fetchStats).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  return (
    <div className="animate-fade-in pb-20 p-10 max-w-7xl mx-auto space-y-8">
      
      {/* 3D Hero Command Center Panel */}
      <div className="glass-panel p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#121212]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-sapphire/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-accent-sapphire/10 border border-accent-sapphire/20 px-4 py-1.5 rounded-full mb-6 shadow-glow-primary">
            <BookOpen className="w-4 h-4 text-accent-sapphire" />
            <span className="text-[11px] font-black text-accent-sapphire uppercase tracking-widest">Faculty Portal</span>
          </div>
          <h2 className="text-5xl font-display font-black text-white mb-2 tracking-tight">
            Welcome, {user?.full_name?.split(' ')[0] || 'Teacher'}
          </h2>
          <p className="text-gray-400 font-medium text-lg max-w-xl">
            Access your teaching schedules, manage classes, and broadcast updates to your students.
          </p>
        </div>
      </div>

      {/* 3D Glassmorphic Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Assigned Classes', value: classesCount, icon: Users, color: 'text-accent-sapphire', glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]' },
          { label: 'Upcoming Lectures', value: '3', icon: Clock, color: 'text-primary', glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]' },
          { label: 'School Notices', value: noticesCount, icon: Megaphone, color: 'text-accent-rose', glow: 'group-hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]' }
        ].map((stat, i) => (
          <div key={i} className={`bg-surface/30 backdrop-blur-xl p-8 rounded-3xl border border-white/5 relative overflow-hidden group transition-all duration-500 ${stat.glow} hover:-translate-y-1`}>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
              <stat.icon className={`w-6 h-6 ${stat.color} drop-shadow-lg`} />
            </div>
            <span className="text-5xl font-display font-black text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Schedule */}
        <div className="lg:col-span-2 bg-surface/20 backdrop-blur-md rounded-3xl border border-white/5 p-8 flex flex-col shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-8 relative z-10">
            <Calendar className="w-6 h-6 text-accent-sapphire" />
            <h3 className="text-xl font-bold text-white tracking-wide">Today's Schedule</h3>
          </div>
          
          <div className="flex-1 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-12 text-center relative z-10 bg-black/20">
            <Award className="w-12 h-12 text-gray-600 mb-4" />
            <h4 className="text-lg font-bold text-gray-300">No scheduled classes today</h4>
            <p className="text-gray-500 mt-2 text-sm">Take time to prepare your syllabus or check school notices.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
