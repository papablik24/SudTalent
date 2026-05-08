import React from 'react';
import { motion } from 'motion/react';
import { Sidebar } from '../components/Sidebar';
import { UserProfile, UserRole } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  role: UserRole;
  onLogout: () => void;
}

export function MainLayout({ children, user, role, onLogout }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-sud-black selection:bg-sud-turquoise selection:text-black">
      <Sidebar 
        role={role} 
        user={user} 
        currentPath={location.pathname} 
        onLogout={onLogout} 
        onNavigate={(path) => navigate(path)}
      />

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
        </footer>
      </div>
    </div>
  );
}
