import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { AuthScreen } from './pages/AuthScreen';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminTalentReview } from './pages/admin/AdminTalentReview';
import { AdminSettings } from './pages/admin/AdminSettings';
import { ConvocatoriasAdmin } from './pages/admin/ConvocatoriasAdmin';
import { AdminPostulaciones } from './pages/admin/AdminPostulaciones';
import { AdminProfesores } from './pages/admin/AdminProfesores';
import { ConvocatoriasUser } from './pages/user/ConvocatoriasUser';
import { UserPostulacionesView } from './pages/user/UserPostulacionesView';
import { UserProfileView } from './pages/user/UserProfileView';
import { UserDemosView } from './pages/user/UserDemosView';
import { UserOnboarding } from './pages/UserOnboarding';
import { AsistenteIA } from './pages/AsistenteIA';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ProfesorDashboard } from './pages/profesor/ProfesorDashboard';
import { useAuth } from './hooks/useAuth';
import { useAdminData } from './hooks/useAdminData';
import { authService } from './services/backendService';
import { UserProfile, TalentProfile } from './types';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
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

    // 1. Llamar al backend para marcar onboarded en la BD
    try {
      const response = await authService.onboard({
        name: data.name || currentUser.name,
        email: data.email || currentUser.email,
        profileType: data.profileType || 'PERSONAL',
        bio: data.bio || (profileData as any)?.bio,
        age: data.age ?? (profileData as any)?.age,
        phone: data.phone || currentUser.phone || undefined,
        // specialties llega como string[] del onboarding — se une con coma para el backend
        specialties: Array.isArray((profileData as any)?.specialties)
          ? ((profileData as any).specialties as string[]).join(',')
          : (profileData as any)?.specialties,
        childName: data.profileType === 'PARENT' ? (profileData as any).childName ?? (data as any).childName : undefined,
        childAge: data.profileType === 'PARENT' ? (profileData as any).childAge ?? (data as any).childAge : undefined,
      });
      // Actualizar el user con lo que devolvió el backend (incluye onboarded: true)
      const respUser = (response as any)?.user ?? response;
      if (respUser?.onboarded !== undefined) {
        data.onboarded = respUser.onboarded;
      }
    } catch (err) {
      console.error('Error al completar onboarding en backend:', err);
      // No bloqueamos el flujo — marcamos onboarded: true localmente igual
    }

    const updatedUser: UserProfile = {
      ...currentUser,
      ...data,
      onboarded: true,
    };

    // 2. Persistir localmente
    localStorage.setItem('sud_current_user', JSON.stringify(updatedUser));

    // 3. Actualizar sud_registered_users para que re-login local no resetee onboarded
    const regStr = localStorage.getItem('sud_registered_users');
    if (regStr && updatedUser.email) {
      try {
        const registered = JSON.parse(regStr);
        const key = updatedUser.email.toLowerCase();
        if (registered[key]) {
          registered[key].user = { ...registered[key].user, ...updatedUser, onboarded: true };
          localStorage.setItem('sud_registered_users', JSON.stringify(registered));
        }
      } catch { /* ignore */ }
    }

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
            role === 'PROFESOR' ? <Navigate to="/profesor" replace /> :
            currentUser.onboarded ? <Navigate to="/profile" replace /> : (
              <UserOnboarding 
                onComplete={handleOnboardingComplete} 
                userPhone={currentUser.phone || ''}
                userEmail={currentUser.email || ''}
                userName={currentUser.name}
                initialBio={currentUser.bio}
                initialAge={currentUser.age}
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
                  onNavigate={(path) => navigate(path)}
                  onUpdateStatus={updateUserStatus}
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
                  onUpdateStatus={updateUserStatus}
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

          <Route path="/admin/postulaciones" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
              <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
                <AdminPostulaciones />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/profesores" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
              <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
                <AdminProfesores />
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

          <Route path="/admin/asistente-ia" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['ADMIN']} loading={loading}>
              <MainLayout user={currentUser} role="ADMIN" onLogout={logout}>
                <AsistenteIA />
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* ── Profesor Routes ──────────────────────────────── */}
          <Route path="/profesor" element={
            <ProtectedRoute user={currentUser} role={role} allowedRoles={['PROFESOR']} loading={loading}>
              <ProfesorDashboard user={currentUser!} onLogout={logout} />
            </ProtectedRoute>
          } />

          {/* ── User Routes (require onboarded) ──────────────── */}
          <Route path="/profile" element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : (
              <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
                <MainLayout user={currentUser} role="USER" onLogout={logout}>
                  <UserProfileView 
                    user={currentUser!} 
                    onNavigateToDemos={() => navigate('/demos')} 
                    onNavigateToConvocatorias={() => navigate('/convocatorias')}
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

          <Route path="/mis-postulaciones" element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : (
              <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
                <MainLayout user={currentUser} role="USER" onLogout={logout}>
                  <UserPostulacionesView user={currentUser!} />
                </MainLayout>
              </ProtectedRoute>
            )
          } />

          <Route path="/asistente-ia" element={
            needsOnboarding ? <Navigate to="/onboarding" replace /> : (
              <ProtectedRoute user={currentUser} role={role} allowedRoles={['USER']} loading={loading}>
                <MainLayout user={currentUser} role="USER" onLogout={logout}>
                  <AsistenteIA />
                </MainLayout>
              </ProtectedRoute>
            )
          } />

          {/* ── Default Redirect ──────────────────────────────── */}
          <Route path="*" element={
            !currentUser ? <Navigate to="/auth" replace /> :
            role === 'ADMIN' ? <Navigate to="/admin" replace /> :
            role === 'PROFESOR' ? <Navigate to="/profesor" replace /> :
            needsOnboarding ? <Navigate to="/onboarding" replace /> :
            <Navigate to="/profile" replace />
          } />
        </Routes>
      </div>
  );
}
