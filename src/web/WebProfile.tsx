import React, { useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabaseClient';
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
  EyeOff,
  ShieldCheck
} from 'lucide-react';

const FALLBACK_GRADIENT = 'from-primary to-accent-purple';

export const WebProfile: React.FC = () => {
  const { user, signOut, updateProfile } = useAuthStore();
  const { showToast, classes } = useUIStore();

  // Modal / Editing states
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form Field States
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState(user?.avatar_url || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      const success = await updateProfile(fullName, phone, email, tempAvatarUrl);
      if (!success) throw new Error('Failed to update profile information');

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
  const enrolledClass = classes.find(c => c.id === user?.class_id);
  const isPhoneEmpty = !user?.phone || user.phone.trim() === '';
  const canEditPhone = user?.role === 'ADMIN' || isPhoneEmpty;

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
    <div className="animate-fade-in p-10 max-w-5xl mx-auto space-y-8 relative">
      
      {/* Header Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10 mb-6 md:mb-0">
          <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-4 shadow-glow-primary">
            <User className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-black text-primary uppercase tracking-widest">My Identity</span>
          </div>
          <h2 className="text-4xl font-display font-black text-white tracking-tight">
            Account Management
          </h2>
        </div>
      </div>

      {/* Main split profile card & details grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Card: 3D Visual Profile Identity */}
        <div className="lg:col-span-1 glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center text-center space-y-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none" />
          
          <div className="relative select-none mt-2">
            <div className="p-1.5 rounded-full bg-gradient-to-tr from-primary to-accent-purple shadow-glow-primary">
              {renderAvatar(user?.avatar_url || '', user?.full_name || 'U', 'w-32 h-32', 'text-5xl')}
            </div>
            
            <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-surface border border-white/10 flex items-center justify-center text-lg shadow-lg">
              {user?.role === 'ADMIN' ? '👑' : user?.role === 'TEACHER' ? '📚' : '🎓'}
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-2xl font-display font-black text-white tracking-wide uppercase filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {user?.full_name}
            </h3>
            
            <div className="flex justify-center select-none pt-0.5">
              {user?.role === 'ADMIN' ? (
                <span className="text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/25 uppercase shadow-glow-primary/10">
                  👑 School Administrator
                </span>
              ) : user?.role === 'TEACHER' ? (
                <span className="text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase">
                  📚 Faculty Mentor
                </span>
              ) : (
                <span className="text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 uppercase">
                  🎓 Academic Scholar
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFullName(user?.full_name || '');
              setPhone(user?.phone || '');
              setEmail(user?.email || '');
              setTempAvatarUrl(user?.avatar_url || '');
              setShowEditPopup(true);
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent-purple hover:brightness-110 text-white text-xs font-black uppercase tracking-wider shadow-glow-primary active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            <span>Update Identity</span>
          </button>
        </div>

        {/* Right Card: Full Credentials Grid & Telemetry Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Identity Specifications</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-5 rounded-2xl bg-surface/30 border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Primary Email</span>
                    <span className="text-sm text-white font-bold tracking-wide truncate">{user?.email}</span>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase text-primary tracking-widest bg-primary/15 border border-primary/30 px-2 py-0.5 rounded">Verified</span>
              </div>

              <div className="p-5 rounded-2xl bg-surface/30 border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Contact Line</span>
                    <span className="text-sm text-white font-bold tracking-wide truncate">{user?.phone || 'Not Provided'}</span>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase text-primary tracking-widest bg-primary/15 border border-primary/30 px-2 py-0.5 rounded">Active</span>
              </div>

              {isStudent && enrolledClass && (
                <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 col-span-full flex items-center justify-between">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                      <School className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-cyan-400/80 uppercase tracking-widest mb-0.5">Enrolled Course</span>
                      <span className="text-sm text-cyan-300 font-extrabold tracking-wide truncate">Class {enrolledClass.name} Standard</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-4 rounded-2xl border border-accent-rose/20 bg-accent-rose/10 hover:bg-accent-rose text-accent-rose hover:text-white text-xs font-black uppercase tracking-widest active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Secure Account Logout</span>
          </button>
        </div>

      </div>

      {/* POPUP EDIT PROFILE DIALOG MODAL */}
      {showEditPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-scale-in relative max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 bg-black/20 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-primary uppercase tracking-widest">Update Credentials</span>
              </div>
              <button 
                onClick={() => setShowEditPopup(false)} 
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <form onSubmit={handleUpdateProfile} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile Image File Upload Section */}
              <div className="flex flex-col items-center space-y-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer hover:scale-105 active:scale-95 transition-transform group flex-shrink-0"
                  title="Upload profile picture"
                >
                  {renderAvatar(tempAvatarUrl, fullName || 'U', 'w-32 h-32', 'text-5xl')}
                  
                  <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary flex items-center justify-center border-2 border-white/10 shadow-glow-primary group-hover:brightness-110">
                    <Camera className="w-4.5 h-4.5 text-white" />
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />

                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">
                  Click circle to upload avatar
                </span>
              </div>

              {/* Input Forms */}
              <div className="space-y-4">
                
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[9px] font-black text-gray-400 tracking-widest uppercase">Phone Contact</label>
                    {user?.role === 'ADMIN' ? (
                      <span className="text-[7px] text-accent-emerald font-bold uppercase tracking-wider">admin privilege</span>
                    ) : canEditPhone ? (
                      <span className="text-[7px] text-amber-500 font-bold uppercase tracking-wider">locks after saving</span>
                    ) : (
                      <span className="text-[7px] text-accent-rose font-bold uppercase tracking-wider">locked</span>
                    )}
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!canEditPhone}
                      className="w-full glass-input pr-4 py-3 text-xs disabled:opacity-50"
                      style={{ paddingLeft: '2.75rem' }}
                      required={user?.role === 'ADMIN'}
                      placeholder={canEditPhone ? 'Enter contact number' : 'No contact saved'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-gray-400 tracking-widest uppercase mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
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

                <div>
                  <div className="w-full h-px bg-white/5 my-4" />
                  <label className="block text-[9px] font-black text-primary uppercase tracking-widest mb-1.5 flex items-center space-x-1">
                    <KeyRound className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span>Change Account Password</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
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
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditPopup(false)}
                  disabled={updating}
                  className="py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="py-3 rounded-xl bg-primary text-background text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-glow-primary active:scale-95 transition-all"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
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
