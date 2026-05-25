import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabaseClient';
import { 
  Users, 
  BookOpen, 
  Megaphone, 
  MessageSquare,
  TrendingUp,
  Activity,
  ShieldAlert,
  Database
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { activeSession } = useUIStore();
  const [stats, setStats] = useState({ students: 0, teachers: 0, notices: 0, chats: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, teachers, notices, chats] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'TEACHER'),
          supabase.from('notices').select('*', { count: 'exact', head: true }),
          supabase.from('chats').select('*', { count: 'exact', head: true })
        ]);
        setStats({
          students: students.count || 0,
          teachers: teachers.count || 0,
          notices: notices.count || 0,
          chats: chats.count || 0
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();

    const channels = [
      supabase.channel('admin-stats-users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchStats).subscribe(),
      supabase.channel('admin-stats-notices').on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, fetchStats).subscribe(),
      supabase.channel('admin-stats-chats').on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchStats).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  return (
    <div className="animate-fade-in pb-20 p-10 max-w-7xl mx-auto space-y-8">
      
      {/* 3D Hero Command Center Panel */}
      <div className="glass-panel p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#121212]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-sapphire/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-6 shadow-glow-primary">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-black text-primary uppercase tracking-widest">Admin Command Center</span>
            </div>
            <h2 className="text-5xl font-display font-black text-white mb-2 tracking-tight">
              System Overview
            </h2>
            <p className="text-gray-400 font-medium text-lg max-w-xl">
              Monitor network health, user metrics, and academic administration for {activeSession?.name || 'the current session'}.
            </p>
          </div>
          
          <div className="hidden lg:block text-right">
            <div className="text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-2xl">
              {stats.students + stats.teachers}
            </div>
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Total Active Scholars</div>
          </div>
        </div>
      </div>

      {/* 3D Glassmorphic Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Enrolled Students', value: stats.students, icon: Users, color: 'text-primary', glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]' },
          { label: 'Faculty Members', value: stats.teachers, icon: BookOpen, color: 'text-accent-emerald', glow: 'group-hover:shadow-[0_0_30px_rgba(52,211,153,0.3)]' },
          { label: 'Active Bulletins', value: stats.notices, icon: Megaphone, color: 'text-accent-sapphire', glow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]' },
          { label: 'Network Messages', value: stats.chats, icon: MessageSquare, color: 'text-accent-rose', glow: 'group-hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]' }
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

      {/* Complex Layout Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Activity Stream */}
        <div className="lg:col-span-2 bg-surface/20 backdrop-blur-md rounded-3xl border border-white/5 p-8 flex flex-col shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center space-x-3">
              <Activity className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-white tracking-wide">Live Telemetry</h3>
            </div>
            <button className="text-xs font-bold bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-full transition-colors border border-white/10">View All</button>
          </div>
          
          <div className="flex-1 space-y-4 relative z-10">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="bg-[#0a0a0a]/50 border border-white/5 rounded-2xl p-4 flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-200">System backup completed successfully</p>
                  <p className="text-xs text-gray-500 mt-1">Today at {10 - i}:00 AM</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Status */}
        <div className="space-y-8">
          <div className="glass-panel rounded-3xl border border-primary/30 p-8 relative overflow-hidden shadow-glow-primary">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />
            <div className="flex items-center space-x-3 mb-2 relative z-10">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-white tracking-wide">Current Session</h3>
            </div>
            <p className="text-4xl font-display font-black text-white mt-6 mb-2 relative z-10 drop-shadow-md">
              {activeSession?.name || 'Loading...'}
            </p>
            <div className="inline-flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 relative z-10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-primary tracking-widest uppercase">Database Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
