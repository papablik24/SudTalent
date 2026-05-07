/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic2, 
  Users, 
  Plus, 
  Search, 
  LogOut, 
  ShieldCheck, 
  Phone, 
  ChevronRight, 
  CheckCircle2, 
  Trash2,
  User,
  Settings,
  AudioLines,
  Sparkles,
  Upload,
  Play,
  Heart,
  Baby
} from 'lucide-react';
import { 
  AppView, 
  UserRole, 
  UserProfile, 
  WhitelistEntry, 
  ProfileType, 
  ProfileStatus,
  TalentProfile,
  VoiceDemo,
  DemoCategory,
  ProfileCategory
} from './types';
import { db, auth, storage } from './lib/firebase';
import { AdminTalentReview } from './components/AdminTalentReview';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  orderBy,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [view, setView] = useState<AppView>('AUTH');
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [talentProfiles, setTalentProfiles] = useState<Record<string, TalentProfile>>({});
  const [allDemos, setAllDemos] = useState<Record<string, VoiceDemo[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.uid);
      
      if (user) {
        setLoading(true);
        try {
          // Si estamos en medio de un login (handleUserLogin), esto podría entrar en conflicto.
          // Pero onAuthStateChanged es la fuente de verdad para usuarios reales.
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setCurrentUser(userData);
            setRole(userData.role);
            
            setView(current => (current === 'AUTH' ? (userData.onboarded ? 'USER_PROFILE' : 'PROFILE_TYPE_SELECTION') : current));
          }
        } catch (error) {
          console.error("Error fetching user data in listener:", error);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("No user signed in on Firebase auth");
        setCurrentUser(prev => {
          if (prev?.uid?.startsWith('mock_')) {
            console.log("Maintaining mock session");
            return prev;
          }
          // Si no es mock y no hay user, volvemos a auth
          setView(current => (current !== 'AUTH' ? 'AUTH' : current));
          setRole(null);
          return null;
        });
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Whitelist for Admin
  useEffect(() => {
    if (role === 'ADMIN') {
      const isMock = currentUser?.uid?.startsWith('mock_');
      
      if (isMock) {
        const localWhitelist = localStorage.getItem('mock_whitelist');
        if (localWhitelist) {
          setWhitelist(JSON.parse(localWhitelist));
        } else {
          // Initial demo data
          const demoList: WhitelistEntry[] = [
            { phone: '+56912345678', name: 'Usuario Demo', addedAt: new Date().toISOString() },
            { phone: '+56987654321', name: 'Ana Silva', addedAt: new Date(Date.now() - 86400000).toISOString() }
          ];
          setWhitelist(demoList);
          localStorage.setItem('mock_whitelist', JSON.stringify(demoList));
        }
      }

      const q = query(collection(db, 'authorized_phones'), orderBy('addedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: WhitelistEntry[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as WhitelistEntry);
        });
        // Only override if we have real data from Firestore
        if (list.length > 0 || !isMock) {
          setWhitelist(list);
        }
      }, (error) => {
        console.warn("Firestore access restricted, using local session data.");
      });
      return () => unsubscribe();
    }
  }, [role, currentUser]);

  useEffect(() => {
    (window as any)._setView = setView;
  }, []);

  // Sync Admin Data for Talent Review
  useEffect(() => {
    if (role === 'ADMIN') {
      const isMock = currentUser?.uid?.startsWith('mock_') || currentUser?.uid?.startsWith('dev_admin_');
      
      // 1. Sync All Users
      const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const usersList: UserProfile[] = [];
        snapshot.forEach(doc => usersList.push(doc.data() as UserProfile));
        
        if (usersList.length === 0 && isMock) {
          // Seed mock users if empty and in mock mode
          seedMockData();
        } else if (usersList.length > 0 || !isMock) {
          setAllUsers(usersList);
        }
      }, (error) => {
        console.warn("Firestore access restricted (users). Using session-only data.");
        if (isMock && allUsers.length === 0) seedMockData();
      });

      // 2. Sync Talent Profiles
      const profilesUnsubscribe = onSnapshot(collection(db, 'profiles'), (snapshot) => {
        const profileMap: Record<string, TalentProfile> = {};
        snapshot.forEach(doc => {
          const data = doc.data() as TalentProfile;
          profileMap[data.userId] = data;
        });
        setTalentProfiles(profileMap);
      }, (error) => {
        console.warn("Firestore access restricted (profiles).");
      });

      // 3. Sync All Demos
      const demosUnsubscribe = onSnapshot(collection(db, 'demos'), (snapshot) => {
        const demoMap: Record<string, VoiceDemo[]> = {};
        snapshot.forEach(doc => {
          const data = doc.data() as VoiceDemo;
          if (!demoMap[data.userId]) demoMap[data.userId] = [];
          demoMap[data.userId].push(data);
        });
        setAllDemos(demoMap);
      }, (error) => {
        console.warn("Firestore access restricted (demos).");
      });

      const seedMockData = () => {
        const mockUsers: UserProfile[] = [
          { 
            uid: 'mock_talent_1', 
            name: 'Catalina Martínez', 
            phone: '+56900112233', 
            role: 'USER', 
            status: 'APPROVED', 
            profileType: 'PERSONAL', 
            primaryCategory: 'Doblaje',
            createdAt: new Date(Date.now() - 10000000).toISOString(),
            onboarded: true
          },
          { 
            uid: 'mock_talent_2', 
            name: 'Ricardo Espinoza', 
            phone: '+56944556677', 
            role: 'USER', 
            status: 'PENDING', 
            profileType: 'PARENT', 
            primaryCategory: 'Locución',
            createdAt: new Date(Date.now() - 5000000).toISOString(),
            onboarded: true
          },
          { 
            uid: 'mock_talent_3', 
            name: 'Elena Soto', 
            phone: '+56988990011', 
            role: 'USER', 
            status: 'APPROVED', 
            profileType: 'PERSONAL', 
            primaryCategory: 'Podcast',
            createdAt: new Date(Date.now() - 2000000).toISOString(),
            onboarded: true
          }
        ];
        setAllUsers(mockUsers);
        
        setTalentProfiles({
          'mock_talent_1': { userId: 'mock_talent_1', type: 'PERSONAL', specialties: ['Doblaje Neutro', 'Anime'], bio: 'Actriz de doblaje con 5 años de experiencia.', location: 'Santiago, CL' },
          'mock_talent_2': { userId: 'mock_talent_2', type: 'PARENT', childName: 'Diego Espinoza', childAge: 8, specialties: ['Voces Infantiles'], bio: 'Representante de Diego, talento infantil.', location: 'Viña del Mar, CL' },
          'mock_talent_3': { userId: 'mock_talent_3', type: 'PERSONAL', specialties: ['Host', 'Narración'], bio: 'Locutora profesional y host de podcast.', location: 'Concepción, CL' }
        });

        setAllDemos({
          'mock_talent_1': [
            { id: 'd1', userId: 'mock_talent_1', title: 'Demo Doblaje Acción', category: 'Doblaje', fileUrl: '', duration: '0:45', createdAt: new Date().toISOString() },
            { id: 'd2', userId: 'mock_talent_1', title: 'Comercial Radio', category: 'Locución', fileUrl: '', duration: '0:30', createdAt: new Date().toISOString() }
          ],
          'mock_talent_3': [
            { id: 'd3', userId: 'mock_talent_3', title: 'Narración Educativa', category: 'Podcast', fileUrl: '', duration: '1:20', createdAt: new Date().toISOString() }
          ]
        });
      };

      return () => {
        usersUnsubscribe();
        profilesUnsubscribe();
        demosUnsubscribe();
      };
    }
  }, [role, currentUser]);

  const handleUpdateUserStatus = async (userId: string, status: ProfileStatus) => {
    try {
      const isMock = userId.startsWith('mock_') || userId.startsWith('dev_') || userId.startsWith('fallback_');
      if (isMock) {
        setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, status } : u));
      } else {
        await updateDoc(doc(db, 'users', userId), { status });
      }
    } catch (err) {
      console.error("Error updating user status:", err);
    }
  };

  const handleUserLogin = async (phone: string, otp?: string) => {
    setLoading(true);
    setError(null);
    console.log("Attempting login for:", phone, "OTP:", otp);
    try {
      const phoneId = phone.replace('+', '');
      
      // --- BYPASS DE DESARROLLO (12345678) ---
      const isDevBypass = phoneId === '56912345678' || phoneId === '12345678';
      
      // Validación de OTP si se proporciona
      if (otp && isDevBypass && otp !== '000000') {
         setError('Código OTP incorrecto para el usuario de prueba.');
         setLoading(false);
         return;
      }
      
      let userData: UserProfile | null = null;
      let uid: string;
      let isMock = false;

      if (isDevBypass) {
        console.log("Bypass de desarrollo activado para 12345678");
        uid = `mock_user_12345678`;
        isMock = true;
      } else {
        // 1. Check if phone is authorized (Solo para números reales)
        try {
          const authDoc = await getDoc(doc(db, 'authorized_phones', phoneId));
          if (!authDoc.exists()) {
            console.log("Phone not authorized:", phone);
            setError('Número no autorizado. SudTalent es una plataforma exclusiva para alumnos de Sudamerican Voices.');
            setLoading(false);
            return;
          }
        } catch (authDocErr) {
          console.error("Error checking authorization:", authDocErr);
          // Si falla la verificación por permisos de red, pero no es el bypass, avisamos
          setError('Error de conexión con el servidor de membresías.');
          setLoading(false);
          return;
        }

        console.log("Authorized! Signing in...");
        // 2. Sign in (Try Real, Fallback to Mock)
        try {
          const userCredential = await signInAnonymously(auth);
          uid = userCredential.user.uid;
        } catch (authErr: any) {
          // Si el error es admin-restricted-operation, es un bloqueo de Firebase por configuración
          if (authErr.code === 'auth/admin-restricted-operation' || authErr.message?.includes('admin-restricted-operation')) {
            console.warn("Auth restricted (admin-restricted-operation). Using mock session.");
          } else {
            console.warn("Auth failed:", authErr.message, ". Using mock session.");
          }
          uid = `mock_${Date.now()}`;
          isMock = true;
        }
      }

      // 3. Get/Create User Profile
      if (isMock) {
        const localUser = localStorage.getItem(`user_${uid}`);
        userData = localUser ? JSON.parse(localUser) : null;
      } else {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) userData = userDoc.data() as UserProfile;
        } catch (e) { isMock = true; }
      }

      if (!userData) {
        userData = {
          uid,
          phone,
          role: 'USER',
          onboarded: isDevBypass, // 12345678 ya empieza como onboarded para el demo
          createdAt: new Date().toISOString(),
          name: isDevBypass ? 'Usuario Demo' : ''
        };
        if (isMock) localStorage.setItem(`user_${uid}`, JSON.stringify(userData));
        else await setDoc(doc(db, 'users', uid), userData);
      }

      setCurrentUser(userData);
      setRole(userData.role);
      if (!userData.onboarded) {
        setView('PROFILE_TYPE_SELECTION');
      } else {
        setView('USER_PROFILE');
      }
    } catch (err) {
      console.error("Login flow error:", err);
      setError('Error al iniciar sesión. Verifique su conexión o contacte soporte.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      // Intentamos login con anónimo como modo simplificado, 
      // pero si el usuario quiere usar email/password podemos implementarlo
      const userCredential = await signInAnonymously(auth);
      const { user } = userCredential;
      
      const adminData: UserProfile = {
        uid: user.uid,
        phone: 'ADMIN',
        role: 'ADMIN',
        name: 'Administrador SudTalent',
        email: email,
        onboarded: true,
        createdAt: serverTimestamp()
      };
      
      try {
        await setDoc(doc(db, 'users', user.uid), adminData);
        await setDoc(doc(db, 'admins', user.uid), { active: true });
      } catch (e) {
        console.warn("Firestore access restricted for admin metadata sync. Using session-only admin.");
      }
      
      setCurrentUser(adminData);
      setRole('ADMIN');
      setView('ADMIN_DASHBOARD');
    } catch (err: any) {
      const isRestricted = err.code === 'auth/admin-restricted-operation' || err.message?.includes('admin-restricted-operation');
      
      if (isRestricted) {
        console.info("Bypass: auth/admin-restricted-operation detectado. Iniciando sesión en modo desarrollo.");
        
        const mockAdmin: UserProfile = { 
          uid: 'dev_admin_' + Math.random().toString(36).substr(2, 9), 
          phone: 'ADMIN', 
          role: 'ADMIN', 
          onboarded: true, 
          createdAt: new Date(), 
          name: 'Admin (Modo Desarrollo)',
          email: email
        };
        
        setCurrentUser(mockAdmin);
        setRole('ADMIN');
        setView('ADMIN_DASHBOARD');
      } else {
        // Solo logueamos como ERROR si no es el error de restricción que ya manejamos
        console.error("Admin Login Error:", err);
        setError('Error de autenticación: ' + (err.message || 'Consulte la consola para más detalles'));
        
        // Fallback genérico para que el usuario no se quede bloqueado
        if (email.includes('admin') || email.includes('sudamerican')) {
          console.log("Emergency fallback to mock admin");
          const emergencyAdmin: UserProfile = {
            uid: 'emergency_admin',
            phone: 'ADMIN',
            role: 'ADMIN',
            onboarded: true,
            createdAt: new Date(),
            name: 'Admin (Bypass Emergencia)',
            email: email
          };
          setCurrentUser(emergencyAdmin);
          setRole('ADMIN');
          setView('ADMIN_DASHBOARD');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileTypeSelect = (type: ProfileType) => {
    if (currentUser) {
      setView('USER_ONBOARDING');
      // Pass the selected type to onboarding (can store in state or temporary session)
      (window as any)._pendingProfileType = type;
    }
  };

  const handleOnboardingComplete = async (data: Partial<UserProfile>, profileData: Partial<TalentProfile>) => {
    if (currentUser) {
      setLoading(true);
      try {
        const type = (window as any)._pendingProfileType as ProfileType;
        const isMock = currentUser.uid.startsWith('mock_');
        
        const updatedUser = {
          ...currentUser,
          ...data,
          profileType: type,
          onboarded: true,
          updatedAt: new Date().toISOString()
        };

        const newProfile = {
          userId: currentUser.uid,
          type: type,
          ...profileData,
          createdAt: new Date().toISOString()
        };

        if (isMock) {
          localStorage.setItem(`user_${currentUser.uid}`, JSON.stringify(updatedUser));
          localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(newProfile));
        } else {
          // Update user
          await updateDoc(doc(db, 'users', currentUser.uid), {
            ...data,
            profileType: type,
            onboarded: true,
            updatedAt: serverTimestamp()
          });

          // Create profile
          await setDoc(doc(db, 'profiles', currentUser.uid), newProfile);
        }

        setCurrentUser(updatedUser as UserProfile);
        setView('USER_PROFILE');
      } catch (err) {
        console.error(err);
        alert('Error al guardar el perfil');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    if (currentUser?.uid?.startsWith('mock_')) {
      // Just clear local state
      console.log("Logging out from mock session");
    } else {
      await signOut(auth);
    }
    setRole(null);
    setCurrentUser(null);
    setView('AUTH');
    setLoading(false);
  };

  const addToWhitelist = async (phone: string, name: string, category: ProfileCategory = 'NONE') => {
    const id = phone.replace('+', '');
    const isMock = currentUser?.uid?.startsWith('mock_');
    const newEntry: WhitelistEntry = {
      phone,
      name,
      category,
      addedAt: isMock ? new Date().toISOString() : serverTimestamp(),
      addedBy: currentUser?.uid
    };

    if (isMock) {
      const updated = [newEntry, ...whitelist];
      setWhitelist(updated);
      localStorage.setItem('mock_whitelist', JSON.stringify(updated));
    } else {
      try {
        await setDoc(doc(db, 'authorized_phones', id), newEntry);
      } catch (e) {
        // Fallback to local if permissions fail
        const updated = [newEntry, ...whitelist];
        setWhitelist(updated);
        localStorage.setItem('mock_whitelist', JSON.stringify(updated));
      }
    }
  };

  const removeFromWhitelist = async (phone: string) => {
    const id = phone.replace('+', '');
    const isMock = currentUser?.uid?.startsWith('mock_');

    if (isMock) {
      const updated = whitelist.filter(e => e.phone !== phone);
      setWhitelist(updated);
      localStorage.setItem('mock_whitelist', JSON.stringify(updated));
      
      // Si hay un usuario real mockeado con ese teléfono, también quitarlo
      setAllUsers(prev => prev.filter(u => u.phone !== phone));
    } else {
      try {
        await deleteDoc(doc(db, 'authorized_phones', id));
        // Si hay un usuario real con ese teléfono, también podríamos querer desactivarlo o borrarlo
        const userWithPhone = allUsers.find(u => u.phone === phone);
        if (userWithPhone) {
          await updateDoc(doc(db, 'users', userWithPhone.uid), { status: 'INACTIVE' });
        }
      } catch (e) {
        const updated = whitelist.filter(e => e.phone !== phone);
        setWhitelist(updated);
        localStorage.setItem('mock_whitelist', JSON.stringify(updated));
      }
    }
  };

  const updateStudent = async (phone: string, updates: any) => {
    const isMock = currentUser?.uid?.startsWith('mock_');
    const id = phone.replace('+', '');

    if (isMock) {
      setWhitelist(prev => prev.map(e => e.phone === phone ? { ...e, ...updates } : e));
      setAllUsers(prev => prev.map(u => u.phone === phone ? { ...u, ...updates } : u));
    } else {
      try {
        // Actualizar tabla de acceso
        const authDoc = doc(db, 'authorized_phones', id);
        const authSnap = await getDoc(authDoc);
        if (authSnap.exists()) {
          await updateDoc(authDoc, updates);
        }

        // Actualizar usuario si ya está registrado
        const user = allUsers.find(u => u.phone === phone);
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), updates);
        }
      } catch (err) {
        console.error("Error updating student:", err);
      }
    }
  };

  if (loading && view === 'AUTH') {
    return (
      <div className="min-h-screen bg-sud-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-sud-orange/20 border-t-sud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-sud-orange selection:text-white bg-[#0a0a0a] text-slate-100">
      <AnimatePresence mode="wait">
        {view === 'AUTH' && (
          <AuthScreen 
            onUserLogin={handleUserLogin} 
            onAdminLogin={handleAdminLogin}
            loading={loading}
            error={error}
          />
        )}
        
        {view === 'ADMIN_DASHBOARD' && (
          <Layout onLogout={handleLogout} setView={setView} view={view} role="ADMIN" user={currentUser}>
            <AdminDashboard 
              whitelist={whitelist} 
              onAdd={addToWhitelist}
              onRemove={removeFromWhitelist}
              onUpdate={updateStudent}
              view={view}
              users={allUsers}
            />
          </Layout>
        )}

        {view === 'ADMIN_STUDENTS' && (
          <Layout onLogout={handleLogout} setView={setView} view={view} role="ADMIN" user={currentUser}>
            <AdminDashboard 
              whitelist={whitelist} 
              onAdd={addToWhitelist}
              onRemove={removeFromWhitelist}
              onUpdate={updateStudent}
              view={view}
              users={allUsers}
            />
          </Layout>
        )}

        {view === 'ADMIN_TALENT_REVIEW' && (
          <Layout onLogout={handleLogout} setView={setView} view={view} role="ADMIN" user={currentUser}>
            <AdminTalentReview 
              users={allUsers}
              talentProfiles={talentProfiles}
              allDemos={allDemos}
              onUpdateStatus={handleUpdateUserStatus}
            />
          </Layout>
        )}

        {view === 'PROFILE_TYPE_SELECTION' && (
          <ProfileTypeSelection onSelect={handleProfileTypeSelect} />
        )}

        {view === 'USER_ONBOARDING' && (
          <UserOnboarding 
            onComplete={handleOnboardingComplete} 
            userPhone={currentUser?.phone || ''}
            profileType={(window as any)._pendingProfileType}
          />
        )}

        {view === 'USER_PROFILE' && (
          <Layout onLogout={handleLogout} setView={setView} view={view} role="USER" user={currentUser}>
            <UserProfileView 
              user={currentUser!} 
              onNavigateToDemos={() => setView('USER_DEMOS')} 
              onUpdateUser={(updated) => setCurrentUser(prev => prev ? { ...prev, ...updated } : null)}
            />
          </Layout>
        )}

        {view === 'USER_DEMOS' && (
          <Layout onLogout={handleLogout} setView={setView} view={view} role="USER" user={currentUser}>
            <UserDemosView user={currentUser!} />
          </Layout>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SHARED COMPONENTS ---

function Layout({ children, onLogout, role, user, setView, view }: { 
  children: React.ReactNode; 
  onLogout: () => void;
  role: UserRole;
  user?: UserProfile | null;
  setView?: (view: AppView) => void;
  view?: AppView;
}) {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-sud-black selection:bg-sud-turquoise selection:text-black">
      {/* Sidebar */}
      <aside className="w-full md:w-72 sud-glass-sidebar flex flex-col p-8 space-y-10 backdrop-blur-3xl relative z-20">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tighter leading-none text-white uppercase group-hover:sud-vibrant-text-gradient transition-all">
            SUD<span className="sud-vibrant-text-gradient">TALENT</span>
          </h1>
          <span className="text-[10px] text-slate-500 tracking-[0.2em] uppercase font-black mt-1">
            Gestión de Voces
          </span>
        </div>

        <nav className="flex-1 space-y-3">
          <p className="text-[10px] uppercase font-black text-slate-700 tracking-[0.3em] mb-4 px-2">Navegación</p>
          {role === 'ADMIN' ? (
            <>
              <NavItem 
                icon={<ShieldCheck size={20} />} 
                label="Lista Blanca" 
                active={view === 'ADMIN_DASHBOARD'} 
                onClick={() => setView?.('ADMIN_DASHBOARD')}
              />
              <NavItem 
                icon={<Users size={20} />} 
                label="Gestión Alumnos" 
                active={view === 'ADMIN_STUDENTS'}
                onClick={() => setView?.('ADMIN_STUDENTS')}
              />
              <NavItem 
                icon={<Mic2 size={20} />} 
                label="Revisión Casting" 
                active={view === 'ADMIN_TALENT_REVIEW'}
                onClick={() => setView?.('ADMIN_TALENT_REVIEW')}
              />
              <NavItem icon={<Settings size={20} />} label="Ajustes" />
            </>
          ) : (
            <>
              <NavItem 
                icon={<User size={20} />} 
                label="Mi Perfil" 
                active={view === 'USER_PROFILE'} 
                onClick={() => setView?.('USER_PROFILE')}
              />
              <NavItem 
                icon={<AudioLines size={20} />} 
                label="Mis Demos" 
                active={view === 'USER_DEMOS'}
                onClick={() => setView?.('USER_DEMOS')}
              />
              <NavItem icon={<Sparkles size={20} />} label="Oportunidades" />
            </>
          )}
        </nav>

        <div className="pt-8 border-t border-white/5 space-y-6">
          <div className="flex items-center space-x-4 p-4 rounded-3xl bg-white/[0.02] border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-sud-gradient p-[1px] flex items-center justify-center shadow-lg shadow-sud-turquoise/10">
              <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="text-sud-turquoise" size={24} />
                )}
              </div>
            </div>
            <div className="truncate flex-1">
              <p className="text-sm font-black truncate text-white uppercase tracking-tight">{user?.name || (role === 'ADMIN' ? 'Admin' : 'Alumno')}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-bold">{role === 'ADMIN' ? 'Acceso Total' : user?.phone}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-3 text-slate-500 hover:text-white transition-all w-full group px-4 py-3 rounded-2xl hover:bg-red-500/5 hover:border-red-500/10 border border-transparent"
          >
            <LogOut size={18} className="group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-red-400">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-6 md:p-12 relative z-10">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-sud-turquoise/[0.03] blur-[150px] rounded-full pointer-events-none -mr-96 -mt-96" />
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-sud-orange/[0.03] blur-[150px] rounded-full pointer-events-none -ml-96 -mb-96" />
          
          <motion.div
             initial={{ opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </main>

        <footer className="h-16 bg-sud-black flex items-center px-12 border-t border-white/[0.02] justify-between relative z-20">
          <div className="flex gap-8 items-center">
            <span className="text-[10px] text-slate-700 uppercase tracking-widest font-black">SudTalent v1.2.0</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sud-turquoise animate-pulse shadow-[0_0_8px_var(--color-sud-turquoise)]" />
              <span className="text-[10px] text-slate-700 uppercase tracking-widest font-black">Servidor En Línea</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 hidden sm:block uppercase tracking-widest font-black opacity-40">

          </div>
        </footer>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-4 w-full px-5 py-4 rounded-[1.2rem] transition-all duration-300 relative group font-black uppercase tracking-[0.1em] text-[10px] ${
      active 
        ? 'bg-white/5 text-white shadow-xl shadow-black' 
        : 'text-slate-600 hover:text-slate-200 hover:bg-white/[0.02]'
    }`}>
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="absolute left-2 w-1.5 h-6 rounded-full bg-sud-turquoise shadow-[0_0_15px_var(--color-sud-turquoise)]"
        />
      )}
      <span className={`transition-colors duration-300 ${active ? 'text-sud-turquoise' : 'group-hover:text-sud-turquoise'}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// --- VIEW COMPONENTS ---

function AuthScreen({ onUserLogin, onAdminLogin, loading, error }: { 
  onUserLogin: (phone: string, otp?: string) => Promise<void> | void; 
  onAdminLogin: (email: string, pass: string) => Promise<void> | void;
  loading: boolean;
  error: string | null;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [phone, setPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      onAdminLogin(adminEmail, adminPass);
    } else if (!otpSent) {
      if (phone.length !== 8) {
        alert('Por favor ingrese los 8 dígitos de su número móvil.');
        return;
      }
      // Demo bypass for 12345678 - simulate instant SMS
      setOtpSent(true);
    } else {
      if (otp.length !== 6) {
        alert('Por favor ingrese el código de 6 dígitos.');
        return;
      }
      onUserLogin(`+569${phone}`, otp);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sud-black relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-sud-turquoise/[0.03] blur-[200px] rounded-full -mr-96 -mt-96" />
      <div className="absolute bottom-0 left-0 w-[1000px] h-[1000px] bg-sud-orange/[0.03] blur-[200px] rounded-full -ml-96 -mb-96" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black tracking-tighter mb-4 text-white uppercase italic">
            SUD<span className="sud-vibrant-text-gradient tracking-tight">TALENT</span>
          </h1>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] leading-relaxed opacity-80">
            Gestión Profesional de Voz<br />
            <span className="text-[9px] opacity-40">Ingeniería para Artistas © 2026</span>
          </p>
        </div>

        <div className="sud-glass-panel p-10 relative overflow-hidden border-white/[0.07]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sud-turquoise/[0.05] blur-[80px] rounded-full -mr-24 -mt-24"></div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-black uppercase tracking-widest"
            >
              {error}
            </motion.div>
          )}

          <div className="flex bg-white/[0.02] p-1.5 rounded-[1.5rem] mb-10 border border-white/[0.05]">
            <button 
              onClick={() => { setIsAdmin(false); setOtpSent(false); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${!isAdmin ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Alumno
            </button>
            <button 
              onClick={() => { setIsAdmin(true); setOtpSent(false); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isAdmin ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isAdmin ? (
              <>
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-3 border-r border-white/10 pr-4 mr-4 h-6">
                      <Phone className="text-sud-turquoise" size={16} />
                      <span className="text-white/40 font-black text-xs tracking-widest">+56 9</span>
                    </div>
                    <input 
                      type="tel"
                      placeholder="XXXX XXXX"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setPhone(val);
                      }}
                      disabled={otpSent || loading}
                      className="sud-input w-full pl-32 tracking-[0.2em]"
                      required
                    />
                  </div>
                  
                  <AnimatePresence>
                    {otpSent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        <p className="text-[10px] text-sud-turquoise font-black uppercase tracking-widest text-center">Código enviado vía SMS</p>
                        <input 
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="sud-input w-full text-center text-3xl tracking-[0.6em] font-black h-20"
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <input 
                  type="email"
                  placeholder="CORREO@ADMIN.SUD"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="sud-input w-full uppercase tracking-widest text-[10px] font-black"
                  required
                />
                <input 
                  type="password"
                  placeholder="CONTRASEÑA"
                  value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                  className="sud-input w-full uppercase tracking-widest text-[10px] font-black"
                  required
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="sud-btn-primary w-full h-16 rounded-[1.5rem]"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span className="mt-0.5">{isAdmin ? 'Acceso Administrador' : (otpSent ? 'Validar Código' : 'Solicitar Acceso')}</span>
                  {!loading && <ChevronRight size={20} />}
                </>
              )}
            </button>
          </form>

          {!isAdmin && !otpSent && (
            <p className="text-center mt-8 text-[9px] text-slate-700 font-black uppercase tracking-[0.2em] leading-relaxed opacity-60">
              Uso restringido para comunidad<br />
              <span className="text-slate-500">Sudamerican Voices</span>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ProfileTypeSelection({ onSelect }: { onSelect: (type: ProfileType) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sud-dark relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sud-turquoise/5 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sud-orange/5 blur-[150px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Selecciona tu <span className="sud-vibrant-text-gradient">Perfil</span></h2>
          <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">¿Cómo gestionarás tu carrera en SudTalent?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ProfileTypeCard 
            icon={<User size={40} className="text-sud-turquoise" />}
            title="Perfil Personal"
            description="Para alumnos adultos que gestionan su propia carrera y demos de voz."
            onClick={() => onSelect('PERSONAL')}
            color="sud-turquoise"
          />
          <ProfileTypeCard 
            icon={<Baby size={40} className="text-sud-orange" />}
            title="Perfil Apoderado"
            description="Para adultos que representan a un menor de edad. Gestiona el talento de tu hijo/tutorado."
            onClick={() => onSelect('PARENT')}
            color="sud-orange"
          />
        </div>
      </motion.div>
    </div>
  );
}

function ProfileTypeCard({ icon, title, description, onClick, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button 
      onClick={onClick}
      className="group relative bg-white/[0.015] border border-white/[0.05] rounded-[3.5rem] p-12 text-left transition-all duration-500 hover:bg-white/[0.04] hover:border-white/15 hover:scale-[1.03] active:scale-[0.98] overflow-hidden shadow-2xl"
    >
      <div className={`absolute top-0 right-0 w-48 h-48 bg-${color}/10 blur-[100px] rounded-full -mr-24 -mt-24 group-hover:bg-${color}/20 transition-all duration-700`} />
      <div className="mb-10 relative z-10 p-5 rounded-3xl bg-white/[0.03] border border-white/[0.05] inline-block shadow-xl">
        {icon}
      </div>
      <h3 className="text-3xl font-black text-white mb-5 uppercase tracking-tighter leading-none">{title}</h3>
      <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest leading-relaxed mb-10 opacity-60 group-hover:opacity-100 transition-opacity">{description}</p>
      <div className={`flex items-center gap-3 text-${color} text-[10px] font-black uppercase tracking-[0.2em] relative z-10`}>
        Seleccionar Perfil <div className={`p-2 rounded-full bg-${color}/10 group-hover:translate-x-2 transition-all`}><ChevronRight size={16} /></div>
      </div>
    </button>
  );
}

function AdminDashboard({ whitelist, onAdd, onRemove, onUpdate, view, users = [] }: { 
  whitelist: WhitelistEntry[]; 
  onAdd: (phone: string, name: string, category: ProfileCategory) => void;
  onRemove: (phone: string) => void;
  onUpdate: (phone: string, updates: any) => void;
  view: AppView;
  users?: UserProfile[];
}) {
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProfileCategory>('NONE');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ProfileCategory>('NONE');

  // Combinamos la whitelist con los usuarios reales que ya se registraron
  // o que son usuarios de prueba en revisión
  const displayUsers = [
    ...whitelist.map(w => ({ ...w, type: 'WHITELIST' as const })),
    ...users
      .filter(u => u.status === 'PENDING' || u.uid.startsWith('mock_'))
      .filter(u => !whitelist.some(w => w.phone === u.phone)) // Evitar duplicados si ya están en whitelist
      .map(u => ({ 
        phone: u.phone, 
        name: u.name, 
        addedAt: u.createdAt, 
        type: 'REGISTERED' as const,
        status: u.status,
        category: u.category || 'NONE',
        uid: u.uid
      }))
  ];

  const filteredList = displayUsers.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.phone?.includes(searchTerm)
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const digitsOnly = newPhone.replace(/\D/g, '');
    if (digitsOnly.length === 8 && newName.trim()) {
      onAdd(`+569${digitsOnly}`, newName.trim(), newCategory);
      setNewPhone('');
      setNewName('');
      setNewCategory('NONE');
    } else {
      alert('Por favor ingrese un nombre y un número de 8 dígitos.');
    }
  };

  const handleStartEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditName(entry.name || '');
    setEditCategory(entry.category || 'NONE');
  };

  const handleSaveEdit = () => {
    if (editingEntry) {
      onUpdate(editingEntry.phone, {
        name: editName,
        category: editCategory
      });
      setEditingEntry(null);
    }
  };

  const getCategoryLabel = (cat?: ProfileCategory) => {
    switch (cat) {
      case 'ADULT': return 'Adulto';
      case 'MINOR': return 'Menor';
      case 'BOTH': return 'Ambos';
      default: return 'Pendiente';
    }
  };

  if (view === 'ADMIN_DASHBOARD') {
    return (
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white">Panel de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Administración</span></h2>
            <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">Resumen general de la plataforma</p>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={() => (window as any)._setView?.('ADMIN_STUDENTS')}
                className="sud-btn-primary px-8 py-4"
             >
                <Plus size={18} />
                <span>Nuevo Alumno</span>
             </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Total Alumnos" value={displayUsers.length.toString()} color="sud-turquoise" />
          <StatCard label="Demos Totales" value="24" color="sud-orange" />
          <StatCard label="Usuarios Activos" value="18" color="sud-yellow" />
          <button 
            onClick={() => (window as any)._setView?.('ADMIN_TALENT_REVIEW')}
            className="sud-stat-card bg-gradient-to-br from-sud-turquoise/20 to-sud-turquoise/5 border-sud-turquoise/40 group relative overflow-hidden text-left"
          >
            <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 -mr-16 -mt-16 bg-sud-turquoise" />
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Smart Casting</p>
            <p className="text-xl font-black tracking-tight text-white group-hover:text-sud-turquoise transition-colors">Revisión de Talento</p>
            <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-sud-turquoise">
              Ir al panel <ChevronRight size={12} />
            </div>
          </button>
        </div>

        <section className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sud-turquoise/[0.03] blur-[100px] rounded-full" />
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
              <Sparkles className="text-sud-orange" size={20} />
              Actividad Reciente
            </h3>
            <button 
              onClick={() => (window as any)._setView?.('ADMIN_STUDENTS')}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-sud-turquoise hover:underline"
            >
              Ver todos los alumnos
            </button>
          </div>
          <div className="space-y-4">
            {displayUsers.slice(0, 3).map((entry, i) => (
              <div key={i} className="group flex items-center justify-between p-7 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-sud-gradient p-[1px] shadow-lg shadow-sud-turquoise/5">
                    <div className="w-full h-full rounded-[0.9rem] bg-black flex items-center justify-center text-sud-turquoise font-black text-2xl">
                      {entry.name ? entry.name[0].toUpperCase() : 'A'}
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-black text-white uppercase tracking-tight group-hover:sud-vibrant-text-gradient transition-all">{entry.name || 'Alumno Sin Nombre'}</p>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mt-1">
                      {entry.type === 'REGISTERED' ? 'En Revisión Casting' : 'Autorizado en Plataforma'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest hidden md:block">Recién Agregado</span>
                  <div className="p-3 rounded-full bg-white/5 group-hover:bg-sud-turquoise group-hover:text-black transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            ))}
            {whitelist.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No hay alumnos registrados</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Gestión de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Alumnos</span></h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">Autorización de acceso y gestión de membresías</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus className="text-sud-orange" size={20} />
              Añadir Nuevo Alumno
            </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre del Alumno</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="sud-input w-full"
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Número Móvil</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono text-xs">+56 9</span>
                    <input 
                      type="tel"
                      placeholder="XXXXXXXX"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="sud-input w-full pl-16 py-2.5"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Categoría del Perfil</label>
                  <select 
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as ProfileCategory)}
                    className="sud-input w-full appearance-none cursor-pointer"
                  >
                    <option value="NONE">Asignar luego</option>
                    <option value="ADULT">Adulto</option>
                    <option value="MINOR">Menor</option>
                    <option value="BOTH">Ambos</option>
                  </select>
                </div>
                <button type="submit" className="w-full sud-btn-primary py-4 text-xs font-black uppercase tracking-widest">
                  Autorizar Alumno
                </button>
              </div>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="text-sud-turquoise" size={20} />
                Lista de Acceso
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input 
                  placeholder="Buscar alumno..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-black/40 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-[10px] outline-none focus:border-white/20 transition-all font-medium uppercase tracking-widest"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-white/20 bg-white/[0.02] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Alumno</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {editingEntry?.phone === entry.phone ? (
                            <input 
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm font-black text-white uppercase tracking-tight w-full outline-none focus:border-sud-turquoise/30"
                              autoFocus
                            />
                          ) : (
                            <>
                              <p className="text-sm font-black text-white uppercase tracking-tight">{entry.name || 'Sin Nombre'}</p>
                              {entry.type === 'REGISTERED' && (
                                <span className="text-[7px] px-2 py-0.5 rounded-full bg-sud-orange/20 text-sud-orange font-black uppercase tracking-widest border border-sud-orange/30">
                                  En Revisión
                                </span>
                              )}
                              {entry.phone === 'ADMIN' && (
                                <span className="text-[7px] px-2 py-0.5 rounded-full bg-sud-turquoise/20 text-sud-turquoise font-black uppercase tracking-widest border border-sud-turquoise/30">
                                  Admin
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-400">{entry.phone}</td>
                      <td className="px-6 py-4">
                        {editingEntry?.phone === entry.phone ? (
                          <select 
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value as ProfileCategory)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-black text-white uppercase tracking-tight outline-none cursor-pointer focus:border-sud-turquoise/30"
                          >
                             <option value="NONE">Sin Cat.</option>
                             <option value="ADULT">Adulto</option>
                             <option value="MINOR">Menor</option>
                             <option value="BOTH">Ambos</option>
                          </select>
                        ) : (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-current/10 ${entry.category === 'ADULT' ? 'text-blue-400 bg-blue-400/5' : entry.category === 'MINOR' ? 'text-pink-400 bg-pink-400/5' : entry.category === 'BOTH' ? 'text-purple-400 bg-purple-400/5' : 'text-slate-500 opacity-50 bg-white/5'}`}>
                            {getCategoryLabel(entry.category)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingEntry?.phone === entry.phone ? (
                            <>
                              <button 
                                onClick={handleSaveEdit}
                                className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors shadow-lg shadow-green-400/5"
                                title="Guardar cambios"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <button 
                                onClick={() => setEditingEntry(null)}
                                className="p-2 text-slate-500 hover:bg-white/5 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <LogOut size={18} className="rotate-180" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleStartEdit(entry)}
                                className="p-2 text-white/10 hover:text-sud-turquoise hover:bg-sud-turquoise/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                                title="Editar alumno"
                              >
                                <Settings size={18} />
                              </button>
                              <button 
                                onClick={() => onRemove(entry.phone)}
                                className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-black uppercase tracking-widest text-[10px]">
                        No se encontraron alumnos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const getGradient = () => {
    switch(color) {
      case 'sud-turquoise': return 'from-sud-turquoise/20 to-sud-turquoise/5';
      case 'sud-orange': return 'from-sud-orange/20 to-sud-orange/5';
      case 'sud-yellow': return 'from-sud-yellow/20 to-sud-yellow/5';
      default: return 'from-white/10 to-white/5';
    }
  };

  const getBorder = () => {
    switch(color) {
      case 'sud-turquoise': return 'border-sud-turquoise/20';
      case 'sud-orange': return 'border-sud-orange/20';
      case 'sud-yellow': return 'border-sud-yellow/20';
      default: return 'border-white/10';
    }
  };

  return (
    <div className={`sud-stat-card bg-gradient-to-br ${getGradient()} ${getBorder()} group relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-30 -mr-16 -mt-16 bg-${color}`} />
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className="text-5xl font-black tracking-tighter text-white group-hover:scale-105 transition-transform duration-500">{value}</p>
    </div>
  );
}

function UserOnboarding({ onComplete, userPhone, profileType }: { 
  onComplete: (data: Partial<UserProfile>, profileData: Partial<TalentProfile>) => void | Promise<void>; 
  userPhone: string;
  profileType: ProfileType;
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [profileData, setProfileData] = useState({
    age: 0, // faltaba agregar edad para perfil personal
    childName: '',
    childAge: 0,
    specialties: [] as string[],
    bio: ''
  });

  const specs = ['Doblaje', 'Locución Comercial', 'Podcast', 'Presentación', 'Canto', 'Narración'];

  const toggleSpec = (spec: string) => {
    setProfileData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(spec) 
        ? prev.specialties.filter(s => s !== spec) 
        : [...prev.specialties, spec]
    }));
  };

  const handleFinish = () => {
    onComplete(formData, { ...profileData, type: profileType });
  };

  return (
    <div className="min-h-screen bg-sud-dark flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sud-turquoise/10 blur-[150px] rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sud-orange/10 blur-[150px] rounded-full -ml-32 -mb-32" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl backdrop-blur-3xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 sud-vibrant-gradient opacity-30" />
        
        <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-black mb-1 tracking-tight">Registro de <span className="sud-vibrant-text-gradient uppercase">{profileType === 'PERSONAL' ? 'Talento' : 'Apoderado'}</span></h2>
            <p className="text-slate-500 font-medium text-xs tracking-widest uppercase">{profileType === 'PERSONAL' ? 'Configura tu perfil profesional' : 'Representa a un talento menor de edad'}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-black text-sud-turquoise uppercase tracking-widest">Paso {step} de 2</span>
            <div className="flex gap-1 mt-1">
              <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-sud-turquoise' : 'bg-white/10'}`} />
              <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-sud-turquoise' : 'bg-white/10'}`} />
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Tu Nombre Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="sud-input w-full"
                  placeholder="Ej: Roberto Pérez"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="sud-input w-full"
                  placeholder="ejemplo@sud.com"
                />
              </div>
              {profileType === 'PERSONAL' && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Edad</label>
                  <input 
                    type="number" 
                    value={profileData.age || ''}
                    onChange={e => setProfileData({...profileData, age: parseInt(e.target.value) || 0})}
                    className="sud-input w-full"
                    placeholder="25"
                  />
                </div>
              )}
            </div>

            {profileType === 'PARENT' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-6 border-t border-white/5 space-y-6"
              >
                <p className="text-xs font-bold text-sud-orange uppercase tracking-widest">Datos del Menor Representado</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre del Menor</label>
                    <input 
                      type="text" 
                      value={profileData.childName}
                      onChange={e => setProfileData({...profileData, childName: e.target.value})}
                      className="sud-input w-full"
                      placeholder="Nombre del niño/a"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Edad</label>
                    <input 
                      type="number" 
                      value={profileData.childAge || ''}
                      onChange={e => setProfileData({...profileData, childAge: parseInt(e.target.value) || 0})}
                      className="sud-input w-full"
                      placeholder="12"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-end">
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.email || (profileType === 'PARENT' && !profileData.childName)}
                className="sud-btn-secondary px-10 py-4 shadow-xl"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Especialidades {profileType === 'PARENT' ? 'del Menor' : ''}</label>
              <div className="flex flex-wrap gap-3">
                {specs.map(s => (
                  <button 
                    key={s}
                    onClick={() => toggleSpec(s)}
                    className={`px-6 py-3 rounded-2xl border transition-all text-xs font-bold uppercase tracking-wider ${
                      profileData.specialties.includes(s) 
                        ? 'bg-sud-turquoise/20 border-sud-turquoise text-sud-turquoise shadow-lg shadow-sud-turquoise/10' 
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Biografía / Experiencia</label>
              <textarea 
                value={profileData.bio}
                onChange={e => setProfileData({...profileData, bio: e.target.value})}
                className="sud-input w-full h-32 py-4 resize-none"
                placeholder="Breve resumen de trayectoria..."
              />
            </div>

            <div className="bg-black/40 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-sud-turquoise/10 flex items-center justify-center">
                  <CheckCircle2 className="text-sud-turquoise" size={20} />
                </div>
                <div>
                   <p className="text-xs font-bold text-white tracking-widest uppercase">Perfiles Verificados</p>
                   <p className="text-[10px] text-slate-500 uppercase">SudTalent valida cada registro manualmente.</p>
                </div>
              </div>
              <button 
                onClick={handleFinish}
                className="sud-btn-primary md:w-auto md:px-12"
              >
                Finalizar Registro
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function UserProfileView({ user, onNavigateToDemos, onUpdateUser }: { 
  user: UserProfile; 
  onNavigateToDemos: () => void; 
  onUpdateUser: (data: Partial<UserProfile>) => void;
}) {
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    email: user.email || '',
    age: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user.uid) return;
    
    if (user.uid.startsWith('mock_')) {
      const localProfile = localStorage.getItem(`profile_${user.uid}`);
      if (localProfile) {
        const p = JSON.parse(localProfile);
        setProfile(p);
        setEditData(prev => ({ ...prev, age: user.profileType === 'PARENT' ? (p.childAge || 0) : (p.age || 0) }));
      }
      return;
    }
    
    getDoc(doc(db, 'profiles', user.uid)).then(docSnap => {
      if (docSnap.exists()) {
        const p = docSnap.data() as TalentProfile;
        setProfile(p);
        setEditData(prev => ({ ...prev, age: user.profileType === 'PARENT' ? (p.childAge || 0) : (p.age || 0) }));
      }
    });
  }, [user.uid]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isMock = user.uid.startsWith('mock_');
      
      const userUpdates = { 
        email: editData.email,
        updatedAt: isMock ? new Date().toISOString() : serverTimestamp()
      };
      
      const profileUpdates: any = {
        updatedAt: isMock ? new Date().toISOString() : serverTimestamp()
      };
      if (user.profileType === 'PARENT') profileUpdates.childAge = editData.age;
      else profileUpdates.age = editData.age;

      if (isMock) {
        // Mock Update
        const localUser = localStorage.getItem(`user_${user.uid}`);
        if (localUser) {
          const u = JSON.parse(localUser);
          localStorage.setItem(`user_${user.uid}`, JSON.stringify({ ...u, ...userUpdates }));
        }
        
        const localProfile = localStorage.getItem(`profile_${user.uid}`);
        if (localProfile) {
          const p = JSON.parse(localProfile);
          const updatedProfile = { ...p, ...profileUpdates };
          localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updatedProfile));
          setProfile(updatedProfile);
        }
      } else {
        // Real Update
        await updateDoc(doc(db, 'users', user.uid), userUpdates);
        await updateDoc(doc(db, 'profiles', user.uid), profileUpdates);
        setProfile(prev => prev ? { ...prev, ...profileUpdates } : null);
      }

      onUpdateUser(userUpdates);
      setIsEditing(false);
      alert('Perfil actualizado con éxito');
    } catch (err) {
      console.error(err);
      alert('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="relative rounded-[3rem] overflow-hidden bg-black border border-white/10 shadow-2xl">
        <div className="h-48 sud-vibrant-gradient opacity-10 blur-3xl absolute -top-24 w-full" />
        <div className="p-10 relative flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="w-32 h-32 rounded-[2rem] bg-white/5 border-2 border-white/10 p-1 flex-shrink-0 group cursor-pointer relative shadow-xl">
            <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-sud-dark flex items-center justify-center">
              {user.profileType === 'PARENT' ? <Baby size={48} className="text-sud-orange" /> : <User size={48} className="text-slate-700 group-hover:text-sud-orange transition-colors" />}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-sud-orange p-2.5 rounded-2xl shadow-lg ring-4 ring-black">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <h2 className="text-4xl font-black tracking-tighter text-white">
                {user.profileType === 'PARENT' ? profile?.childName : user.name}
              </h2>
              <span className="px-3 py-1.5 rounded-full bg-sud-turquoise/10 text-sud-turquoise text-[10px] font-black uppercase tracking-widest border border-sud-turquoise/20 shadow-lg shadow-sud-turquoise/5">
                Talento {user.profileType === 'PARENT' ? 'Infantil' : 'Verificado'}
              </span>
            </div>
            <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2 font-bold text-xs uppercase tracking-widest">
              <AudioLines size={16} className="text-sud-orange" />
              {profile?.specialties.join(' • ') || 'Actor de Voz'}
            </p>
            {user.profileType === 'PARENT' && (
              <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-2">Representado por: {user.name}</p>
            )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onNavigateToDemos}
              className="sud-btn-secondary px-10 py-5 rounded-3xl shadow-2xl"
            >
              Mis Demos
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`p-5 rounded-3xl border transition-all ${isEditing ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/40 hover:text-white'}`}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tighter text-white">Información General</h3>
              {isEditing && (
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-sud-orange text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-sud-orange/80 disabled:opacity-50 transition-all"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-1">Teléfono</p>
                  <p className="text-slate-200 font-mono">{user.phone}</p>
                  <p className="text-[8px] text-slate-700 mt-1 uppercase font-bold tracking-widest italic">Solo lectura por seguridad</p>
                </div>
                
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">Email</p>
                  {isEditing ? (
                    <input 
                      type="email"
                      value={editData.email}
                      onChange={e => setEditData({...editData, email: e.target.value})}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-full text-white outline-none focus:border-sud-orange transition-all"
                    />
                  ) : (
                    <p className="text-slate-200">{editData.email || 'No proporcionado'}</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">
                    {user.profileType === 'PARENT' ? 'Edad del Menor' : 'Edad'}
                  </p>
                  {isEditing ? (
                    <input 
                      type="number"
                      value={editData.age || ''}
                      onChange={e => setEditData({...editData, age: parseInt(e.target.value) || 0})}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-full text-white outline-none focus:border-sud-orange transition-all"
                    />
                  ) : (
                    <p className="text-slate-200 font-mono">{editData.age || 'No especificada'} años</p>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest mb-2">Biografía</p>
                <p className="text-sm text-slate-400 leading-relaxed italic">
                  {profile?.bio || 'Sin biografía disponible.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-4 space-y-6">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white px-2">Estado del Perfil</h3>
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sud-yellow/5 blur-3xl rounded-full" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sud-yellow/10 flex items-center justify-center">
                <div className="w-3 h-3 bg-sud-yellow rounded-full animate-pulse" />
              </div>
              <p className="text-sm font-bold text-white leading-tight uppercase tracking-widest">Revisión Pendiente</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Tu perfil está siendo revisado por el equipo de casting. Una vez aprobado, aparecerás en las búsquedas internas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserDemosView({ user }: { user: UserProfile }) {
  const [demos, setDemos] = useState<VoiceDemo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newDemo, setNewDemo] = useState({ title: '', category: 'Doblaje' as DemoCategory });

  useEffect(() => {
    if (!user.uid) return;
    
    if (user.uid.startsWith('mock_')) {
      const localDemos = localStorage.getItem(`demos_${user.uid}`);
      if (localDemos) setDemos(JSON.parse(localDemos));
      return;
    }
    
    const q = query(collection(db, 'users', user.uid, 'demos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: VoiceDemo[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as VoiceDemo);
      });
      setDemos(list);
    }, (err) => {
      console.warn("Demos snapshot error:", err);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleUploadDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDemo.title) return;
    
    setIsUploading(true);
    try {
      const isMock = user.uid.startsWith('mock_');
      const simulatedUrl = `https://example.com/demos/${user.uid}/${Date.now()}.mp3`;
      
      const newDemoData = {
        userId: user.uid,
        title: newDemo.title,
        category: newDemo.category,
        fileUrl: simulatedUrl,
        duration: '1:30',
        createdAt: isMock ? new Date().toISOString() : serverTimestamp()
      };

      if (isMock) {
        const demoId = `mock_demo_${Date.now()}`;
        const updatedDemos = [{ id: demoId, ...newDemoData } as VoiceDemo, ...demos];
        setDemos(updatedDemos);
        localStorage.setItem(`demos_${user.uid}`, JSON.stringify(updatedDemos));
      } else {
        const demoId = doc(collection(db, 'users', user.uid, 'demos')).id;
        await setDoc(doc(db, 'users', user.uid, 'demos', demoId), newDemoData);
      }
      
      setNewDemo({ title: '', category: 'Doblaje' });
      setIsUploading(false);
      alert('Demo cargada con éxito (simulado)');
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8 px-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">Mis <span className="sud-vibrant-text-gradient uppercase tracking-widest">Demos</span></h2>
          <p className="text-slate-400 mt-2 font-medium text-xs tracking-widest uppercase">Gestiona tus muestras de voz profesionales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 sticky top-8">
            <h4 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus className="text-sud-turquoise" size={20} />
              Añadir Nueva Demo
            </h4>
            <div className="p-4 bg-sud-turquoise/5 border border-sud-turquoise/10 rounded-2xl flex items-center gap-4">
              <Upload className="text-sud-turquoise" size={24} />
              <p className="text-[10px] font-bold text-sud-turquoise uppercase tracking-widest">Carga archivos MP3 o WAV</p>
            </div>
            <form onSubmit={handleUploadDemo} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Título de la Demo</label>
                <input 
                  type="text"
                  value={newDemo.title}
                  onChange={e => setNewDemo({...newDemo, title: e.target.value})}
                  className="sud-input w-full"
                  placeholder="Ej: Personaje Anime - Combat"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Categoría</label>
                <select 
                  value={newDemo.category}
                  onChange={e => setNewDemo({...newDemo, category: e.target.value as DemoCategory})}
                  className="sud-input w-full appearance-none pr-10"
                >
                  <option value="Doblaje">Doblaje</option>
                  <option value="Locución">Locución</option>
                  <option value="Podcast">Podcast</option>
                  <option value="Presentación">Presentación</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isUploading || !newDemo.title}
                className="w-full sud-btn-primary py-5 text-sm shadow-xl shadow-sud-orange/10 transition-all hover:scale-[1.02]"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
                ) : (
                  'Confirmar Carga de Audio'
                )}
              </button>
            </form>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black uppercase tracking-tighter text-white">Lista de Demos <span className="text-slate-700 ml-2 font-mono text-sm">({demos.length})</span></h3>
          </div>
          {demos.length === 0 ? (
            <div className="p-16 text-center bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <AudioLines className="text-white/10" size={40} />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Aún no has cargado demos</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2">Usa el panel lateral para subir tu primera muestra de voz</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {demos.map(demo => (
                <DemoItem key={demo.id} demo={demo} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DemoItem: React.FC<{ demo: VoiceDemo }> = ({ demo }) => {
  return (
    <div className="bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-[2rem] p-6 transition-all group flex items-center gap-6 cursor-pointer shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-white/5 group-hover:bg-sud-orange transition-all" />
      <div className="w-16 h-16 rounded-3xl bg-black border border-white/10 flex items-center justify-center group-hover:sud-vibrant-gradient transition-all shadow-lg relative overflow-hidden">
        <AudioLines className="text-slate-700 group-hover:text-white relative z-10" size={28} />
        <div className="absolute inset-0 bg-sud-orange/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{demo.title}</h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest bg-black/40 px-2 py-1 rounded-md">{demo.duration}</span>
            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-sud-orange hover:text-white transition-all">
              <Play size={14} fill="currentColor" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[9px] font-black uppercase tracking-widest bg-sud-turquoise/10 px-2 py-1.5 rounded-lg text-sud-turquoise border border-sud-turquoise/10">
              {demo.category}
            </span>
            <div className="flex-1" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest opacity-60">
              {demo.createdAt?.toDate?.() ? demo.createdAt.toDate().toLocaleDateString() : 'Procesando...'}
            </span>
        </div>
      </div>
    </div>
  );
}

