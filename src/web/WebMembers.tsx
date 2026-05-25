import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { 
  Users as UsersIcon, 
  Search, 
  UserMinus, 
  X, 
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
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

export const WebMembers: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast, classes, activeSession } = useUIStore();

  const [members, setMembers] = useState<MemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('STUDENT');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / Selected member
  const [selectedMember, setSelectedMember] = useState<MemberUser | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [saving, setSaving] = useState(false);

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

      if (selectedMember.id.startsWith('guest-') || selectedMember.id === '00000000-0000-0000-0000-000000000000') {
        await new Promise(r => setTimeout(r, 1000));
        setMembers(members.filter(m => m.id !== selectedMember.id));
        showToast(`User ${selectedMember.full_name} deleted (Sandbox Mode)!`, 'success');
        setShowConfirmDelete(false);
        setSelectedMember(null);
        return;
      }

      const { error } = await supabase.rpc('delete_user_entirely', {
        target_user_id: selectedMember.id
      });

      if (error) throw error;

      showToast(`User ${selectedMember.full_name} permanently deleted.`, 'success');
      fetchMembers();
      setShowConfirmDelete(false);
      setSelectedMember(null);
    } catch (err: any) {
      showToast(err.message || 'Deletion failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    if (!editName.trim() || !editEmail.trim()) {
      showToast('Name and Email cannot be empty.', 'error');
      return;
    }

    try {
      setSaving(true);

      if (selectedMember.id.startsWith('guest-') || selectedMember.id === '00000000-0000-0000-0000-000000000000') {
        await new Promise(r => setTimeout(r, 800));
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
      await fetchMembers();
      setIsEditing(false);
      setSelectedMember(null);
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = members.filter(m => {
    if (m.role !== activeTab) return false;
    if (activeTab === 'STUDENT' && selectedClassId !== 'ALL') {
      return m.class_id === selectedClassId;
    }
    const query = searchQuery.toLowerCase();
    return m.full_name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query);
  });

  return (
    <div className="animate-fade-in p-10 max-w-7xl mx-auto space-y-8 relative">
      
      {/* Header Panel */}
      <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/20 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10 mb-6 md:mb-0">
          <div className="inline-flex items-center space-x-2 bg-accent-purple/10 border border-accent-purple/20 px-4 py-1.5 rounded-full mb-4 shadow-glow-primary">
            <UsersIcon className="w-4 h-4 text-accent-purple" />
            <span className="text-[11px] font-black text-accent-purple uppercase tracking-widest">Database Administration</span>
          </div>
          <h2 className="text-4xl font-display font-black text-white tracking-tight">
            Accounts & Members
          </h2>
        </div>

        <div className="relative z-10 flex items-center space-x-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name / email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input !pl-11 py-3 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs and Filters Panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Toggle Roles Tabs */}
        <div className="flex bg-surface/30 p-1.5 rounded-2xl border border-white/5 w-full md:w-80">
          <button 
            onClick={() => { setActiveTab('STUDENT'); setSelectedMember(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
              activeTab === 'STUDENT' ? 'bg-primary text-background shadow-glow-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            Students
          </button>
          <button 
            onClick={() => { setActiveTab('TEACHER'); setSelectedMember(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
              activeTab === 'TEACHER' ? 'bg-primary text-background shadow-glow-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            Faculty
          </button>
        </div>

        {/* Student Class Filter */}
        {activeTab === 'STUDENT' && (
          <div className="relative w-full md:w-48">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full glass-input py-2.5 px-4 text-xs bg-surface/50 text-white"
            >
              <option value="ALL">All standards (Public)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>Class {c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main split dashboard list + detail panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Members List */}
        <div className="lg:col-span-2 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {loading ? (
            <div className="text-center p-12 text-gray-500 font-medium">Querying catalog database...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="glass-panel p-16 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center">
              <UsersIcon className="w-12 h-12 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-300">No Members Match</h3>
              <p className="text-gray-500 mt-2">Adjust your query filter criteria.</p>
            </div>
          ) : (
            filteredMembers.map((m) => (
              <div 
                key={m.id} 
                onClick={() => setSelectedMember(m)}
                className={`bg-surface/30 backdrop-blur-md rounded-2xl border p-5 flex items-center justify-between cursor-pointer transition-all ${
                  selectedMember?.id === m.id ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0 font-display">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : m.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white leading-snug">{m.full_name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {m.role === 'STUDENT' && (
                    <span className="text-[10px] font-black tracking-widest bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald px-2.5 py-1 rounded-full uppercase">
                      Class {m.class_name || 'Unassigned'}
                    </span>
                  )}
                  {m.role === 'TEACHER' && (
                    <span className="text-[10px] font-black tracking-widest bg-accent-rose/10 border border-accent-rose/20 text-accent-rose px-2.5 py-1 rounded-full uppercase">
                      Faculty
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action / Profile Inspector Panel */}
        <div className="lg:col-span-1">
          {selectedMember ? (
            <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden animate-slide-up">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] pointer-events-none" />
              
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-white">Profile Inspector</h3>
                <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center space-y-3 pb-4 border-b border-white/5">
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center font-display font-black text-2xl text-primary relative overflow-hidden">
                  {selectedMember.avatar_url ? (
                    <img src={selectedMember.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : selectedMember.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-bold text-white">{selectedMember.full_name}</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{selectedMember.role}</p>
                </div>
              </div>

              {/* Data fields */}
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full glass-input py-2.5 px-3 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Email Credentials</label>
                    <input 
                      type="email" 
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full glass-input py-2.5 px-3 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full glass-input py-2.5 px-3 text-xs text-white"
                    />
                  </div>
                  {selectedMember.role === 'STUDENT' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Classroom Assigned</label>
                      <select
                        value={editClassId}
                        onChange={(e) => setEditClassId(e.target.value)}
                        className="w-full glass-input py-2.5 px-3 text-xs bg-surface/90 text-white"
                      >
                        <option value="UNASSIGNED">Unassigned</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>Class {c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex-1 py-2 bg-primary text-background font-bold text-xs rounded-xl flex items-center justify-center space-x-1 hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="truncate">{selectedMember.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>{selectedMember.phone || 'No phone recorded'}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>Joined {new Date(selectedMember.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex space-x-2 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex-1 py-2.5 bg-primary text-background font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 hover:brightness-110 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                    <button 
                      onClick={() => setShowConfirmDelete(true)}
                      className="flex-1 py-2.5 bg-accent-rose/10 hover:bg-accent-rose hover:text-white border border-accent-rose/20 text-accent-rose font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Purge User</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center h-64 text-gray-500">
              <UsersIcon className="w-10 h-10 mb-3 text-gray-600 animate-pulse" />
              <p className="text-sm font-bold">No profile inspected</p>
              <p className="text-xs mt-1">Select any portal account from the left feed list to review details.</p>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmDelete && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 text-accent-rose">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
              <h3 className="text-lg font-bold">Critical Authorization</h3>
            </div>
            
            <p className="text-sm text-gray-300 leading-relaxed">
              Are you absolutely certain you want to permanently purge <strong className="text-white">{selectedMember.full_name}</strong>? 
              This action deletes all database records and authentication credentials across both web and mobile channels instantly.
            </p>

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-3 rounded-full text-xs font-bold text-gray-400 bg-white/5 hover:text-white transition-all"
              >
                Cancel Action
              </button>
              <button 
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 py-3 bg-accent-rose text-white font-bold text-xs rounded-full hover:bg-red-600 transition-all flex items-center justify-center"
              >
                {deleting ? 'Purging...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
