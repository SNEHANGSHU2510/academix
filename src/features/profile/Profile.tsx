import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabaseClient';
import { 
  User, 
  Phone, 
  Mail, 
  LogOut, 
  Save, 
  Sparkles,
  Loader2,
  School,
  Lock,
  Camera,
  X,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';

const FALLBACK_GRADIENT = 'from-emerald-400 to-cyan-500';

export const Profile: React.FC = () => {
  const { user, signOut, updateProfile } = useAuthStore();
  const { showToast } = useUIStore();

  // Dialog State
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form Field States
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState(user?.avatar_url || '');

  // File Upload Reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Image upload selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g. 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size must be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setTempAvatarUrl(reader.result);
        showToast('Image loaded! Save profile to publish.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    try {
      setUpdating(true);

      // 1. Update Core Profile Details (Including real-time Avatar Base64 string synchronization)
      const success = await updateProfile(fullName, phone, email, tempAvatarUrl);
      if (!success) throw new Error('Failed to update profile information');

      // 3. Update Password in Realtime (if provided)
      if (password.trim()) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password.trim()
        });

        if (passwordError) throw passwordError;
        showToast('Profile, Picture and Security credentials updated successfully!', 'success');
      } else {
        showToast('Profile records updated successfully!', 'success');
      }

      // Update state
      setPassword('');
      setShowEditPopup(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update details', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    showToast('Securely logged out from session.', 'info');
  };

  const isStudent = user?.role === 'STUDENT';
  const enrolledClass = useUIStore(state => state.classes.find(c => c.id === user?.class_id));
  const isPhoneEmpty = !user?.phone || user.phone.trim() === '';
  const canEditPhone = user?.role === 'ADMIN' || isPhoneEmpty;

  // Visual layout helpers for displaying avatar picture
  const renderAvatar = (url: string, name: string, sizeClass: string, textClass: string) => {
    if (url && (url.startsWith('http') || url.startsWith('data:'))) {
      return (
        <div className={`${sizeClass} rounded-full overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0`}>
          <img src={url} alt={name} className="w-full h-full object-cover" />
        </div>
      );
    }

    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-tr ${FALLBACK_GRADIENT} flex items-center justify-center text-white ${textClass} font-black uppercase border-2 border-white/20 shadow-lg flex-shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 px-4 py-5 animate-fade-in bg-background select-none">
      
      {/* Header section */}
      <div className="flex items-center justify-between select-none">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-white shadow-glow-primary">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-extrabold text-neutral-text uppercase tracking-wide leading-tight">My Identity</h2>
            <p className="text-[10px] text-neutral-muted uppercase tracking-wider font-semibold">Manage profile card and authentication controls</p>
          </div>
        </div>
      </div>

      {/* STUNNING ELEGANT VISUAL PROFILE CARD */}
      <div className="glass-panel rounded-2xl border border-neutral-border/20 shadow-premium overflow-hidden relative select-none">
        
        {/* Dynamic decorative backdrop radial glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        
        {/* Card Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-5 relative z-10">
          
          {/* Main Profile Avatar (Extra Large Circle: w-28 h-28!) */}
          <div className="relative select-none mt-2">
            <div className="p-1 rounded-full bg-gradient-to-tr from-primary to-accent-purple shadow-glow-primary">
              {renderAvatar(user?.avatar_url || '', user?.full_name || 'U', 'w-28 h-28', 'text-4xl')}
            </div>
            
            {/* Small status role badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface border border-neutral-border/45 flex items-center justify-center text-sm shadow-premium">
              {user?.role === 'ADMIN' ? '👑' : user?.role === 'TEACHER' ? '📚' : '🎓'}
            </div>
          </div>

          {/* User description metadata */}
          <div className="space-y-2">
            <h3 className="text-xl font-display font-black text-white tracking-wide uppercase filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {user?.full_name}
            </h3>
            
            {/* Elegant designation pill */}
            <div className="flex justify-center select-none pt-0.5">
              {user?.role === 'ADMIN' ? (
                <span className="text-[9px] font-black tracking-widest px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/25 uppercase shadow-glow-primary/10">
                  👑 School Administrator
                </span>
              ) : user?.role === 'TEACHER' ? (
                <span className="text-[9px] font-black tracking-widest px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase">
                  📚 Faculty Mentor
                </span>
              ) : (
                <span className="text-[9px] font-black tracking-widest px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 uppercase">
                  🎓 Academic Scholar
                </span>
              )}
            </div>
          </div>

          {/* Visual Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-border/30 to-transparent" />

          {/* Details layout listing (Extremely Prominent Text) */}
          <div className="w-full space-y-3 text-left">
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface/40 border border-neutral-border/20 shadow-sm hover:border-primary/20 transition-colors">
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-extrabold text-neutral-muted uppercase tracking-wider mb-0.5">Primary Email</span>
                  <span className="text-[13px] text-white font-bold tracking-wide truncate">{user?.email}</span>
                </div>
              </div>
              <span className="text-[7px] font-black uppercase text-primary/80 tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">Verified</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-surface/40 border border-neutral-border/20 shadow-sm hover:border-primary/20 transition-colors">
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-extrabold text-neutral-muted uppercase tracking-wider mb-0.5">Contact Number</span>
                  <span className="text-[13px] text-white font-bold tracking-wide truncate">{user?.phone || 'Not Provided'}</span>
                </div>
              </div>
              <span className="text-[7px] font-black uppercase text-primary/80 tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">Active</span>
            </div>

            {isStudent && enrolledClass && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <School className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] font-extrabold text-primary/70 uppercase tracking-wider mb-0.5">Enrolled Course</span>
                    <span className="text-[13px] text-primary font-black tracking-wide truncate">Class {enrolledClass.name} Standard</span>
                  </div>
                </div>
                <span className="text-[7px] font-black uppercase text-primary/80 tracking-widest bg-primary/20 px-2 py-0.5 rounded">Enrolled</span>
              </div>
            )}
          </div>

          {/* Trigger Edit popup Button (Super premium solid look) */}
          <button
            type="button"
            onClick={() => {
              setFullName(user?.full_name || '');
              setPhone(user?.phone || '');
              setEmail(user?.email || '');
              setTempAvatarUrl(user?.avatar_url || '');
              setShowEditPopup(true);
            }}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-accent-purple hover:brightness-110 text-white text-[10px] font-extrabold font-display uppercase tracking-widest shadow-glow-primary active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer select-none"
          >
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            <span>Edit Profile & Credentials</span>
          </button>
        </div>
      </div>

      {/* Log Out button */}
      <button
        onClick={handleSignOut}
        className="w-full py-3.5 rounded-xl border border-accent-rose/20 bg-accent-rose/10 hover:bg-accent-rose text-accent-rose hover:text-white text-[10px] font-extrabold font-display uppercase tracking-widest active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer select-none"
      >
        <LogOut className="w-4 h-4" />
        <span>Secure Log Out</span>
      </button>

      {/* POPUP EDIT PROFILE SCREEN MODAL */}
      {showEditPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-fade-in select-none">
          <div className="glass-panel w-full max-w-sm rounded-2xl border border-neutral-border shadow-premium overflow-hidden animate-scale-in relative max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-border/40 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest font-display">Update Credentials</span>
              </div>
              <button 
                onClick={() => setShowEditPopup(false)} 
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <form onSubmit={handleUpdateProfile} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* Profile Image File Upload Section */}
              <div className="flex flex-col items-center space-y-2">
                
                {/* Visual Preview (Circle Avatar is massive!) */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer hover:scale-105 active:scale-95 transition-transform group flex-shrink-0"
                  title="Upload profile picture"
                >
                  {renderAvatar(tempAvatarUrl, fullName || 'U', 'w-32 h-32', 'text-5xl')}
                  
                  {/* Camera icon trigger */}
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-white/20 shadow-glow-primary group-hover:brightness-110">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />

                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider text-center mt-1">
                  Click avatar circle to upload picture
                </span>
              </div>

              {/* Core Inputs Wrapper */}
              <div className="space-y-4 pt-2">
                
                {/* Full Name Input (With padding fixed) */}
                <div>
                  <label className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-muted" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full glass-input pr-4 py-3 text-xs"
                      style={{ paddingLeft: '2.75rem' }}
                      required
                    />
                  </div>
                </div>

                {/* Phone Contact Input (Conditional: editable if empty or Admin) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[8px] font-black text-gray-500 tracking-widest uppercase">Phone Contact</label>
                    {user?.role === 'ADMIN' ? (
                      <span className="text-[7px] text-accent-emerald font-bold uppercase tracking-wider">editable (administrator privilege)</span>
                    ) : canEditPhone ? (
                      <span className="text-[7px] text-amber-500 font-bold uppercase tracking-wider">first-time setup (locks after saving)</span>
                    ) : (
                      <span className="text-[7px] text-accent-rose font-bold uppercase tracking-wider">locked (contact administrator)</span>
                    )}
                  </div>
                  <div className="relative">
                    <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${canEditPhone ? 'text-neutral-muted' : 'text-neutral-muted opacity-40'}`} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!canEditPhone}
                      className={`w-full glass-input pr-4 py-3 text-xs ${canEditPhone ? 'border-primary/20 focus:border-primary' : 'opacity-50 cursor-not-allowed select-none'}`}
                      style={{ paddingLeft: '2.75rem' }}
                      required={user?.role === 'ADMIN'}
                      placeholder={canEditPhone ? 'Enter your active contact number' : 'No contact saved'}
                    />
                  </div>
                </div>

                {/* Email Address Input (With padding fixed) */}
                <div>
                  <label className="block text-[8px] font-black text-gray-500 tracking-widest uppercase mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full glass-input pr-4 py-3 text-xs"
                      style={{ paddingLeft: '2.75rem' }}
                      required
                    />
                  </div>
                </div>

                {/* Real-time Password Update block */}
                <div>
                  <div className="w-full h-px bg-neutral-border/20 my-3" />
                  <label className="block text-[8px] font-black text-primary uppercase tracking-widest mb-1.5 flex items-center space-x-1">
                    <KeyRound className="w-3 h-3 text-primary animate-pulse" />
                    <span>Change Account Password (Real-Time)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new secure password (min 6 char)"
                      className="w-full glass-input pr-10 py-3 text-xs border border-primary/20 focus:border-primary"
                      style={{ paddingLeft: '2.75rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditPopup(false)}
                  disabled={updating}
                  className="py-3 rounded-xl border border-neutral-border/60 hover:bg-white/5 text-gray-300 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer active:scale-95 transition-all select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="py-3 rounded-xl bg-primary text-white text-[10px] font-extrabold uppercase tracking-widest cursor-pointer active:scale-95 transition-all flex items-center justify-center space-x-1 shadow-glow-primary select-none"
                >
                  {updating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
