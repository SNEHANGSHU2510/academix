import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types';

/** Hardcoded admin email – always resolves to ADMIN role regardless of metadata */
const ADMIN_EMAIL = 'gejikhors@gmail.com';

/**
 * Resolves the user role from Supabase auth metadata.
 * Priority: email check → user_metadata.role → app_metadata.role → 'STUDENT'
 */
function resolveRole(authUser: any): 'ADMIN' | 'TEACHER' | 'STUDENT' {
  if (authUser?.email?.toLowerCase() === ADMIN_EMAIL) return 'ADMIN';
  const metaRole = authUser?.user_metadata?.role || authUser?.app_metadata?.role;
  if (metaRole === 'ADMIN' || metaRole === 'TEACHER') return metaRole;
  return 'STUDENT';
}

interface AuthState {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (emailOrPhone: string, password?: string) => Promise<boolean>;
  signUp: (emailOrPhone: string, password: string, fullName: string, role: 'ADMIN' | 'TEACHER' | 'STUDENT', classId?: string) => Promise<boolean>;
  enterAsGuest: (role: 'ADMIN' | 'TEACHER' | 'STUDENT') => void;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string, phone?: string, email?: string, avatarUrl?: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true });
      
      // Get initial session with a 10-second timeout to prevent offline hang
      const getSessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session timeout')), 10000)
      );

      const sessionResult = await Promise.race([getSessionPromise, timeoutPromise]) as any;
      const session = sessionResult?.data?.session || null;
      
      if (session) {
        // Fetch database profile for user roles with a 2-second timeout
        const profilePromise = supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const profileResult = await Promise.race([profilePromise, timeoutPromise]) as any;
        const profile = profileResult?.data || null;
        const profileError = profileResult?.error || null;

        if (!profileError && profile) {
          set({ 
            session, 
            user: { ...profile, class_id: session.user.user_metadata?.class_id } as UserProfile, 
            error: null 
          });
        } else {
          console.error('Error loading database profile:', profileError);
          // Fallback to JWT payload metadata for role if DB sync fails
          const fallbackRole = resolveRole(session.user);
          set({
            session,
            user: {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || (fallbackRole === 'ADMIN' ? 'SECRETARY' : 'Student User'),
              role: fallbackRole,
              phone: session.user.user_metadata?.phone,
              avatar_url: session.user.user_metadata?.avatar_url,
              class_id: session.user.user_metadata?.class_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          });
        }
      } else {
        set({ session: null, user: null });
      }
    } catch (err: any) {
      console.error('Auth initialization error:', err);
      // Fail silently and don't block the UI, just set default state
      set({ session: null, user: null });
    } finally {
      set({ initialized: true, loading: false });
    }

    // Set up auth state change listener with safety checks
    try {
      supabase.auth.onAuthStateChange(async (_event, session) => {
        // Don't overwrite mock guest sessions
        const currentSession = get().session;
        if (currentSession?.access_token === 'mock_guest_token_academix') {
          return;
        }

        if (session) {
          // Wrap with a quick profile check
          const profilePromise = supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile timeout')), 10000)
          );

          let profile = null;
          try {
            const profileResult = await Promise.race([profilePromise, timeoutPromise]) as any;
            profile = profileResult?.data || null;
          } catch (e) {
            console.warn('onAuthStateChange profile fetch timed out', e);
          }

          const fallbackRole = resolveRole(session.user);
          set({
            session,
            user: profile 
              ? { ...profile, class_id: session.user.user_metadata?.class_id } as UserProfile 
              : {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || (fallbackRole === 'ADMIN' ? 'SECRETARY' : 'Student User'),
              role: fallbackRole,
              phone: session.user.user_metadata?.phone,
              avatar_url: session.user.user_metadata?.avatar_url,
              class_id: session.user.user_metadata?.class_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          });
        } else {
          set({ session: null, user: null });
        }
      });
    } catch (e) {
      console.warn('onAuthStateChange failed to initialize', e);
    }
  },

  signIn: async (emailOrPhone: string, password = 'SchoolPassword123!') => {
    set({ loading: true, error: null });
    try {
      const email = emailOrPhone.includes('@') 
        ? emailOrPhone.trim().toLowerCase() 
        : `${emailOrPhone.trim()}@cspi.edu`;
      
      // Perform standard sign in with password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Sync local state profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', signInData.user.id)
        .single();

      if (userProfile) {
        set({ 
          session: signInData.session, 
          user: { ...userProfile, class_id: signInData.user.user_metadata?.class_id } as UserProfile 
        });
      } else {
        // Fallback profile if DB trigger is delayed
        const fallbackRole = resolveRole(signInData.user);
        set({
          session: signInData.session,
          user: {
            id: signInData.user.id,
            email: signInData.user.email || '',
            full_name: signInData.user.user_metadata?.full_name || (fallbackRole === 'ADMIN' ? 'SECRETARY' : 'Student User'),
            role: fallbackRole,
            phone: signInData.user.user_metadata?.phone,
            class_id: signInData.user.user_metadata?.class_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        });
      }
      return true;
    } catch (err: any) {
      console.error('Sign-in error:', err);
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (emailOrPhone: string, password, fullName, role, classId) => {
    set({ loading: true, error: null });
    try {
      const isStudent = role === 'STUDENT';
      const email = isStudent ? `${emailOrPhone.trim()}@cspi.edu` : emailOrPhone.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            phone: isStudent ? emailOrPhone.trim() : undefined,
            class_id: classId
          }
        }
      });

      if (error) throw error;

      if (data.session) {
        // Fetch database profile for user roles
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user!.id)
          .single();

        set({ session: data.session, user: (profile as UserProfile) || {
          id: data.user!.id,
          email: data.user!.email || '',
          full_name: fullName,
          role: role,
          phone: isStudent ? emailOrPhone.trim() : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }});
      } else {
        // User created but needs email verification or similar flow. Let's auto sign-in if possible
        try {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInData?.session) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', signInData.user!.id)
              .single();
            set({ session: signInData.session, user: profile as UserProfile });
          }
        } catch (e) {
          console.warn('Auto sign-in after signup skipped:', e);
        }
      }
      return true;
    } catch (err: any) {
      console.error('Sign-up error:', err);
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  enterAsGuest: (role: 'ADMIN' | 'TEACHER' | 'STUDENT') => {
    const isMockAdmin = role === 'ADMIN';
    const mockId = isMockAdmin ? '07235d24-1f3d-4c8e-9920-64929d476e7a' : '00000000-0000-0000-0000-000000000000';
    const mockEmail = isMockAdmin ? 'gejikhors@gmail.com' : `guest.${role.toLowerCase()}@cspi.io`;
    const mockName = isMockAdmin ? 'SECRETARY' : `Guest ${role === 'TEACHER' ? 'Faculty Mentor' : 'Scholar Student'}`;
    const mockPhone = isMockAdmin ? '9434585206' : '+1 (555) 019-9231';
    
    set({
      session: {
        access_token: 'mock_guest_token_academix',
        user: {
          id: mockId,
          email: mockEmail,
          user_metadata: { full_name: mockName },
          app_metadata: { role }
        }
      },
      user: {
        id: mockId,
        email: mockEmail,
        full_name: mockName,
        role: role,
        phone: mockPhone,
        avatar_url: undefined,
        class_id: role === 'STUDENT' ? '6d9e396c-6219-4167-968d-1796818465b6' : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null
    });
  },

  signOut: async () => {
    set({ loading: true });
    try {
      const currentSession = get().session;
      if (currentSession?.access_token !== 'mock_guest_token_academix') {
        await supabase.auth.signOut();
      }
      set({ session: null, user: null, error: null });
    } catch (err: any) {
      console.error('Sign-out error:', err);
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (fullName: string, phone?: string, email?: string, avatarUrl?: string) => {
    const currentUser = get().user;
    if (!currentUser) return false;

    // Handle mock guest profile update locally
    if (currentUser.id === '00000000-0000-0000-0000-000000000000') {
      set({
        user: {
          ...currentUser,
          full_name: fullName,
          phone,
          email: email || currentUser.email,
          avatar_url: avatarUrl,
        }
      });
      return true;
    }

    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          phone,
          email,
          avatar_url: avatarUrl,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Update auth user metadata so that the session itself stays in sync
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            avatar_url: avatarUrl,
            phone: phone,
          }
        });
      } catch (authErr) {
        console.warn('Failed to sync auth user metadata:', authErr);
      }

      set({
        user: {
          ...currentUser,
          full_name: fullName,
          phone,
          email: email || currentUser.email,
          avatar_url: avatarUrl,
        },
      });
      return true;
    } catch (err: any) {
      console.error('Update profile error:', err);
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },
}));
