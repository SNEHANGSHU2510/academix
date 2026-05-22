import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabaseClient';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  ShieldAlert, 
  Loader2, 
  Eye, 
  EyeOff, 
  Compass, 
  Key, 
  ArrowRight,
  Smartphone,
  School
} from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, signUp, enterAsGuest, error: authError } = useAuthStore();
  const { showToast } = useUIStore();
  
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'TEACHER' | 'STUDENT'>('STUDENT');
  
  const [classesList, setClassesList] = useState<{ id: string, name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch classes dynamically for Student group registration
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (!error && data) {
          setClassesList(data);
          if (data.length > 0) {
            setSelectedClassId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone || !password) return;
    
    setLoading(true);
    
    let ok = false;
    if (authMode === 'SIGN_IN') {
      ok = await signIn(emailOrPhone.trim(), password);
    } else {
      if (!fullName) {
        showToast('Please provide your full scholar name.', 'error');
        setLoading(false);
        return;
      }
      if (role === 'STUDENT' && !selectedClassId) {
        showToast('Please select your academic class group.', 'error');
        setLoading(false);
        return;
      }
      
      ok = await signUp(
        emailOrPhone.trim(), 
        password, 
        fullName.trim(), 
        role, 
        role === 'STUDENT' ? selectedClassId : undefined
      );
    }

    setLoading(false);
    
    if (ok) {
      setSuccess(true);
      showToast(
        authMode === 'SIGN_IN' 
          ? 'Welcome back to Academix Portal!' 
          : 'Scholar registered successfully! Welcome to the hub.', 
        'success'
      );
    }
  };

  const handleGuestAccess = (guestRole: 'ADMIN' | 'TEACHER' | 'STUDENT') => {
    showToast(`Entering Academix Hub as a simulated ${guestRole} Guest. No sign in required!`, 'success');
    enterAsGuest(guestRole);
  };

  const selectSandboxAccount = (demoCred: string, demoRole: 'ADMIN' | 'TEACHER' | 'STUDENT') => {
    setAuthMode('SIGN_IN');
    setRole(demoRole);
    setEmailOrPhone(demoCred);
    setPassword('SchoolPassword123!');
    showToast(`Sandbox credentials synchronized for ${demoRole}! Click 'Enter School Hub' below.`, 'success');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start px-4 py-8 bg-background relative overflow-y-auto overflow-x-hidden select-none selection:bg-primary/30 selection:text-primary-50">
      
      {/* Decorative Ambient Light Mesh Background */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-20 w-48 h-48 bg-accent-purple/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-20 -left-20 w-48 h-48 bg-accent-rose/10 rounded-full blur-2xl pointer-events-none" />

      {/* Brand Header Section */}
      <div className="text-center mb-6 mt-2 flex flex-col items-center relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-purple to-primary flex items-center justify-center shadow-glow-primary border border-primary/20 mb-3 animate-scale-in relative group">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <GraduationCap className="w-8 h-8 text-background transition-transform duration-300 group-hover:scale-110" />
        </div>
        <h2 className="text-2xl font-display font-extrabold tracking-tight text-neutral-text animate-fade-in">
          Academix Portal
        </h2>
        <p className="text-[10px] text-neutral-muted uppercase tracking-widest font-semibold mt-1 opacity-85 leading-relaxed max-w-[280px] animate-fade-in">
          Luminous Portal of Scholars
        </p>
      </div>

      {/* Main Glass Authentication Card */}
      <div className="w-full max-w-sm glass-panel p-5 rounded-2xl shadow-premium animate-slide-up relative z-10 border border-neutral-border/40">
        
        {/* Toggle Mode Tabs */}
        <div className="flex border-b border-neutral-border pb-3 mb-4 gap-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('SIGN_IN');
              setEmailOrPhone('');
              setPassword('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer text-center ${
              authMode === 'SIGN_IN'
                ? 'bg-primary/10 border border-primary/25 text-primary shadow-glow-primary'
                : 'text-neutral-muted hover:text-neutral-text'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('SIGN_UP');
              setEmailOrPhone('');
              setPassword('');
              setFullName('');
            }}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer text-center ${
              authMode === 'SIGN_UP'
                ? 'bg-primary/10 border border-primary/25 text-primary shadow-glow-primary'
                : 'text-neutral-muted hover:text-neutral-text'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Role Select Grid (Always visible to toggle Student vs Admin/Teacher UI rules) */}
          <div>
            <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
              Portal Access Role
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['STUDENT', 'TEACHER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setEmailOrPhone('');
                  }}
                  className={`py-1.5 rounded-xl text-[9px] font-black tracking-wider border transition-all duration-300 cursor-pointer ${
                    role === r
                      ? 'bg-primary border-primary text-background shadow-glow-primary'
                      : 'bg-surface/30 border-neutral-border text-neutral-muted hover:text-neutral-text hover:bg-surface/50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Full Name Input (Sign Up Mode Only) */}
          {authMode === 'SIGN_UP' && (
            <div className="animate-slide-up">
              <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
                Scholar Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-muted" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === 'STUDENT' ? "e.g. John Doe" : "e.g. Dr. Arthur Pendragon"}
                  className="w-full glass-input !pl-10 py-2.5 text-xs"
                  required
                />
              </div>
            </div>
          )}

          {/* 2. Dynamic Input (Phone Number for Students, Email for Staff/Admins) */}
          <div>
            <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
              {role === 'STUDENT' ? 'Student Phone Number (Unique ID)' : 'Institutional Email'}
            </label>
            <div className="relative">
              {role === 'STUDENT' ? (
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-muted" />
              ) : (
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-muted" />
              )}
              <input
                type={role === 'STUDENT' ? 'tel' : 'email'}
                value={emailOrPhone}
                onChange={(e) => {
                  // If student, restrict to numeric characters only
                  if (role === 'STUDENT') {
                    setEmailOrPhone(e.target.value.replace(/\D/g, ''));
                  } else {
                    setEmailOrPhone(e.target.value);
                  }
                }}
                placeholder={role === 'STUDENT' ? "e.g. 9876543210" : "scholar@academix.edu"}
                className="w-full glass-input !pl-10 py-2.5 text-xs"
                required
              />
            </div>
          </div>

          {/* 3. Class Group Selection (Sign Up Mode & Student Only) */}
          {authMode === 'SIGN_UP' && role === 'STUDENT' && (
            <div className="animate-slide-up">
              <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
                Assigned Academic Class Group
              </label>
              <div className="relative">
                <School className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-muted" />
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full glass-input !pl-10 !pr-10 py-2.5 text-xs appearance-none cursor-pointer bg-transparent"
                  required
                >
                  {classesList.length === 0 ? (
                    <option value="" disabled className="bg-background">Loading class groups...</option>
                  ) : (
                    classesList.map((cls) => (
                      <option key={cls.id} value={cls.id} className="bg-background text-neutral-text">
                        Class {cls.name} Group
                      </option>
                    ))
                  )}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-muted">
                  <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>
            </div>
          )}

          {/* 4. Password Input */}
          <div>
            <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
              Access Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full glass-input !pl-10 !pr-10 py-2.5 text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-muted hover:text-neutral-text transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Error Message Billboard */}
          {authError && (
            <div className="flex items-start space-x-2 bg-accent-rose/10 border border-accent-rose/20 p-3 rounded-xl text-[10px] text-accent-rose animate-scale-in">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p className="leading-snug font-semibold">{authError}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 rounded-xl font-display font-black text-[10px] tracking-widest uppercase text-background shadow-glow-primary bg-primary hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5 border border-primary/20"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-background" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-background" />
                <span>{authMode === 'SIGN_IN' ? 'Enter School Hub' : 'Create New Account'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 🚀 FREE DEMO: NO SIGN IN GUEST ACCESS */}
      <div className="w-full max-w-sm mt-5 animate-fade-in relative z-10">
        <div className="glass-panel p-4 rounded-xl border border-primary/10">
          <div className="flex items-center space-x-1.5 mb-2.5">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span className="text-[8px] font-black text-neutral-text tracking-widest uppercase">Instant Guest Explorations</span>
            <span className="text-[7px] font-extrabold bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.2 rounded-md uppercase ml-auto">FREE DEMO</span>
          </div>
          <p className="text-[9px] text-neutral-muted opacity-80 leading-relaxed mb-3">
            Bypass all credentials and preview the high-fidelity app wrapper structure immediately.
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleGuestAccess('ADMIN')}
              className="py-2 px-1 text-[8px] font-black uppercase text-accent-rose bg-accent-rose/10 border border-accent-rose/25 hover:bg-accent-rose/20 rounded-xl transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1 group"
            >
              <span>Admin</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => handleGuestAccess('TEACHER')}
              className="py-2 px-1 text-[8px] font-black uppercase text-primary bg-primary/10 border border-primary/25 hover:bg-primary/20 rounded-xl transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1 group"
            >
              <span>Teacher</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => handleGuestAccess('STUDENT')}
              className="py-2 px-1 text-[8px] font-black uppercase text-accent-gold bg-accent-gold/10 border border-accent-gold/25 hover:bg-accent-gold/20 rounded-xl transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1 group"
            >
              <span>Student</span>
              <ArrowRight className="w-2.5 h-2.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* 🔑 SANDBOX FAST PASS CREDENTIALS */}
      <div className="w-full max-w-sm mt-4 animate-fade-in relative z-10">
        <div className="glass-card p-4 rounded-xl border border-neutral-border/50 bg-surface/30">
          <div className="flex items-center space-x-1.5 mb-2.5">
            <Key className="w-3.5 h-3.5 text-neutral-muted" />
            <span className="text-[8px] font-black text-neutral-muted tracking-widest uppercase">Database Sandbox tokens</span>
          </div>
          <div className="space-y-1.5">
            <div 
              onClick={() => selectSandboxAccount('gejikhors@gmail.com', 'ADMIN')}
              className="p-2 rounded-xl flex items-center justify-between cursor-pointer border border-neutral-border/50 bg-background/40 hover:border-accent-rose/30 hover:bg-accent-rose/5 transition-all select-none group"
            >
              <div>
                <p className="text-[10px] font-bold text-neutral-text group-hover:text-primary transition-colors">School Secretary (Admin)</p>
                <p className="text-[8px] text-neutral-muted opacity-80 mt-0.5">gejikhors@gmail.com</p>
              </div>
              <span className="text-[8px] font-extrabold uppercase bg-accent-rose/10 text-accent-rose border border-accent-rose/20 px-2 py-0.5 rounded-md">ADMIN</span>
            </div>

            <div 
              onClick={() => selectSandboxAccount('teacher.academix@gmail.com', 'TEACHER')}
              className="p-2 rounded-xl flex items-center justify-between cursor-pointer border border-neutral-border/50 bg-background/40 hover:border-primary/30 hover:bg-primary/5 transition-all select-none group"
            >
              <div>
                <p className="text-[10px] font-bold text-neutral-text group-hover:text-primary transition-colors">Senior Lecturer</p>
                <p className="text-[8px] text-neutral-muted opacity-80 mt-0.5">teacher.academix@gmail.com</p>
              </div>
              <span className="text-[8px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">TEACHER</span>
            </div>

            <div 
              onClick={() => selectSandboxAccount('9876543210', 'STUDENT')}
              className="p-2 rounded-xl flex items-center justify-between cursor-pointer border border-neutral-border/50 bg-background/40 hover:border-primary/30 hover:bg-primary/5 transition-all select-none group"
            >
              <div>
                <p className="text-[10px] font-bold text-neutral-text group-hover:text-primary transition-colors">Scholar Student</p>
                <p className="text-[8px] text-neutral-muted opacity-80 mt-0.5">Phone ID: 9876543210</p>
              </div>
              <span className="text-[8px] font-extrabold uppercase bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-md">STUDENT</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};
