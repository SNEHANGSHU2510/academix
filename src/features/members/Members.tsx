import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabaseClient';
import { 
  Users as UsersIcon, 
  Search, 
  UserMinus, 
  X, 
  Loader2,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Edit2,
  Save
} from 'lucide-react';

interface MemberUser {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  phone?: string;
  avatar_url?: string;
  created_at: string;
  class_name?: string;
  class_id?: string;
}

export const Members: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, classes, activeSession } = useUIStore();

  const [members, setMembers] = useState<MemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('STUDENT');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedMember, setSelectedMember] = useState<MemberUser | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editing and Previewing states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (selectedMember) {
      setIsEditing(false);
      setEditName(selectedMember.full_name || '');
      setEditEmail(selectedMember.email || '');
      setEditPhone(selectedMember.phone || '');
      setEditClassId(selectedMember.class_id || '');
    }
  }, [selectedMember]);

  useEffect(() => {
    fetchMembers();
  }, [activeSession]);

  const fetchMembers = async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      setLoading(true);

      // Fetch all users (excluding currently logged-in Admin to avoid self-deletion)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('id', user.id)
        .order('full_name', { ascending: true });

      if (usersError) throw usersError;

      const formatted: MemberUser[] = (usersData || []).map((u: any) => {
        return {
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          phone: u.phone || undefined,
          avatar_url: u.avatar_url || undefined,
          created_at: u.created_at,
          class_name: u.role === 'STUDENT' ? (classes.find(c => c.id === u.class_id)?.name || 'Unassigned') : undefined,
          class_id: u.role === 'STUDENT' ? (u.class_id || 'UNASSIGNED') : undefined
        };
      });

      setMembers(formatted);
    } catch (err: any) {
      showToast(err.message || 'Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedMember) return;
    
    try {
      setDeleting(true);

      // Sandbox Mode Emulation (Guest User Protection)
      if (selectedMember.id.startsWith('guest-') || selectedMember.id === '00000000-0000-0000-0000-000000000000') {
        await new Promise(r => setTimeout(r, 1500));
        setMembers(members.filter(m => m.id !== selectedMember.id));
        showToast(`User ${selectedMember.full_name} deleted successfully from database and auth (Sandbox Mode)!`, 'success');
        setShowConfirmDelete(false);
        setSelectedMember(null);
        return;
      }

      // Live Deletion using our custom Definitive RPC!
      const { error } = await supabase.rpc('delete_user_entirely', {
        target_user_id: selectedMember.id
      });

      if (error) throw error;

      showToast(`User ${selectedMember.full_name} was permanently deleted from the database and Auth credentials.`, 'success');
      
      // Refresh state
      fetchMembers();
      setShowConfirmDelete(false);
      setSelectedMember(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to permanently delete user', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    if (!editName.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    if (!editEmail.trim()) {
      showToast('Email cannot be empty.', 'error');
      return;
    }

    try {
      setSaving(true);

      // 1. Sandbox mode check
      if (selectedMember.id.startsWith('guest-') || selectedMember.id === '00000000-0000-0000-0000-000000000000') {
        await new Promise(r => setTimeout(r, 1000));
        // Update local state
        const updated = {
          ...selectedMember,
          full_name: editName,
          email: editEmail,
          phone: editPhone || undefined,
          class_id: editClassId,
          class_name: classes.find(c => c.id === editClassId)?.name || 'Unassigned'
        };
        setMembers(members.map(m => m.id === selectedMember.id ? updated : m));
        setSelectedMember(updated);
        setIsEditing(false);
        showToast('Member profile updated successfully (Sandbox Mode)!', 'success');
        return;
      }

      // 2. Real database update
      const { error: userErr } = await supabase
        .from('users')
        .update({
          full_name: editName,
          email: editEmail,
          phone: editPhone || null,
          class_id: selectedMember.role === 'STUDENT' ? (editClassId === 'UNASSIGNED' ? null : editClassId) : undefined
        })
        .eq('id', selectedMember.id);

      if (userErr) throw userErr;

      showToast('Member profile updated successfully!', 'success');
      
      // Refresh list
      await fetchMembers();
      
      // Update local selectedMember state
      const targetClassName = classes.find(c => c.id === editClassId)?.name || 'Unassigned';
      setSelectedMember({
        ...selectedMember,
        full_name: editName,
        email: editEmail,
        phone: editPhone || undefined,
        class_id: editClassId,
        class_name: selectedMember.role === 'STUDENT' ? targetClassName : undefined
      });
      setIsEditing(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update member profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter members based on Tab, Class selection, and Search query
  const filteredMembers = members.filter(m => {
    // 1. Tab filter
    if (m.role !== activeTab) return false;

    // 2. Class filter (Students tab only)
    if (activeTab === 'STUDENT' && selectedClassId !== 'ALL') {
      if (selectedClassId === 'UNASSIGNED') {
        if (m.class_id && m.class_id !== 'UNASSIGNED') return false;
      } else {
        if (m.class_id !== selectedClassId) return false;
      }
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = m.full_name.toLowerCase().includes(query);
      const matchEmail = m.email.toLowerCase().includes(query);
      const matchPhone = m.phone?.toLowerCase().includes(query) || false;
      return matchName || matchEmail || matchPhone;
    }

    return true;
  });

  return (
    <div className="w-full flex-1 flex flex-col px-4 py-5 animate-fade-in bg-background select-none">
      {/* Header section */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-white shadow-glow-primary">
            <UsersIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-display font-extrabold text-neutral-text uppercase tracking-wide leading-tight">School Directory</h2>
            <p className="text-[10px] text-neutral-muted uppercase tracking-wider font-semibold">Manage system members and authentication logs</p>
          </div>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
      </div>

      {/* Tabs list (Teachers / Students) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface/20 border border-neutral-border/40 mb-4 select-none">
        <button
          onClick={() => {
            setActiveTab('STUDENT');
            setSelectedClassId('ALL');
          }}
          className={`py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest font-display transition-all cursor-pointer ${
            activeTab === 'STUDENT'
              ? 'bg-primary text-white shadow-glow-primary'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🎓 Registered Students
        </button>
        <button
          onClick={() => {
            setActiveTab('TEACHER');
            setSelectedClassId('ALL');
          }}
          className={`py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest font-display transition-all cursor-pointer ${
            activeTab === 'TEACHER'
              ? 'bg-primary text-white shadow-glow-primary'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🏫 Faculty Lecturers
        </button>
      </div>

      {/* Toolbar (Search & Dropdown selectors) */}
      <div className="space-y-3 mb-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'STUDENT' ? 'students' : 'teachers'} by name, email, phone...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-3 text-xs"
          />
        </div>

        {/* Standard Class Filter (Only visible if Student tab active) */}
        {activeTab === 'STUDENT' && (
          <div className="flex items-center space-x-2">
            <span className="text-[9px] font-bold text-gray-500 uppercase flex-shrink-0 tracking-wider">Filter Standard:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="flex-1 glass-input py-2 text-[10px] font-bold uppercase tracking-wider bg-background cursor-pointer"
            >
              <option value="ALL">Show All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>Class {c.name}</option>
              ))}
              <option value="UNASSIGNED">Unassigned Students</option>
            </select>
          </div>
        )}
      </div>

      {/* Directory Grid */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-3.5 max-h-[calc(100vh-270px)] select-none">
        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Synchronizing member records...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-2xl border border-neutral-border/40">
            <UsersIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-300">No members found</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">Try modifying your search query or filters</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {filteredMembers.map((m) => {
              // Role-based gradient for the avatar
              const avatarBg = m.role === 'TEACHER' 
                ? 'from-amber-400 to-rose-500 text-white'
                : 'from-emerald-400 to-cyan-500 text-white';

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  className="glass-card p-3 rounded-xl border border-neutral-border/20 hover:border-primary/45 hover:bg-surface/5 active:scale-[0.99] flex items-center justify-between transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Compact Circle Avatar */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewAvatar({ url: m.avatar_url || '', name: m.full_name });
                      }}
                      className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-white/10 shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                    >
                      {m.avatar_url && (m.avatar_url.startsWith('http') || m.avatar_url.startsWith('data:')) ? (
                        <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-tr ${avatarBg} flex items-center justify-center font-display font-black text-xs uppercase text-white`}>
                          {m.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* User Text Details */}
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-white truncate leading-none mb-0.5">{m.full_name}</p>
                      <p className="text-[10px] text-neutral-muted truncate font-medium">{m.email}</p>
                    </div>
                  </div>

                  {/* Badge & Trigger Action Row */}
                  <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
                    {m.role === 'STUDENT' ? (
                      <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase flex items-center space-x-1">
                        <GraduationCap className="w-2.5 h-2.5" />
                        <span>Class {m.class_name}</span>
                      </span>
                    ) : (
                      <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/25 uppercase">
                        {m.role}
                      </span>
                    )}

                    <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILED MEMBER POPUP DIALOG */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-sm rounded-2xl border border-neutral-border shadow-premium overflow-hidden animate-scale-in relative">
            
            {/* Modal header bar */}
            <div className="p-4 border-b border-neutral-border/40 flex items-center justify-between flex-shrink-0 select-none">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest font-display flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>{isEditing ? 'Edit Profile Details' : 'Member Profile Details'}</span>
              </span>
              <button 
                onClick={() => setSelectedMember(null)} 
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile body content */}
            <div className="p-5 flex flex-col items-center space-y-4">
              
              {/* Profile image avatar initials / uploaded picture */}
              <div 
                onClick={() => setPreviewAvatar({ url: selectedMember.avatar_url || '', name: selectedMember.full_name })}
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/20 shadow-glow-primary bg-gradient-to-tr from-primary to-accent-purple select-none flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
              >
                {selectedMember.avatar_url && (selectedMember.avatar_url.startsWith('http') || selectedMember.avatar_url.startsWith('data:')) ? (
                  <img src={selectedMember.avatar_url} alt={selectedMember.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xl font-black uppercase">
                    {selectedMember.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name and Designation header (Only when NOT editing) */}
              {!isEditing && (
                <div className="text-center">
                  <h3 className="text-sm font-bold text-white leading-normal">{selectedMember.full_name}</h3>
                  <div className="flex items-center justify-center space-x-2 mt-1.5 select-none">
                    <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest">
                      {selectedMember.role}
                    </span>
                    {selectedMember.role === 'STUDENT' && (
                      <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/10 text-primary uppercase tracking-widest flex items-center space-x-1">
                        <GraduationCap className="w-2.5 h-2.5" />
                        <span>Class {selectedMember.class_name}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Information listing OR Edit Form Inputs */}
              {isEditing ? (
                <div className="w-full space-y-3 pt-2">
                  <div>
                    <label className="block text-[8px] text-gray-500 uppercase font-black tracking-wider leading-none mb-1.5 font-display">Full Name</label>
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="w-full glass-input text-xs py-2.5" 
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[8px] text-gray-500 uppercase font-black tracking-wider leading-none mb-1.5 font-display">Email Address</label>
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      className="w-full glass-input text-xs py-2.5" 
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] text-gray-500 uppercase font-black tracking-wider leading-none mb-1.5 font-display">Phone Contact</label>
                    <input 
                      type="text" 
                      value={editPhone} 
                      onChange={e => setEditPhone(e.target.value)} 
                      className="w-full glass-input text-xs py-2.5" 
                      placeholder="Enter phone contact"
                    />
                  </div>

                  {selectedMember.role === 'STUDENT' && (
                    <div>
                      <label className="block text-[8px] text-gray-500 uppercase font-black tracking-wider leading-none mb-1.5 font-display">Class Standard Selection</label>
                      <select 
                        value={editClassId} 
                        onChange={e => setEditClassId(e.target.value)} 
                        className="w-full glass-input text-[10px] font-bold uppercase tracking-wider py-2.5 bg-background cursor-pointer text-gray-300"
                      >
                        <option value="">Unassigned</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>Class {c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full space-y-2.5 pt-2">
                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-surface/30 border border-neutral-border/20">
                    <Mail className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] text-gray-500 uppercase font-black tracking-wider leading-none">Email Address</p>
                      <p className="text-[10px] text-gray-300 font-medium truncate mt-0.5">{selectedMember.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-surface/30 border border-neutral-border/20">
                    <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] text-gray-500 uppercase font-black tracking-wider leading-none">Phone Contact</p>
                      <p className="text-[10px] text-gray-300 font-medium truncate mt-0.5">{selectedMember.phone || 'Not Provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-surface/30 border border-neutral-border/20">
                    <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[8px] text-gray-500 uppercase font-black tracking-wider leading-none">Date Registered</p>
                      <p className="text-[10px] text-gray-300 font-medium truncate mt-0.5">
                        {new Date(selectedMember.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions buttons row */}
              {isEditing ? (
                <div className="w-full flex space-x-2 pt-3 select-none">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl border border-neutral-border/60 hover:bg-white/5 text-gray-300 text-[10px] font-extrabold uppercase transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-primary text-white text-[10px] font-extrabold uppercase shadow-glow-primary active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" /><span>Save Changes</span></>}
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col space-y-2 pt-3 select-none">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3 rounded-xl bg-primary text-white text-[10px] font-extrabold font-display uppercase shadow-glow-primary hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Member Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full py-3 rounded-xl bg-accent-rose/10 hover:bg-accent-rose text-accent-rose hover:text-white text-[10px] font-extrabold font-display uppercase border border-accent-rose/30 hover:border-transparent active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Permanently Delete Account</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECONDARY CONFIRMATION DELETE DIALOG */}
      {showConfirmDelete && selectedMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 backdrop-blur-lg animate-fade-in">
          <div className="glass-panel w-full max-w-xs rounded-2xl border border-accent-rose/30 shadow-glow-rose overflow-hidden animate-scale-in p-5 relative">
            <div className="flex flex-col items-center text-center space-y-4">
              
              <div className="w-12 h-12 rounded-full bg-accent-rose/10 flex items-center justify-center text-accent-rose animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest leading-snug">Confirm Account Deletion</h4>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  Are you absolutely sure you want to permanently delete **{selectedMember.full_name}**?
                </p>
                <p className="text-[9px] text-accent-rose mt-1.5 font-bold uppercase tracking-wider">
                  ⚠️ This action will completely erase the user from both the database records and Authentication credentials!
                </p>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={deleting}
                  className="py-2.5 rounded-lg border border-neutral-border/60 hover:bg-white/5 text-gray-300 text-[9px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="py-2.5 rounded-lg bg-accent-rose text-white text-[9px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all flex items-center justify-center space-x-1 hover:brightness-110"
                >
                  {deleting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>Yes, Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP-STYLE FULL SCREEN IMAGE PREVIEW MODAL */}
      {previewAvatar && (
        <div 
          onClick={() => setPreviewAvatar(null)}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in cursor-pointer select-none"
        >
          <button 
            onClick={() => setPreviewAvatar(null)} 
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel max-w-[320px] sm:max-w-[400px] w-full aspect-square overflow-hidden rounded-2xl border border-white/10 shadow-glow-primary animate-scale-in relative cursor-default"
          >
            {previewAvatar.url && (previewAvatar.url.startsWith('http') || previewAvatar.url.startsWith('data:')) ? (
              <img src={previewAvatar.url} alt={previewAvatar.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-white text-5xl font-black uppercase">
                {previewAvatar.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-bold text-white uppercase tracking-wider font-display">{previewAvatar.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};
