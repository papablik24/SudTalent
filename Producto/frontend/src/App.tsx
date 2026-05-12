import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { AuthScreen } from './pages/AuthScreen';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminTalentReview } from './components/AdminTalentReview';
import { AdminSettings } from './pages/admin/AdminSettings';
import { ConvocatoriasAdmin } from './pages/admin/ConvocatoriasAdmin';
import { ConvocatoriasUser } from './pages/user/ConvocatoriasUser';
import { UserProfileView } from './pages/user/UserProfileView';
import { UserDemosView } from './pages/user/UserDemosView';
import { UserOnboarding } from './pages/UserOnboarding';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { useAdminData } from './hooks/useAdminData';
import { UserProfile, TalentProfile } from './types';

export default function App() {
  const { 
    currentUser, 
    role, 
    loading, 
    error, 
    loginWithEmail,
    registerUser,
    logout,
    setCurrentUser 
  } = useAuth();

  const {
    whitelist,
    allUsers,
    talentProfiles,
    allDemos,
    addToWhitelist,
    removeFromWhitelist,
    updateStudent,
    updateUserStatus
  } = useAdminData(role, currentUser);

  // ── Onboarding handler ────────────────────────────────────────────
  const handleOnboardingComplete = async (data: Partial<UserProfile>, profileData: Partial<TalentProfile>) => {
    if (!currentUser) return;

    const updatedUser: UserProfile = {
      ...currentUser,
      ...data,
      onboarded: true,
    };

    const newProfile = {
      userId: currentUser.uid,
      ...profileData,
      createdAt: new Date().toISOString()
    };

    // Persist
    localStorage.setItem(`user_${currentUser.uid}`, JSON.stringify(updatedUser));
    localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(newProfile));
    localStorage.setItem('sud_current_user', JSON.stringify(updatedUser));

    // Add to global users list for admin panel
    const savedUsers = localStorage.getItem('sud_all_users');
    const users = savedUsers ? JSON.parse(savedUsers) : [];
    const idx = users.findIndex((u: any) => u.uid === currentUser.uid);
    if (idx >= 0) users[idx] = updatedUser; else users.push(updatedUser);
    localStorage.setItem('sud_all_users', JSON.stringify(users));

    setCurrentUser(updatedUser);
  };

  // ── Loading screen ────────────────────────────────────────────────
  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-sud-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
      </div>
    );
  }

  // ── Check if USER needs onboarding ────────────────────────────────
  const needsOnboarding = currentUser && role === 'USER' && !currentUser.onboarded;

  return (
    <Router>
      <div className="min-h-screen selection:bg-sud-orange selection:text-white bg-[#0a0a0a] text-slate-100">
        <Routes>
          {/* ── Auth ──────────────────────────────────────────── */}
          <Route path="/auth" element={
            currentUser ? <Navigate to="/" replace /> : (
              <AuthScreen 
                onLogin={async (email, pass) => await loginWithEmail(email, pass)}
                onRegister={async (email, pass, name) => await registerUser(email, pass, name)}
                loading={loading}
                error={error}
              />
            )
          } />

          {/* ── Onboarding (USER only, not yet onboarded) ─────── */}
          <Route path="/onboarding" element={
            !currentUser ? <Navigate to="/auth" replace /> :
            role === 'ADMIN' ? <Navigate to="/admin" replace /> :
            currentUser.onboarded ? <Navigate to="/profile" replace /> : (
              <UserOnboarding 
                onComplete={handleOnboardingComplete} 
                userPhone={currentUser.phone || ''}
                userEmail={currentUser.email || ''}
              />
            )
          } />

          {/* ── Admin Routes ─────────────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
              <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
                <AdminDashboard 
                  whitelist={whitelist} 
                  users={allUsers} 
                  onNavigate={(path) => window.location.pathname = path}
                />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/students" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
              <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
                <AdminStudents 
                  whitelist={whitelist} 
                  users={allUsers}
                  onAdd={addToWhitelist}
                  onRemove={removeFromWhitelist}
                  onUpdate={updateStudent}
                />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/casting" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
              <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
                <AdminTalentReview 
                  users={allUsers}
                  talentProfiles={talentProfiles}
                  allDemos={allDemos}
                  onUpdateStatus={updateUserStatus}
                />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/convocatorias" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
              <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
                <ConvocatoriasAdmin />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/settings" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
              <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
                <AdminSettings 
                  user={currentUser}
                  onUpdateUser={(updates) => setCurrentUser(prev => prev ? { ...prev, ...updates } : null)}
                />
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* ── User Routes (require onboarded) ──────────────── */}
          <Route path="/profile" element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : (
              <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
                <MainLayout user={currentUser} role="USER" onLogout={logout}>
                  <UserProfileView 
                    user={currentUser!} 
                    onNavigateToDemos={() => window.location.pathname = '/demos'} 
                    onUpdateUser={(updated) => setCurrentUser(prev => prev ? { ...prev, ...updated } : null)}
                  />
                </MainLayout>
              </ProtectedRoute>
            )
          } />

          <Route path="/demos" element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : (
              <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
                <MainLayout user={currentUser} role="USER" onLogout={logout}>
                  <UserDemosView user={currentUser!} />
                </MainLayout>
              </ProtectedRoute>
            )
          } />

          <Route path="/convocatorias" element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : (
              <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
                <MainLayout user={currentUser} role="USER" onLogout={logout}>
                  <ConvocatoriasUser user={currentUser!} />
                </MainLayout>
              </ProtectedRoute>
            )
          } />

          {/* ── Default Redirect ──────────────────────────────── */}
          <Route path="*" element={
            !currentUser ? <Navigate to="/auth" replace /> :
            role === 'ADMIN' ? <Navigate to="/admin" replace /> :
            needsOnboarding ? <Navigate to="/onboarding" replace /> :
            <Navigate to="/profile" replace />
          } />
        </Routes>
      </div>
    </Router>
  );
}
