import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabaseClient';
import type { StudentPromotion, UserProfile } from '../../types';
import { 
  GraduationCap, 
  UserPlus, 
  ArrowRightLeft, 
  ShieldAlert, 
  Loader2,
  CalendarDays
} from 'lucide-react';

export const Promotions: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, classes, sessions, activeSession } = useUIStore();

  const [promotions, setPromotions] = useState<StudentPromotion[]>([]);
  const [unpromotedStudents, setUnpromotedStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedSessionId, setSelectedSessionId] = useState(activeSession?.id || '');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (activeSession) {
      setSelectedSessionId(activeSession.id);
    }
    fetchPromotionsAndStudents();
  }, [selectedSessionId, activeSession]);

  const fetchPromotionsAndStudents = async () => {
    if (user?.role !== 'ADMIN') return;

    try {
      setLoading(true);
      
      // Fetch currently promoted mappings for selected session
      const { data: promoData, error: promoError } = await supabase
        .from('student_promotions')
        .select(`
          *,
          student:users!student_id(*),
          class_standard:classes!class_id(*)
        `)
        .eq('session_id', selectedSessionId || activeSession?.id);

      if (promoError) throw promoError;
      setPromotions((promoData as StudentPromotion[]) || []);

      // Fetch all students to determine who is yet unpromoted
      const { data: studentData, error: studentError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'STUDENT')
        .order('full_name', { ascending: true });

      if (studentError) throw studentError;

      const allStudents = (studentData as UserProfile[]) || [];
      const promotedIds = new Set((promoData || []).map((p: any) => p.student_id));
      
      // Filter out students who are already promoted in this session
      const unpromoted = allStudents.filter(s => !promotedIds.has(s.id));
      setUnpromotedStudents(unpromoted);

    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !targetClassId || !selectedSessionId) return;

    try {
      setPromoting(true);
      
      const { error } = await supabase
        .from('student_promotions')
        .insert({
          student_id: targetStudentId,
          class_id: targetClassId,
          session_id: selectedSessionId,
        });

      if (error) throw error;

      showToast('Student successfully promoted to active standard!', 'success');
      setTargetStudentId('');
      setTargetClassId('');
      fetchPromotionsAndStudents();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPromoting(false);
    }
  };

  const handleRemovePromotion = async (promotionId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('student_promotions')
        .delete()
        .eq('id', promotionId);

      if (error) throw error;
      showToast('Student enrollment dismissed', 'success');
      fetchPromotionsAndStudents();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
        <ShieldAlert className="w-12 h-12 text-accent-rose animate-bounce" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Access Restrict Bounds</h3>
        <p className="text-xs text-gray-500 max-w-[280px]">Only the administrative board is authorized to configure class promotions.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 px-4 py-5 animate-fade-in">
      {/* View Header */}
      <div className="flex items-center justify-between select-none">
        <div>
          <h2 className="text-lg font-display font-extrabold text-white flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span>Academic Promotions</span>
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Year-over-year standard registry.</p>
        </div>
      </div>

      {/* Target Session configuration selector */}
      <div className="glass-card p-3 rounded-xl flex items-center space-x-2 border border-neutral-border">
        <CalendarDays className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="flex-1 bg-transparent text-gray-300 text-xs outline-none cursor-pointer"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name} Academic Session</option>
          ))}
        </select>
      </div>

      {/* Promotion Form */}
      <form onSubmit={handlePromoteStudent} className="glass-panel p-5 rounded-2xl border border-neutral-border shadow-premium space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
          <UserPlus className="w-4 h-4 text-primary" />
          <span>Enroll / Promote Student</span>
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Select Student</label>
            <select
              value={targetStudentId}
              onChange={(e) => setTargetStudentId(e.target.value)}
              className="w-full glass-input text-xs"
              required
            >
              <option value="">-- Choose student --</option>
              {unpromotedStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Assign Class Standard</label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full glass-input text-xs"
              required
            >
              <option value="">-- Choose target class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>Class {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={promoting || !targetStudentId || !targetClassId}
          className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold font-display uppercase hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-glow-primary"
        >
          {promoting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Register Promotion</span>
            </>
          )}
        </button>
      </form>

      {/* Promoted Student Registry List */}
      <div className="flex-1 flex flex-col space-y-3">
        <h3 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase pb-1 border-b border-neutral-border/30 select-none">
          Enrolled Student Registry ({promotions.length})
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-gray-500">Syncing registry lists...</p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-gray-600 animate-bounce" />
            <p className="text-xs font-bold text-white">Registry Empty</p>
            <p className="text-[10px] text-gray-500">No student enrollments registered for this session standard yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {promotions.map((promo) => (
              <div key={promo.id} className="glass-card p-3.5 rounded-xl border border-neutral-border flex items-center justify-between group animate-slide-up">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary font-display uppercase">
                    {promo.student?.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{promo.student?.full_name}</h4>
                    <p className="text-[9px] text-gray-400 mt-0.5">{promo.student?.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 select-none">
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 uppercase">
                    Class {promo.class_standard?.name}
                  </span>
                  
                  <button
                    onClick={() => handleRemovePromotion(promo.id)}
                    className="text-gray-500 hover:text-accent-rose text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
