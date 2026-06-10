import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { UserProfile, UserRole } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  role: UserRole;
  onLogout: () => void;
}

const SIDEBAR_WIDTH = 288; // w-72 = 18rem = 288px
const SWIPE_OPEN_ZONE = 24;  // px desde el borde izquierdo para iniciar apertura
const SWIPE_THRESHOLD = 60;  // px mínimos para completar el gesto

export function MainLayout({ children, user, role, onLogout }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Touch tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const dragging = useRef(false);
  const [dragX, setDragX] = useState(0); // offset visual durante el drag

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  // ── Touch handlers ──────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    touchStartX.current = x;
    touchStartY.current = y;

    // Iniciar apertura solo si el toque empieza cerca del borde izquierdo
    // o si el sidebar ya está abierto (para poder cerrarlo arrastrando)
    if (x <= SWIPE_OPEN_ZONE || sidebarOpen) {
      dragging.current = true;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || touchStartX.current === null || touchStartY.current === null) return;

    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Cancelar si el movimiento es más vertical que horizontal
    if (Math.abs(dy) > Math.abs(dx)) {
      dragging.current = false;
      setDragX(0);
      return;
    }

    if (sidebarOpen) {
      // Solo permitir arrastrar hacia la izquierda (cerrar)
      setDragX(Math.min(0, dx));
    } else {
      // Solo permitir arrastrar hacia la derecha (abrir)
      setDragX(Math.max(0, Math.min(dx, SIDEBAR_WIDTH)));
    }
  };

  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;

    if (sidebarOpen) {
      // Cerrar si arrastró suficiente hacia la izquierda
      setSidebarOpen(Math.abs(dragX) < SWIPE_THRESHOLD);
    } else {
      // Abrir si arrastró suficiente hacia la derecha
      setSidebarOpen(dragX > SWIPE_THRESHOLD);
    }

    setDragX(0);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Calcular posición del sidebar durante el drag
  const sidebarTranslate = sidebarOpen
    ? Math.min(0, dragX)                        // abierto: solo va hacia la izquierda
    : Math.max(-SIDEBAR_WIDTH, dragX - SIDEBAR_WIDTH); // cerrado: parte desde -288 y va hacia 0

  return (
    <div
      className="flex h-screen overflow-hidden bg-sud-black selection:bg-sud-turquoise selection:text-black max-w-[100vw]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Sidebar desktop (siempre visible ≥ md) ── */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          role={role}
          user={user}
          currentPath={location.pathname}
          onLogout={onLogout}
          onNavigate={handleNavigate}
        />
      </div>

      {/* ── Drawer móvil ── */}
      <div className="md:hidden">
        {/* Overlay — aparece cuando el sidebar está abierto o arrastrándose */}
        {(sidebarOpen || dragX > 0) && (
          <div
            className="fixed inset-0 z-30"
            style={{
              backgroundColor: `rgba(0,0,0,${sidebarOpen
                ? Math.max(0, 0.7 + dragX / SIDEBAR_WIDTH * (-0.7))
                : (dragX / SIDEBAR_WIDTH) * 0.7
              })`,
            }}
            onClick={() => { setSidebarOpen(false); setDragX(0); }}
          />
        )}

        {/* Sidebar panel */}
        <div
          className="fixed inset-y-0 left-0 z-40 flex"
          style={{
            transform: `translateX(${
              dragging.current
                ? sidebarTranslate        // posición libre durante drag
                : sidebarOpen ? 0 : -SIDEBAR_WIDTH  // snap final
            }px)`,
            transition: dragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
            willChange: 'transform',
          }}
        >
          <Sidebar
            role={role}
            user={user}
            currentPath={location.pathname}
            onLogout={onLogout}
            onNavigate={handleNavigate}
          />
        </div>
      </div>

      {/* ── Área de contenido principal ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 max-w-full">

        {/* Barra superior móvil con botón hamburguesa */}
        <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-sud-black/80 backdrop-blur-sm z-20 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <Menu size={18} className="text-slate-400" />
          </button>
          <img
            src="/logos/SUD_ISO_1.png"
            alt="SudTalent"
            className="h-7 w-7 object-contain opacity-70"
          />
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-12 relative z-10">
          <div className="fixed top-0 right-0 w-96 h-96 bg-sud-turquoise/[0.03] blur-[120px] rounded-full pointer-events-none" />
          <div className="fixed bottom-0 left-0 w-96 h-96 bg-sud-orange/[0.03] blur-[120px] rounded-full pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </main>

        <footer className="shrink-0 h-12 md:h-16 bg-sud-black flex items-center px-4 md:px-12 border-t border-white/[0.02] justify-between relative z-20">
          <div className="flex gap-4 md:gap-8 items-center">
            <div className="flex items-center gap-2 md:gap-3">
              <img
                src="/logos/SUD_ISO_1.png"
                alt="SUD"
                className="h-4 w-4 md:h-5 md:w-5 object-contain opacity-40"
              />
              <span className="text-[9px] md:text-[10px] text-slate-700 uppercase tracking-widest font-black">SudTalent v1.2.0</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sud-turquoise animate-pulse shadow-[0_0_8px_var(--color-sud-turquoise)]" />
              <span className="text-[9px] md:text-[10px] text-slate-700 uppercase tracking-widest font-black">Servidor En Línea</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
