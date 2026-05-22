import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { AcademicSession, ClassStandard } from '../types';

interface UIState {
  activeSession: AcademicSession | null;
  classes: ClassStandard[];
  sessions: AcademicSession[];
  activeView: 'dashboard' | 'notices' | 'results' | 'chat' | 'promotions' | 'profile' | 'syllabus' | 'members';
  loading: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  phonePreviewMode: boolean;
  setLoading: (loading: boolean) => void;
  setActiveView: (view: 'dashboard' | 'notices' | 'results' | 'chat' | 'promotions' | 'profile' | 'syllabus' | 'members') => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  setPhonePreviewMode: (mode: boolean) => void;
  fetchConfiguration: () => Promise<void>;
  createSession: (name: string, startDate: string, endDate: string) => Promise<boolean>;
  setActiveSession: (sessionId: string) => Promise<boolean>;
}

const FALLBACK_CLASSES = [
  { id: 'e09829bb-8bec-4bb8-ac0e-414186bea669', name: '5', created_at: new Date().toISOString() },
  { id: 'bf455005-f16b-46fa-a6c8-5492dcd81cd4', name: '6', created_at: new Date().toISOString() },
  { id: '3a680176-bb1b-4a11-a799-2b181606d440', name: '7', created_at: new Date().toISOString() },
  { id: 'e934e5ee-a8c9-429e-9121-02d443740e76', name: '8', created_at: new Date().toISOString() },
  { id: '0fdebd72-0c23-4462-a32e-e8775c44dda5', name: '9', created_at: new Date().toISOString() },
  { id: '6d9e396c-6219-4167-968d-1796818465b6', name: '10', created_at: new Date().toISOString() },
  { id: '25ac3f78-92de-454a-890e-811cf00744a6', name: '11', created_at: new Date().toISOString() },
  { id: 'ae77c81d-2a28-4f7c-bd37-6cae75db9f85', name: '12', created_at: new Date().toISOString() }
];

const FALLBACK_SESSIONS = [
  { id: 'session-2025-26', name: '2025-26', is_active: true, start_date: '2025-06-01', end_date: '2026-04-30', created_at: new Date().toISOString() }
];

export const useUIStore = create<UIState>((set, get) => ({
  activeSession: null,
  classes: [],
  sessions: [],
  activeView: 'dashboard',
  loading: false,
  toast: null,
  phonePreviewMode: true, // Default to true for simulated phone layouts

  setLoading: (loading) => set({ loading }),
  setActiveView: (activeView) => set({ activeView }),
  
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      get().clearToast();
    }, 3000);
  },
  
  clearToast: () => set({ toast: null }),
  setPhonePreviewMode: (phonePreviewMode) => set({ phonePreviewMode }),

  fetchConfiguration: async () => {
    try {
      set({ loading: true });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sync timeout')), 10000)
      );

      // Fetch classes with timeout
      const classesPromise = supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      // Fetch academic sessions with timeout
      const sessionsPromise = supabase
        .from('sessions')
        .select('*')
        .order('name', { ascending: true });

      const [classesResult, sessionsResult] = await Promise.all([
        Promise.race([classesPromise, timeoutPromise]),
        Promise.race([sessionsPromise, timeoutPromise])
      ]) as any;

      if (classesResult.error) throw classesResult.error;
      if (sessionsResult.error) throw sessionsResult.error;

      const classesData = classesResult.data;
      const sessionsData = sessionsResult.data;

      const active = sessionsData?.find((s: any) => s.is_active) || null;

      set({
        classes: (classesData as ClassStandard[]) || [],
        sessions: (sessionsData as AcademicSession[]) || [],
        activeSession: active,
      });
    } catch (err: any) {
      console.warn('Failed to load school configs from database. Using local sandbox fallback configurations:', err.message);
      set({
        classes: FALLBACK_CLASSES,
        sessions: FALLBACK_SESSIONS,
        activeSession: FALLBACK_SESSIONS[0]
      });
    } finally {
      set({ loading: false });
    }
  },

  createSession: async (name: string, startDate: string, endDate: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          name,
          start_date: startDate,
          end_date: endDate,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        sessions: [...state.sessions, data as AcademicSession],
      }));
      get().showToast('Academic session created successfully!', 'success');
      return true;
    } catch (err: any) {
      get().showToast(err.message || 'Failed to create session', 'error');
      return false;
    } finally {
      set({ loading: false });
    }
  },

  setActiveSession: async (sessionId: string) => {
    set({ loading: true });
    try {
      // Deactivate all first
      await supabase
        .from('sessions')
        .update({ is_active: false })
        .neq('id', sessionId);

      // Activate selected
      const { error } = await supabase
        .from('sessions')
        .update({ is_active: true })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // Re-fetch configuration to sync lists
      await get().fetchConfiguration();
      get().showToast('Active academic session updated!', 'success');
      return true;
    } catch (err: any) {
      get().showToast(err.message || 'Failed to set active session', 'error');
      return false;
    } finally {
      set({ loading: false });
    }
  },
}));
