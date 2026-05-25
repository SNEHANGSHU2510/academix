import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
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
  Smartphone,
  School,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, signUp, error: authError } = useAuthStore();
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
          ? 'Welcome back to CSPI Portal!' 
          : 'Scholar registered successfully! Welcome to the hub.', 
        'success'
      );
    }
  };

  // Get active role colors to theme the card dynamically
  const getRoleTheme = () => {
    switch (role) {
      case 'ADMIN':
        return {
          glow: 'rgba(255, 180, 171, 0.25)',
          border: 'border-accent-rose/30',
          text: 'text-accent-rose',
          bg: 'bg-accent-rose/10',
          solid: 'bg-accent-rose'
        };
      case 'TEACHER':
        return {
          glow: 'rgba(62, 146, 255, 0.25)',
          border: 'border-primary/30',
          text: 'text-primary',
          bg: 'bg-primary/10',
          solid: 'bg-primary'
        };
      case 'STUDENT':
      default:
        return {
          glow: 'rgba(0, 251, 251, 0.25)',
          border: 'border-[#00fbfb]/30',
          text: 'text-[#00fbfb]',
          bg: 'bg-[#00fbfb]/10',
          solid: 'bg-[#00fbfb]'
        };
    }
  };

  const theme = getRoleTheme();

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start px-4 py-8 bg-[#0A0A0B] relative overflow-y-auto overflow-x-hidden select-none selection:bg-primary/30 selection:text-primary-50">
      
      {/* Dynamic Animated Ambient Light Background Blobs */}
      <motion.div 
        animate={{
          scale: [1, 1.2, 0.9, 1],
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-[90px] pointer-events-none z-0" 
      />
      <motion.div 
        animate={{
          scale: [1, 0.8, 1.1, 1],
          x: [0, -50, 40, 0],
          y: [0, 30, -30, 0]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-80 -right-20 w-60 h-60 bg-accent-sapphire/35 rounded-full blur-[80px] pointer-events-none z-0" 
      />
      <motion.div 
        animate={{
          scale: [1, 1.3, 0.95, 1],
          x: [0, 40, -40, 0],
          y: [0, -20, 40, 0]
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4
        }}
        className="absolute bottom-20 -left-20 w-60 h-60 bg-accent-rose/10 rounded-full blur-[70px] pointer-events-none z-0" 
      />

      {/* Brand Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 mt-2 flex flex-col items-center relative z-10"
      >
        <motion.div 
          whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.4 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-sapphire via-[#1C1E22] to-primary flex items-center justify-center shadow-premium border border-neutral-border/60 mb-3 relative group cursor-pointer"
        >
          <div className="absolute inset-0 rounded-2xl bg-primary/10 blur opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          <GraduationCap className="w-9 h-9 text-primary transition-transform duration-300 group-hover:scale-110" />
        </motion.div>
        <h2 className="text-3xl font-display font-black tracking-tight text-neutral-text">
          CSPI Portal
        </h2>
        <div className="flex items-center space-x-1.5 mt-1 bg-surface/40 px-3 py-1 rounded-full border border-neutral-border/40 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[9px] text-neutral-muted uppercase tracking-widest font-black opacity-90">
            Chakdighi Sarada Prasad Institution
          </p>
        </div>
      </motion.div>

      {/* Main Glass Authentication Card Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ boxShadow: `0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 30px -10px ${theme.glow}` }}
        className={`w-full max-w-sm glass-panel p-6 rounded-3xl relative z-10 border transition-all duration-500 ${theme.border}`}
      >
        
        {/* Toggle Mode Tabs with Liquid Motion sliding pill */}
        <div className="flex bg-[#0e0e0f]/80 p-1.5 rounded-2xl border border-neutral-border/30 mb-5 relative">
          <button
            type="button"
            onClick={() => {
              setAuthMode('SIGN_IN');
              setEmailOrPhone('');
              setPassword('');
            }}
            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative z-10 cursor-pointer text-center"
          >
            <span className={authMode === 'SIGN_IN' ? 'text-[#0A0A0B]' : 'text-neutral-muted hover:text-neutral-text'}>
              Sign In
            </span>
            {authMode === 'SIGN_IN' && (
              <motion.div 
                layoutId="activeModePill"
                className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setAuthMode('SIGN_UP');
              setEmailOrPhone('');
              setPassword('');
              setFullName('');
            }}
            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative z-10 cursor-pointer text-center"
          >
            <span className={authMode === 'SIGN_UP' ? 'text-[#0A0A0B]' : 'text-neutral-muted hover:text-neutral-text'}>
              Join Hub
            </span>
            {authMode === 'SIGN_UP' && (
              <motion.div 
                layoutId="activeModePill"
                className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Tactile Role Selection Grid */}
          <div>
            <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-2">
              Select Scholar Domain
            </label>
            <div className="grid grid-cols-3 bg-[#0e0e0f]/50 p-1 rounded-2xl border border-neutral-border/20 gap-1 relative">
              {([
                { id: 'STUDENT', label: 'Student', icon: GraduationCap },
                { id: 'TEACHER', label: 'Teacher', icon: UserCheck },
                { id: 'ADMIN', label: 'Admin', icon: ShieldCheck }
              ] as const).map((r) => {
                const Icon = r.icon;
                const isActive = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRole(r.id);
                      setEmailOrPhone('');
                    }}
                    className="py-2.5 rounded-xl text-[9px] font-black tracking-wider transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1.5 relative"
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-300 relative z-10 ${
                      isActive ? 'scale-110 text-neutral-text' : 'text-neutral-muted hover:text-neutral-text'
                    }`} />
                    <span className={`text-[8.5px] font-black uppercase tracking-wider relative z-10 transition-colors ${
                      isActive ? 'text-neutral-text' : 'text-neutral-muted'
                    }`}>
                      {r.label}
                    </span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeRoleSelection"
                        className={`absolute inset-0 ${theme.bg} border ${theme.border} rounded-xl -z-10`}
                        transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={`${authMode}-${role}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* 1. Full Name Input (Sign Up Mode Only) */}
              {authMode === 'SIGN_UP' && (
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
                    Scholar Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 transition-colors group-focus-within:text-primary text-neutral-muted">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={role === 'STUDENT' ? "e.g. John Doe" : "e.g. Dr. Arthur Pendragon"}
                      className="w-full glass-input !pl-11 py-3 text-xs border border-neutral-border/40 focus:border-primary/50 focus:shadow-[0_0_15px_rgba(62,146,255,0.15)] focus:bg-[#0e0e0f]/80"
                      required
                    />
                  </div>
                </div>
              )}

              {/* 2. Dynamic Input (Phone Number for Students, Email for Staff/Admins) */}
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
                  {role === 'STUDENT' ? 'Student Phone Number (Unique ID)' : 'Institutional Email Address'}
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 transition-colors group-focus-within:text-primary text-neutral-muted">
                    {role === 'STUDENT' ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </div>
                  <input
                    type={role === 'STUDENT' ? 'tel' : 'email'}
                    value={emailOrPhone}
                    onChange={(e) => {
                      if (role === 'STUDENT') {
                        setEmailOrPhone(e.target.value.replace(/\D/g, ''));
                      } else {
                        setEmailOrPhone(e.target.value);
                      }
                    }}
                    placeholder={role === 'STUDENT' ? "e.g. 9876543210" : "scholar@cspi.edu.in"}
                    className="w-full glass-input !pl-11 py-3 text-xs border border-neutral-border/40 focus:border-primary/50 focus:shadow-[0_0_15px_rgba(62,146,255,0.15)] focus:bg-[#0e0e0f]/80"
                    required
                  />
                </div>
              </div>

              {/* 3. Class Group Selection (Sign Up Mode & Student Only) */}
              {authMode === 'SIGN_UP' && role === 'STUDENT' && (
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
                    Academic Class Group
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 text-neutral-muted group-focus-within:text-primary">
                      <School className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full glass-input !pl-11 !pr-10 py-3 text-xs appearance-none cursor-pointer bg-[#0e0e0f]/90 border border-neutral-border/40 focus:border-primary/50 text-neutral-text"
                      required
                    >
                      {classesList.length === 0 ? (
                        <option value="" disabled className="bg-[#0A0A0B]">Loading class groups...</option>
                      ) : (
                        classesList.map((cls) => (
                          <option key={cls.id} value={cls.id} className="bg-[#0A0A0B] text-neutral-text">
                            Class {cls.name} Group
                          </option>
                        ))
                      )}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-muted">
                      <ArrowRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Password Input */}
              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-neutral-muted mb-1.5">
                  Secure Access Password
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 text-neutral-muted group-focus-within:text-primary">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full glass-input !pl-11 !pr-10 py-3 text-xs border border-neutral-border/40 focus:border-primary/50 focus:shadow-[0_0_15px_rgba(62,146,255,0.15)] focus:bg-[#0e0e0f]/80"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-muted hover:text-neutral-text transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Error Message Billboard */}
          {authError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start space-x-2.5 bg-accent-rose/10 border border-accent-rose/25 p-3 rounded-2xl text-[10px] text-accent-rose"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="leading-snug font-bold">{authError}</p>
            </motion.div>
          )}

          {/* Submit Button with Custom Touch Ripple & Pulse effect */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || success}
            className={`w-full py-3.5 mt-2 rounded-2xl font-display font-black text-[10px] tracking-widest uppercase text-[#0A0A0B] shadow-lg cursor-pointer flex items-center justify-center space-x-1.5 transition-all duration-300 ${theme.solid} hover:brightness-110 disabled:opacity-50`}
            style={{ boxShadow: `0 8px 24px -6px ${theme.glow}` }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0B]" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#0A0A0B]" />
                <span>{authMode === 'SIGN_IN' ? 'Enter School Hub' : 'Create New Account'}</span>
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};
