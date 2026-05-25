import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabaseClient';
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
  ArrowRight,
  Smartphone,
  School,
  Monitor,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const WebLogin: React.FC = () => {
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
          : 'Scholar registered successfully! Welcome to the school hub.', 
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
          solid: 'bg-accent-rose',
          outline: 'rgba(255, 180, 171, 0.4)'
        };
      case 'TEACHER':
        return {
          glow: 'rgba(62, 146, 255, 0.25)',
          border: 'border-primary/30',
          text: 'text-primary',
          bg: 'bg-primary/10',
          solid: 'bg-primary',
          outline: 'rgba(62, 146, 255, 0.4)'
        };
      case 'STUDENT':
      default:
        return {
          glow: 'rgba(0, 251, 251, 0.25)',
          border: 'border-[#00fbfb]/30',
          text: 'text-[#00fbfb]',
          bg: 'bg-[#00fbfb]/10',
          solid: 'bg-[#00fbfb]',
          outline: 'rgba(0, 251, 251, 0.4)'
        };
    }
  };

  const theme = getRoleTheme();

  const renderAuthForm = () => (
    <div className="w-full">
      {/* Toggle Mode Tabs with Liquid Motion sliding pill */}
      <div className="flex bg-[#0e0e0f]/80 p-1.5 rounded-full border border-neutral-border/30 mb-6 relative">
        <button
          type="button"
          onClick={() => {
            setAuthMode('SIGN_IN');
            setEmailOrPhone('');
            setPassword('');
          }}
          className="flex-1 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 cursor-pointer text-center"
        >
          <span className={authMode === 'SIGN_IN' ? 'text-[#0A0A0B]' : 'text-neutral-muted hover:text-neutral-text'}>
            Sign In
          </span>
          {authMode === 'SIGN_IN' && (
            <motion.div 
              layoutId="webActiveModePill"
              className="absolute inset-0 bg-primary rounded-full -z-10 shadow-lg shadow-primary/20"
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
          className="flex-1 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 cursor-pointer text-center"
        >
          <span className={authMode === 'SIGN_UP' ? 'text-[#0A0A0B]' : 'text-neutral-muted hover:text-neutral-text'}>
            Create Account
          </span>
          {authMode === 'SIGN_UP' && (
            <motion.div 
              layoutId="webActiveModePill"
              className="absolute inset-0 bg-primary rounded-full -z-10 shadow-lg shadow-primary/20"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
        </button>
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Role Select Grid */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-muted mb-2 ml-1">
            Portal Access Role
          </label>
          <div className="grid grid-cols-3 bg-[#0e0e0f]/50 p-1 rounded-[18px] border border-neutral-border/20 gap-1.5 relative">
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
                  className="py-3 rounded-[14px] text-[10px] font-black tracking-wider transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-1.5 relative animate-fade-in"
                >
                  <Icon className={`w-4 h-4 transition-transform duration-300 relative z-10 ${
                    isActive ? 'scale-110 text-neutral-text' : 'text-neutral-muted hover:text-neutral-text'
                  }`} />
                  <span className={`text-[9px] font-black uppercase tracking-wider relative z-10 transition-colors ${
                    isActive ? 'text-neutral-text' : 'text-neutral-muted'
                  }`}>
                    {r.label}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="webActiveRoleSelection"
                      className={`absolute inset-0 ${theme.bg} border ${theme.border} rounded-[14px] -z-10`}
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-muted mb-1.5 ml-1">
                  Scholar Full Name
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 text-neutral-muted group-focus-within:text-primary">
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

            {/* 2. Dynamic Input */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-muted mb-1.5 ml-1">
                {role === 'STUDENT' ? 'Student Phone Number (Unique ID)' : 'Institutional Email Address'}
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 text-neutral-muted group-focus-within:text-primary">
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-muted mb-1.5 ml-1">
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
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-muted mb-1.5 ml-1">
                Access Password
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

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || success}
          className={`w-full py-4 mt-2 rounded-2xl font-display font-black text-xs tracking-widest uppercase text-[#0A0A0B] shadow-lg cursor-pointer flex items-center justify-center space-x-1.5 transition-all duration-300 ${theme.solid} hover:brightness-110 disabled:opacity-50`}
          style={{ boxShadow: `0 8px 24px -6px ${theme.glow}` }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0B]" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#0A0A0B]" />
              <span>{authMode === 'SIGN_IN' ? 'Enter Web Portal' : 'Create Web Account'}</span>
            </>
          )}
        </motion.button>
      </form>
    </div>
  );

  return (
    <div className="w-full min-h-screen flex bg-[#0A0A0B] relative overflow-hidden select-none">
      
      {/* Decorative Interactive Ambient Light Background Blobs */}
      <motion.div 
        animate={{
          scale: [1, 1.25, 0.9, 1],
          x: [0, 40, -30, 0],
          y: [0, -50, 30, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-primary/10 rounded-full blur-[140px] pointer-events-none" 
      />
      
      <motion.div 
        animate={{
          scale: [1, 0.85, 1.15, 1],
          x: [0, -60, 40, 0],
          y: [0, 40, -40, 0]
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-accent-sapphire/20 rounded-full blur-[140px] pointer-events-none" 
      />
      
      <motion.div 
        animate={{
          scale: [1, 1.2, 0.95, 1],
          x: [0, 30, -30, 0],
          y: [0, -30, 45, 0]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4
        }}
        className="absolute top-[20%] right-[30%] w-[35%] h-[35%] bg-accent-rose/5 rounded-full blur-[120px] pointer-events-none" 
      />

      {/* Left Side: 3D Hero Section */}
      <div className="hidden lg:flex flex-col flex-1 px-16 py-12 justify-between relative z-10">
        
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center space-x-4 cursor-pointer"
        >
          <motion.div 
            whileHover={{ scale: 1.05, rotate: -3 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-sapphire to-primary border border-primary/20 flex items-center justify-center shadow-premium"
          >
            <GraduationCap className="w-7 h-7 text-primary animate-pulse" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-display font-black tracking-tight text-white leading-none">
              CSPI
            </h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1.5">EST. 1952</p>
          </div>
        </motion.div>

        {/* Breathtaking Typography Content */}
        <div className="max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center space-x-2 bg-[#1C1E22]/60 border border-neutral-border/40 px-4 py-2 rounded-full mb-8 shadow-xl backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Premium Desktop Portal</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-[4rem] xl:text-[4.8rem] font-display font-black tracking-tighter leading-[1.05] mb-6 text-white drop-shadow-2xl"
          >
            Empowering Minds,<br/>
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-[#00fbfb] bg-clip-text text-transparent">
              Shaping the Future.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-gray-400 text-lg leading-relaxed font-semibold mb-12 max-w-xl opacity-90"
          >
            Welcome to the Chakdighi Sarada Prasad Institution unified desktop dashboard. Experience seamless academic management, real-time communication, and deep analytical insights.
          </motion.p>
        </div>

        {/* Security & Device Badges */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center space-x-6 text-xs font-black tracking-wider uppercase text-neutral-muted"
        >
          <span className="flex items-center space-x-2"><Monitor className="w-4 h-4 text-primary" /> <span>Desktop Optimized</span></span>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-border" />
          <span className="flex items-center space-x-2"><Lock className="w-4 h-4 text-[#00fbfb]" /> <span>End-to-End Encrypted</span></span>
        </motion.div>
      </div>

      {/* Right Side: Auth Panel */}
      <div className="w-full lg:w-[480px] xl:w-[540px] flex items-center justify-center p-6 relative z-10 border-l border-white/5 bg-[#1C1E22]/10 backdrop-blur-3xl shadow-premium">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px -15px ${theme.glow}` }}
          className={`w-full max-w-md glass-panel p-8 rounded-3xl border transition-all duration-500 ${theme.border}`}
        >
          <div className="text-center mb-6 flex flex-col items-center">
            <h2 className="text-3xl font-display font-black tracking-tight text-white mb-2">Welcome Back</h2>
            <p className="text-xs text-neutral-muted font-black tracking-widest uppercase">Sign in to access the CSPI Web Portal</p>
          </div>
          {renderAuthForm()}
        </motion.div>
      </div>
    </div>
  );
};
