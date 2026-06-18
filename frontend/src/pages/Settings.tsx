import { FormEvent, useState } from 'react'
import { changePassword, deleteAccount, updateProfile } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user, updateUser, logout } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [companyName, setCompanyName] = useState(user?.company_name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setProfileMessage(null)
    setSavingProfile(true)
    try {
      const updated = await updateProfile(name, companyName)
      updateUser(updated)
      setProfileMessage('Profile saved successfully.')
      setTimeout(() => setProfileMessage(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password changed successfully.')
      setTimeout(() => setPasswordMessage(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you sure you want to delete your account? This will permanently remove all related jobs, candidates, results, chats, and analyses.')
    if (!confirmed) return

    setError(null)
    setDeleting(true)
    try {
      await deleteAccount()
      logout()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-full text-white relative overflow-hidden flex flex-col">
      
      <div className="relative z-10 w-full space-y-8 animate-fade-in pb-12">
        
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">RecruitAI Workspace</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Account Settings</h1>
          <p className="text-gray-400 text-sm md:text-base">Manage your personal profile, security preferences, and data.</p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-md px-5 py-4 text-sm text-[#f43f5e] font-medium flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
            {error}
          </div>
        )}

        {/* Profile Card */}
        <form onSubmit={handleProfileSubmit} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 space-y-6 shadow-xl">
          <div>
            <h2 className="font-bold text-xl text-white">Profile Details</h2>
            <p className="text-gray-500 text-sm mt-1">The HR name and company are used automatically in outgoing email drafts.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Full Name</label>
              <input 
                className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#ed4690] transition-colors" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Company Name</label>
              <input 
                className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#ed4690] transition-colors" 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)} 
                placeholder="E.g., Tech Corp" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
            <input 
              className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-gray-500 cursor-not-allowed opacity-70" 
              value={user?.email || ''} 
              disabled 
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button 
              type="submit" 
              disabled={savingProfile}
              className="bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white px-8 py-3 rounded-md font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[140px] flex justify-center"
            >
              {savingProfile ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Profile'}
            </button>
            {profileMessage && <span className="text-sm font-medium text-[#22c55e] animate-fade-in">{profileMessage}</span>}
          </div>
        </form>

        {/* Password Card */}
        <form onSubmit={handlePasswordSubmit} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 space-y-6 shadow-xl">
          <div>
            <h2 className="font-bold text-xl text-white">Security</h2>
            <p className="text-gray-500 text-sm mt-1">Update your password to keep your account secure. Minimum 6 characters required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Current Password</label>
              <input 
                type="password" 
                className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ed4690] transition-colors" 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">New Password</label>
              <input 
                type="password" 
                className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ed4690] transition-colors" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required 
                minLength={6} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Confirm Password</label>
              <input 
                type="password" 
                className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ed4690] transition-colors" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                minLength={6} 
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button 
              type="submit" 
              disabled={savingPassword}
              className="bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white px-8 py-3 rounded-md font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[160px] flex justify-center"
            >
              {savingPassword ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Update Password'}
            </button>
            {passwordMessage && <span className="text-sm font-medium text-[#22c55e] animate-fade-in">{passwordMessage}</span>}
          </div>
        </form>

        {/* Danger Zone */}
        <div className="bg-[#1c1c1e] border border-[#f43f5e]/30 rounded-xl p-6 md:p-8 space-y-5 shadow-xl relative overflow-hidden">
          {/* Subtle red glow in the background of the danger zone */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f43f5e]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="font-bold text-xl text-[#f43f5e]">Danger Zone</h2>
            <p className="text-gray-400 text-sm mt-1 max-w-xl">
              Permanently delete your account and remove all saved recruitment data. This action is completely irreversible.
            </p>
          </div>
          
          <button 
            onClick={handleDeleteAccount} 
            disabled={deleting} 
            className="relative z-10 bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20 hover:bg-[#f43f5e]/20 px-6 py-3 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 min-w-[160px] flex justify-center items-center gap-2"
          >
            {deleting ? (
              <><span className="w-4 h-4 border-2 border-[#f43f5e]/30 border-t-[#f43f5e] rounded-full animate-spin" /> Deleting...</>
            ) : (
              'Delete Account'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}