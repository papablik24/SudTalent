import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { AuthScreen } from './pages/AuthScreen';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminTalentReview } from './components/AdminTalentReview'; // Keep as component for now
import { ConvocatoriasAdmin } from './pages/admin/ConvocatoriasAdmin';
import { ConvocatoriasUser } from './pages/user/ConvocatoriasUser';
import { UserProfileView } from './pages/user/UserProfileView';
import { UserDemosView } from './pages/user/UserDemosView';
import { ProfileTypeSelection } from './pages/ProfileTypeSelection';
import { UserOnboarding } from './pages/UserOnboarding';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { useAdminData } from './hooks/useAdminData';
import { ProfileType, UserProfile, TalentProfile } from './types';

function AppRoutes() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    role, 
    loading, 
    error, 
    loginWithPhone, 
    loginAdmin, 
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

  const handleProfileTypeSelect = (type: ProfileType) => {
    (window as any)._pendingProfileType = type;
    navigate('/onboarding');
  };

  const handleOnboardingComplete = async (data: Partial<UserProfile>, profileData: Partial<TalentProfile>) => {
    if (!currentUser) return;
    
    // Update local user state with onboarded data
    const updatedUser: UserProfile = {
      ...currentUser,
      ...data,
      profileType: (window as any)._pendingProfileType as ProfileType,
      onboarded: true,
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('sud_current_user', JSON.stringify(updatedUser));
    navigate('/profile');
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-sud-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-sud-orange selection:text-white bg-[#0a0a0a] text-slate-100">
      <Routes>
        <Route path="/auth" element={
          currentUser ? <Navigate to="/" replace /> : (
            <AuthScreen 
              onUserLogin={async (p, o) => await loginWithPhone(p, o)} 
              onAdminLogin={async () => await loginAdmin()}
              loading={loading}
              error={error}
            />
          )
        } />

        <Route path="/profile-selection" element={
          <ProtectedRoute user={currentUser} role={role} loading={loading}>
            <ProfileTypeSelection onSelect={handleProfileTypeSelect} />
          </ProtectedRoute>
        } />

        <Route path="/onboarding" element={
          <ProtectedRoute user={currentUser} role={role} loading={loading}>
            <UserOnboarding 
              onComplete={handleOnboardingComplete} 
              userPhone={currentUser?.phone || ''}
              profileType={(window as any)._pendingProfileType || 'PERSONAL'}
            />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
            <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
              <AdminDashboard 
                whitelist={whitelist} 
                users={allUsers} 
                onNavigate={(path) => navigate(path)}
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

        {/* User Routes */}
        <Route path="/profile" element={
          <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
            <MainLayout user={currentUser} role="USER" onLogout={logout}>
              <UserProfileView 
                user={currentUser!} 
                onNavigateToDemos={() => navigate('/demos')} 
                onUpdateUser={(updated) => setCurrentUser(prev => prev ? { ...prev, ...updated } : null)}
              />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/demos" element={
          <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
            <MainLayout user={currentUser} role="USER" onLogout={logout}>
              <UserDemosView user={currentUser!} />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/convocatorias" element={
          <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
            <MainLayout user={currentUser} role="USER" onLogout={logout}>
              <ConvocatoriasUser user={currentUser!} />
            </MainLayout>
          </ProtectedRoute>
        } />

        {/* Default Redirection */}
        <Route path="/" element={
          <ProtectedRoute user={currentUser} role={role} loading={loading}>
            {role === 'ADMIN' ? <Navigate to="/admin" replace /> : <Navigate to="/profile" replace />}
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
