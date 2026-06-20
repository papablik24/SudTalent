import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, ShieldCheck, Settings, Trash2, CheckCircle2, LogOut, CheckCircle, XCircle, Clock, FileDown, X, User, Phone, Mail, Calendar, AudioLines, Play, Pause, ChevronRight, BookOpen, FileText, MessageSquare, ImagePlus, AlertTriangle } from 'lucide-react';
import { UserProfile, WhitelistEntry, ProfileCategory, ProfileStatus } from '../../types';
import { generateAlumnosPDF, generateAlumnosExcel } from '../../services/reportService';
import { fetchAPI, backendService, WhitelistCandidate, ImportSummary } from '../../services/backendService';
import { AudioPlayer } from '../../components/ui/AudioPlayer';
import { extractPhoneContactsFromImage } from '../../services/geminiService';

interface AdminStudentsProps {
  whitelist: WhitelistEntry[];
  users: UserProfile[];
  onAdd: (phone: string, name: string, category: ProfileCategory, email?: string, role?: string) => Promise<void>;
  onRemove: (phone: string, uid?: string) => Promise<void> | void;
  onUpdate: (phone: string, updates: any) => void;
  onUpdateStatus?: (userId: string, status: ProfileStatus) => void;
  onRefresh?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────
const formatPhone = (phone?: string) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('56') ? digits.slice(2) : digits;
  const n = local.startsWith('9') ? local.slice(1) : local;
  if (n.length < 8) return phone;
  return `+56 9 ${n.slice(0, 4)} ${n.slice(4, 8)}`;
};

const getCategoryLabel = (cat?: ProfileCategory) => {
  switch (cat) {
    case 'ADULT': return 'Adulto';
    case 'MINOR': return 'Menor';
    case 'BOTH': return 'Ambos';
    default: return 'Sin categoría';
  }
};

const getStatusInfo = (entry: any) => {
  if (entry.status === 'APPROVED') return { label: 'Aprobado', cls: 'text-sud-turquoise bg-sud-turquoise/10 border-sud-turquoise/20', Icon: CheckCircle };
  if (entry.status === 'INACTIVE') return { label: 'Inactivo', cls: 'text-red-400 bg-red-400/10 border-red-400/20', Icon: XCircle };
  if (entry.status === 'PENDING' || entry.type === 'REGISTERED') return { label: 'En Revisión', cls: 'text-sud-yellow bg-sud-yellow/10 border-sud-yellow/20', Icon: Clock };
  if (entry.type === 'WHITELIST' && !entry.uid) return { label: 'Sin registrar', cls: 'text-slate-500 bg-white/5 border-white/10', Icon: Clock };
  return null;
};

export function AdminStudents({ whitelist, users, onAdd, onRemove, onUpdate, onUpdateStatus, onRefresh }: AdminStudentsProps) {
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCategory, setNewCategory] = useState<ProfileCategory>('NONE');
  const [newRole, setNewRole] = useState('ALUMNO');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [demoCounts, setDemoCounts] = useState<Record<string, number>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Carga masiva WhatsApp
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<'INPUT' | 'PREVIEW' | 'SUMMARY'>('INPUT');
  const [importText, setImportText] = useState('');
  const [candidates, setCandidates] = useState<WhitelistCandidate[]>([]);
  const [selectedCandidateIndices, setSelectedCandidateIndices] = useState<number[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extracción desde imagen
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractingImage, setExtractingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!importText.trim()) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const result = await backendService.previewWhitelistImport(importText);
      setCandidates(result);
      // Seleccionar los "VALID" por defecto
      const validIndices = result
        .map((c, i) => c.status === 'VALID' ? i : -1)
        .filter(idx => idx !== -1);
      setSelectedCandidateIndices(validIndices);
      setImportStep('PREVIEW');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al analizar el texto.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (selectedCandidateIndices.length === 0) return;
    setImporting(true);
    setErrorMsg(null);
    try {
      const payload = candidates.map((c, idx) => {
        if (selectedCandidateIndices.includes(idx)) {
          return { ...c, status: 'VALID' as const };
        } else {
          return { ...c, status: (c.status === 'VALID' ? 'DUPLICATE' : c.status) as any };
        }
      });

      const res = await backendService.confirmWhitelistImport(payload);
      setSummary(res);
      setImportStep('SUMMARY');
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al confirmar la importación.');
    } finally {
      setImporting(false);
    }
  };

  const handleEditCandidateName = (index: number, newName: string) => {
    setCandidates(prev => prev.map((c, i) => i === index ? { ...c, name: newName } : c));
  };

  const handleCloseSummary = () => {
    setShowImportModal(false);
    setImportStep('INPUT');
    setImportText('');
    setCandidates([]);
    setSelectedCandidateIndices([]);
    setSummary(null);
    setErrorMsg(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageError(null);
    setImageSuccess(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setImageError('Formato no soportado. Usa PNG, JPG o WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('La imagen supera el límite de 5 MB.');
      return;
    }
    setImageError(null);
    setImageSuccess(false);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleExtractFromImage = async () => {
    if (!imageFile) return;
    setExtractingImage(true);
    setImageError(null);
    setImageSuccess(false);
    try {
      const extracted = await extractPhoneContactsFromImage(imageFile);
      if (!extracted || extracted === 'SIN_CONTACTOS') {
        setImageError('La IA no detectó contactos visibles en la imagen. Intenta con una imagen más clara o ingresa el texto manualmente.');
        return;
      }
      setImportText(prev => prev ? `${prev.trim()}\n${extracted}` : extracted);
      setImageSuccess(true);
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg === 'API_KEY_MISSING') {
        setImageError('Gemini no está configurado. Ingresa el texto manualmente.');
      } else if (msg.includes('quota') || msg.includes('429')) {
        setImageError('Cuota de IA agotada temporalmente. Ingresa el texto manualmente.');
      } else {
        setImageError('La extracción desde imagen falló. Puedes ingresar el texto manualmente.');
      }
    } finally {
      setExtractingImage(false);
    }
  };

  type SortOption = 'NAME' | 'PHONE' | 'EMAIL' | 'STATUS' | 'MOST_DEMOS' | 'FEWEST_DEMOS' | 'CATEGORY' | 'ROLE';
  const [sortField, setSortField] = useState<'NAME' | 'PHONE' | 'EMAIL' | 'STATUS' | 'DEMOS' | 'CATEGORY' | 'ROLE'>('NAME');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');

  const toggleSort = (field: 'NAME' | 'PHONE' | 'EMAIL' | 'STATUS' | 'DEMOS' | 'CATEGORY' | 'ROLE') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDirection(field === 'DEMOS' ? 'DESC' : 'ASC');
    }
  };

  const getDropdownValue = (): SortOption => {
    if (sortField === 'NAME') return 'NAME';
    if (sortField === 'PHONE') return 'PHONE';
    if (sortField === 'EMAIL') return 'EMAIL';
    if (sortField === 'STATUS') return 'STATUS';
    if (sortField === 'DEMOS') {
      return sortDirection === 'DESC' ? 'MOST_DEMOS' : 'FEWEST_DEMOS';
    }
    if (sortField === 'CATEGORY') return 'CATEGORY';
    if (sortField === 'ROLE') return 'ROLE';
    return 'NAME';
  };

  const handleSortByChange = (val: string) => {
    if (val === 'NAME') {
      setSortField('NAME');
      setSortDirection('ASC');
    } else if (val === 'PHONE') {
      setSortField('PHONE');
      setSortDirection('ASC');
    } else if (val === 'EMAIL') {
      setSortField('EMAIL');
      setSortDirection('ASC');
    } else if (val === 'STATUS') {
      setSortField('STATUS');
      setSortDirection('ASC');
    } else if (val === 'MOST_DEMOS') {
      setSortField('DEMOS');
      setSortDirection('DESC');
    } else if (val === 'FEWEST_DEMOS') {
      setSortField('DEMOS');
      setSortDirection('ASC');
    } else if (val === 'CATEGORY') {
      setSortField('CATEGORY');
      setSortDirection('ASC');
    } else if (val === 'ROLE') {
      setSortField('ROLE');
      setSortDirection('ASC');
    }
  };

  const renderHeader = (label: string, field: 'NAME' | 'PHONE' | 'EMAIL' | 'STATUS' | 'DEMOS' | 'CATEGORY' | 'ROLE') => {
    const isActive = sortField === field;
    return (
      <th 
        onClick={() => toggleSort(field)}
        className={`px-4 py-4 cursor-pointer select-none hover:text-white transition-colors group ${
          isActive ? 'text-sud-turquoise font-black' : 'text-white/20'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {isActive ? (
            <span className="text-sud-turquoise font-black text-[9px] select-none">
              {sortDirection === 'ASC' ? '▲' : '▼'}
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-40 transition-opacity text-slate-500 text-[9px] select-none">
              ▲
            </span>
          )}
        </div>
      </th>
    );
  };

  const [allCursos, setAllCursos] = useState<any[]>([]);
  const [editingCursos, setEditingCursos] = useState(false);
  const [pendingCursoIds, setPendingCursoIds] = useState<Set<string>>(new Set());
  const [savingCursos, setSavingCursos] = useState(false);

  useEffect(() => {
    fetchAPI<any[]>('/cursos')
      .then(data => setAllCursos(data || []))
      .catch(err => console.error('Error al cargar cursos:', err));
  }, []);

  // Calcula los IDs de cursos actualmente asignados al alumno seleccionado
  const getEnrolledIds = (uid: string): Set<string> => {
    const alumnoId = String(uid);
    return new Set(
      allCursos
        .filter(c => c.alumnos?.some((a: any) => String(a.id || a.alumnoId) === alumnoId))
        .map(c => c.id)
    );
  };

  const startEditCursos = () => {
    if (!selectedEntry?.uid) return;
    setPendingCursoIds(getEnrolledIds(selectedEntry.uid));
    setEditingCursos(true);
  };

  const cancelEditCursos = () => {
    setEditingCursos(false);
    setPendingCursoIds(new Set());
  };

  const saveEditCursos = async () => {
    if (!selectedEntry?.uid) return;
    setSavingCursos(true);
    const alumnoId = String(selectedEntry.uid);
    try {
      const nextCursoIds = [...pendingCursoIds];
      await fetchAPI(`/cursos/asignar-alumno/${selectedEntry.uid}`, {
        method: 'PUT',
        body: JSON.stringify(nextCursoIds)
      });
      // Actualizar allCursos local
      setAllCursos(prev => prev.map(c => {
        const shouldBeEnrolled = pendingCursoIds.has(c.id);
        const isEnrolled = c.alumnos?.some((a: any) => String(a.id || a.alumnoId) === alumnoId);
        if (shouldBeEnrolled && !isEnrolled) {
          return { ...c, alumnos: [...(c.alumnos || []), { id: selectedEntry.uid, nombreAlumno: selectedEntry.name }] };
        }
        if (!shouldBeEnrolled && isEnrolled) {
          return { ...c, alumnos: (c.alumnos || []).filter((a: any) => String(a.id || a.alumnoId) !== alumnoId) };
        }
        return c;
      }));
      setEditingCursos(false);
      setPendingCursoIds(new Set());
    } catch (err) {
      console.error('Error al actualizar asignación de cursos:', err);
      alert('Error al actualizar asignación de cursos');
    } finally {
      setSavingCursos(false);
    }
  };

  const handleToggleCourse = async (cursoId: string, isEnrolled: boolean) => {
    if (!selectedEntry?.uid) return;
    const alumnoId = String(selectedEntry.uid);
    try {
      const currentCursoIds = allCursos
        .filter(c => c.alumnos?.some((a: any) => String(a.id || a.alumnoId) === alumnoId))
        .map(c => c.id);

      let nextCursoIds: string[];
      if (isEnrolled) {
        nextCursoIds = currentCursoIds.includes(cursoId)
          ? currentCursoIds
          : [...currentCursoIds, cursoId];
      } else {
        nextCursoIds = currentCursoIds.filter(id => id !== cursoId);
      }

      await fetchAPI(`/cursos/asignar-alumno/${selectedEntry.uid}`, {
        method: 'PUT',
        body: JSON.stringify(nextCursoIds)
      });

      setAllCursos(prev => prev.map(c => {
        if (c.id === cursoId) {
          const updatedAlumnos = isEnrolled
            ? [...(c.alumnos || []), { id: selectedEntry.uid, nombreAlumno: selectedEntry.name }]
            : (c.alumnos || []).filter((a: any) => String(a.id || a.alumnoId) !== alumnoId);
          return { ...c, alumnos: updatedAlumnos };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error al actualizar asignación de cursos:', err);
      alert('Error al actualizar asignación de cursos');
    }
  };

  // ── Lista unificada ────────────────────────────────────────────
  const displayUsers = [
    ...whitelist
      .filter((w: any) => w.role !== 'ADMIN' && w.role !== 'PROFESOR' && w.role !== 'ROLE_ADMIN' && w.role !== 'ROLE_PROFESOR')
      .map((w: any) => {
        const registeredUser = users.find(u => 
          (w.uid && String(u.uid) === String(w.uid)) ||
          (w.phone && u.phone && w.phone.replace(/\D/g, '').slice(-8) === u.phone.replace(/\D/g, '').slice(-8))
        );
        return {
          ...(w as any),
          type: 'WHITELIST' as const,
          category: (w as any).category || 'NONE',
          uid: (w as any).uid || (registeredUser ? registeredUser.uid : undefined),
          status: (w as any).userStatus || (registeredUser ? registeredUser.status : (w as any).status),
          name: (registeredUser && registeredUser.name && registeredUser.name.trim()) 
            ? registeredUser.name 
            : (w.name || 'Sin Nombre'),
          email: (registeredUser && registeredUser.email && registeredUser.email.trim()) 
            ? registeredUser.email 
            : (w.email || ''),
        };
      }),
    ...users
      .filter(u => u.role !== 'ADMIN' && u.role !== 'PROFESOR')
      .filter(u => {
        const uEmail = (u.email || '').toLowerCase();
        const uPhone = (u.phone || '').replace(/\D/g, '');
        return !whitelist.some((w: any) => {
          const wEmail = (w.email || '').toLowerCase();
          const wPhone = (w.phone || '').replace(/\D/g, '');
          return (uEmail && wEmail && uEmail === wEmail) ||
            (uPhone.length >= 8 && wPhone.length >= 8 && uPhone.slice(-8) === wPhone.slice(-8));
        });
      })
      .map(u => ({
        phone: u.phone, name: u.name, email: u.email,
        addedAt: u.createdAt, type: 'REGISTERED' as const,
        status: u.status, category: (u as any).category || 'NONE', uid: u.uid,
      })),
  ];

  const filteredList = displayUsers
    .filter(e =>
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.phone?.includes(searchTerm) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'NAME') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'PHONE') {
        const phoneA = (a.phone || '').replace(/\D/g, '');
        const phoneB = (b.phone || '').replace(/\D/g, '');
        comparison = phoneA.localeCompare(phoneB);
      } else if (sortField === 'EMAIL') {
        const emailA = (a.email || '').toLowerCase();
        const emailB = (b.email || '').toLowerCase();
        comparison = emailA.localeCompare(emailB);
      } else if (sortField === 'STATUS') {
        const getStatusOrder = (entry: any) => {
          const statusVal = entry.status || '';
          if (statusVal === 'APPROVED') return 1;
          if (statusVal === 'PENDING' || entry.type === 'REGISTERED') return 2;
          if (entry.type === 'WHITELIST' && !entry.uid) return 3;
          if (statusVal === 'INACTIVE') return 4;
          return 5;
        };
        const orderA = getStatusOrder(a);
        const orderB = getStatusOrder(b);
        comparison = orderA - orderB;
      } else if (sortField === 'DEMOS') {
        const countA = a.uid ? (demoCounts[a.uid] || 0) : 0;
        const countB = b.uid ? (demoCounts[b.uid] || 0) : 0;
        comparison = countA - countB;
      } else if (sortField === 'CATEGORY') {
        const catA = getCategoryLabel(a.category).toLowerCase();
        const catB = getCategoryLabel(b.category).toLowerCase();
        comparison = catA.localeCompare(catB);
      } else if (sortField === 'ROLE') {
        const getRoleString = (entry: any) => {
          const registeredUser = users.find(u =>
            u.uid === entry.uid ||
            (u.email && entry.email && u.email.toLowerCase() === entry.email.toLowerCase()) ||
            (u.phone && entry.phone && u.phone.replace(/\D/g, '').slice(-8) === entry.phone.replace(/\D/g, '').slice(-8))
          );
          if (registeredUser?.role === 'ADMIN') return 'Administrador';
          if (registeredUser?.profileType) return registeredUser.profileType;
          if (entry.category && entry.category !== 'NONE') return entry.category;
          return entry.role || 'ALUMNO';
        };
        const roleA = getRoleString(a).toLowerCase();
        const roleB = getRoleString(b).toLowerCase();
        comparison = roleA.localeCompare(roleB);
      }

      if (comparison === 0) {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }

      return sortDirection === 'ASC' ? comparison : -comparison;
    });

  useEffect(() => {
    const fetchAllDemoCounts = async () => {
      const uidsToFetch = displayUsers
        .filter(u => u.uid && demoCounts[u.uid] === undefined)
        .map(u => u.uid);

      if (uidsToFetch.length === 0) return;

      const batchSize = 10;
      for (let i = 0; i < uidsToFetch.length; i += batchSize) {
        const batch = uidsToFetch.slice(i, i + batchSize);
        const batchCounts: Record<string, number> = {};
        
        await Promise.all(
          batch.map(async (uid) => {
            try {
              const audios = await fetchAPI<any[]>(`/voice-audios/user/${uid}?category=demo`);
              batchCounts[uid] = audios ? audios.filter((d: any) => d.category === 'demo').length : 0;
            } catch (err) {
              console.error(`Error al obtener demos del usuario ${uid}:`, err);
              batchCounts[uid] = 0;
            }
          })
        );
        
        setDemoCounts(prev => ({ ...prev, ...batchCounts }));
      }
    };

    fetchAllDemoCounts();
  }, [displayUsers]);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const enrichedData = await Promise.all(
        filteredList.map(async (entry) => {
          let demoCount: string | number = 0;
          if (entry.uid) {
            try {
              const audios = await fetchAPI<any[]>(`/voice-audios/user/${entry.uid}?category=demo`);
              demoCount = audios ? audios.filter((d: any) => d.category === 'demo').length : 0;
            } catch (err) {
              console.error(`Error al obtener demos de ${entry.name}:`, err);
              demoCount = 'No disponible';
            }
          } else {
            demoCount = 'No disponible';
          }

          // Buscar el usuario registrado correspondiente
          const registeredUser = users.find(u =>
            u.uid === entry.uid ||
            (u.email && entry.email && u.email.toLowerCase() === entry.email.toLowerCase()) ||
            (u.phone && entry.phone && u.phone.replace(/\D/g, '').slice(-8) === entry.phone.replace(/\D/g, '').slice(-8))
          );

          // Obtener rol / tipo de perfil
          let rolTipo = 'No disponible';
          if (registeredUser?.role === 'ADMIN') {
            rolTipo = 'Administrador';
          } else if (registeredUser?.profileType) {
            rolTipo = registeredUser.profileType;
          } else if (entry.category && entry.category !== 'NONE') {
            rolTipo = entry.category;
          } else if (entry.role) {
            rolTipo = entry.role;
          }

          // Mapear etiquetas de estado
          const STATUS_LABELS: Record<string, string> = {
            APPROVED: 'Aprobado',
            PENDING: 'En Revisión',
            INACTIVE: 'Inactivo',
            PENDIENTE: 'Pendiente',
            ACTIVO: 'Activo',
            INACTIVO: 'Inactivo',
          };
          const rawStatus = entry.status || registeredUser?.status || '';
          const estado = STATUS_LABELS[rawStatus] || rawStatus || 'No disponible';

          // Fecha de registro formateada
          const rawDate = entry.addedAt || registeredUser?.createdAt;
          const fechaRegistro = rawDate ? new Date(rawDate).toLocaleDateString('es-CL') : 'No disponible';

          return {
            'Nombre': entry.name || registeredUser?.name || 'No disponible',
            'Email': entry.email || registeredUser?.email || 'No disponible',
            'Teléfono': entry.phone || registeredUser?.phone || 'No disponible',
            'Edad': registeredUser?.age && registeredUser.age > 0 ? registeredUser.age : 'No disponible',
            'Rol/Tipo de Perfil': rolTipo,
            'Estado del Perfil': estado,
            'Cantidad de Demos': demoCount,
            'Fecha de Registro': fechaRegistro
          };
        })
      );

      generateAlumnosExcel(enrichedData);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Hubo un error al exportar los datos a Excel.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Estado de edición inline
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCategory, setEditCategory] = useState<ProfileCategory>('NONE');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [deletingEntryConfirm, setDeletingEntryConfirm] = useState<any | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleExecuteDelete = async () => {
    if (!deletingEntryConfirm) return;
    setIsDeletingUser(true);
    try {
      const result: any = onRemove(deletingEntryConfirm.phone, deletingEntryConfirm.uid);
      if (result && typeof result.then === 'function') {
        await result;
      }
      showToast('Usuario eliminado correctamente.', 'success');
      setDeletingEntryConfirm(null);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('registros asociados') || msg.includes('CONSTRAINTS_VIOLATION')) {
        showToast('No se pudo eliminar el usuario porque tiene registros asociados. Puedes desactivarlo en su lugar.', 'error');
      } else {
        showToast('No se pudo eliminar el usuario. Intenta nuevamente.', 'error');
      }
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Panel de perfil
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [userDemos, setUserDemos] = useState<any[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(false);
  const [externalLink, setExternalLink] = useState<string>('');

  // Cargar demos y link externo cuando se selecciona un usuario
  useEffect(() => {
    if (!selectedEntry?.uid) { setUserDemos([]); setExternalLink(''); return; }
    setLoadingDemos(true);
    setExternalLink('');
    Promise.all([
      fetchAPI<any[]>(`/voice-audios/user/${selectedEntry.uid}`),
      fetchAPI<any>(`/users/${selectedEntry.uid}`),
    ])
      .then(([demosData, userData]) => {
        setUserDemos(demosData || []);
        setExternalLink(userData?.profileAudioUrl || '');
      })
      .catch(() => { setUserDemos([]); setExternalLink(''); })
      .finally(() => setLoadingDemos(false));
  }, [selectedEntry?.uid]);

  // (Lista unificada y filtrada movida arriba para evitar temporal dead zone)

  // ── Añadir ────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const nameTrimmed = newName.trim();
    const digitsOnly = newPhone.replace(/\D/g, '');
    const emailTrimmed = newEmail.trim();

    if (!nameTrimmed) {
      setFeedback({ type: 'error', message: 'El nombre del alumno es obligatorio.' });
      return;
    }

    if (digitsOnly.length < 8) {
      setFeedback({ type: 'error', message: 'El teléfono debe tener 8 dígitos.' });
      return;
    }

    if (!emailTrimmed) {
      setFeedback({ type: 'error', message: 'El correo del alumno es obligatorio.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setFeedback({ type: 'error', message: 'Ingresa un correo válido.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(`569${digitsOnly}`, nameTrimmed, newCategory, emailTrimmed, newRole);
      setNewPhone('');
      setNewName('');
      setNewEmail('');
      setNewCategory('NONE');
      setNewRole('ALUMNO');
      setFeedback({ type: 'success', message: 'Alumno autorizado correctamente.' });
    } catch (err) {
      console.error('Error al autorizar alumno:', err);
      const errorMsg = err instanceof Error ? err.message : 'No se pudo autorizar el alumno. Verifica si el teléfono o correo ya existen.';
      setFeedback({
        type: 'error',
        message: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edición inline ────────────────────────────────────────────
  const handleStartEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditName(entry.name || '');
    setEditEmail(entry.email || '');
    setEditCategory(entry.category || 'NONE');
    setIsCategoryDropdownOpen(false);
    const digits = (entry.phone || '').replace(/\D/g, '');
    const local = digits.startsWith('56') ? digits.slice(2) : digits;
    const n = local.startsWith('9') ? local.slice(1) : local;
    setEditPhone(n.slice(0, 8));
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const fullPhone = editPhone.length === 8 ? `569${editPhone}` : editingEntry.phone;

    // 1. Actualizar whitelist (nombre, email, phone, categoría)
    onUpdate(editingEntry.phone, {
      name: editName,
      email: editEmail,
      phone: fullPhone,
      category: editCategory,
    });

    // 2. Si el alumno tiene cuenta registrada, actualizar también la tabla users
    if (editingEntry.uid) {
      try {
        await fetchAPI(`/users/${editingEntry.uid}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: editName,
            phone: fullPhone.replace(/\D/g, ''), // solo dígitos
          }),
        });
      } catch (err) {
        console.error('Error al actualizar usuario en BD:', err);
      }
    }

    setEditingEntry(null);
    setIsCategoryDropdownOpen(false);
  };



  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            Gestión de <span className="sud-vibrant-text-gradient uppercase tracking-widest">Alumnos</span>
          </h2>
          <p className="text-slate-400 mt-1 font-medium text-[10px] tracking-widest uppercase">
            Autorización de acceso y gestión de membresías
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Formulario añadir ── */}
        <div className="lg:col-span-4">
          <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Plus className="text-sud-orange" size={20} />
              Añadir Nuevo Alumno
            </h3>
            <form onSubmit={handleAdd} noValidate className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Nombre del Alumno</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className="sud-input w-full" placeholder="Ej: Juan Pérez" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Número Móvil</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-sud-orange/50">
                  <span className="px-3 py-2.5 text-white/40 font-mono text-xs border-r border-white/10 select-none shrink-0">+56 9</span>
                  <input type="tel" placeholder="XXXX XXXX" value={newPhone}
                    onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="bg-transparent px-3 py-2.5 text-white font-mono text-sm outline-none flex-1 tracking-widest" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Categoría del Perfil</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value as ProfileCategory)}
                  className="sud-input w-full appearance-none cursor-pointer">
                  <option value="NONE">Asignar luego</option>
                  <option value="ADULT">Adulto</option>
                  <option value="MINOR">Menor</option>
                  <option value="BOTH">Ambos</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Tipo de Perfil / Rol</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="sud-input w-full appearance-none cursor-pointer">
                  <option value="ALUMNO">Alumno</option>
                  <option value="PROFESOR">Profesor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <p className="text-[8px] text-slate-700 uppercase tracking-widest font-bold px-1">El rol se asignará cuando el usuario se registre</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">
                  Correo
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value.slice(0, 35))}
                    maxLength={35}
                    className="sud-input w-full pr-16"
                    placeholder="alumno@ejemplo.cl"
                    required
                  />
                  {/* Contador de caracteres */}
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black tabular-nums pointer-events-none select-none transition-colors ${
                    newEmail.length >= 35 ? 'text-red-400' : newEmail.length >= 28 ? 'text-sud-yellow' : 'text-slate-600'
                  }`}>
                    {newEmail.length}/35
                  </span>
                  {/* Tooltip aviso límite */}
                </div>
                {newEmail.length >= 35 && (
                  <p className="text-[9px] text-red-400 font-black uppercase tracking-widest px-1">
                    Límite máximo de 35 caracteres alcanzado
                  </p>
                )}
              </div>

              {/* Mensajes de Feedback */}
              {feedback && (
                <div className={`p-4 rounded-2xl border flex items-start gap-2.5 text-[11px] font-bold leading-normal transition-all ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {feedback.type === 'success' ? (
                    <CheckCircle className="shrink-0 mt-0.5" size={16} />
                  ) : (
                    <XCircle className="shrink-0 mt-0.5" size={16} />
                  )}
                  <span className="flex-1 uppercase tracking-wider">{feedback.message}</span>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full sud-btn-primary py-4 text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? 'Autorizando...' : 'Autorizar Alumno'}
              </button>
            </form>
          </section>
        </div>

        {/* ── Tabla ── */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="text-sud-turquoise" size={20} />
                  Autorizaciones registradas
                  <span className="text-slate-500 font-mono text-xs ml-1">({filteredList.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Incluye personas autorizadas a registrarse, aunque aún no tengan cuenta.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sud-turquoise/10 hover:bg-sud-turquoise/20 border border-sud-turquoise/20 text-sud-turquoise font-black text-[10px] uppercase tracking-widest transition-all"
                  title="Importar teléfonos masivamente desde WhatsApp"
                >
                  <MessageSquare size={15} />
                  Importar WhatsApp
                </button>
                <button
                  onClick={() => generateAlumnosPDF(filteredList)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sud-orange/10 hover:bg-sud-orange/20 border border-sud-orange/20 text-sud-orange font-black text-[10px] uppercase tracking-widest transition-all"
                  title="Exportar lista como PDF"
                >
                  <FileDown size={15} />
                  Exportar PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={exportingExcel}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sud-turquoise/10 hover:bg-sud-turquoise/20 border border-sud-turquoise/20 text-sud-turquoise font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Exportar lista como Excel"
                >
                  {exportingExcel ? (
                    <span className="w-3.5 h-3.5 rounded-full border border-sud-turquoise border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <FileDown size={15} className="shrink-0" />
                  )}
                  {exportingExcel ? 'Exportando...' : 'Exportar Excel'}
                </button>
                <div className="relative flex items-center bg-black/40 border border-white/5 rounded-full px-3 py-1.5 focus-within:border-white/20 transition-all">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mr-2 select-none">Ordenar:</span>
                  <select
                    value={getDropdownValue()}
                    onChange={e => handleSortByChange(e.target.value)}
                    className="bg-transparent text-[9px] font-bold text-white outline-none cursor-pointer uppercase tracking-widest pr-4 select-none"
                  >
                    <option value="NAME" className="bg-[#0f0f0f] text-white">Nombre A-Z</option>
                    <option value="PHONE" className="bg-[#0f0f0f] text-white">Teléfono</option>
                    <option value="EMAIL" className="bg-[#0f0f0f] text-white">Correo</option>
                    <option value="STATUS" className="bg-[#0f0f0f] text-white">Estado</option>
                    <option value="MOST_DEMOS" className="bg-[#0f0f0f] text-white">Más demos</option>
                    <option value="FEWEST_DEMOS" className="bg-[#0f0f0f] text-white">Menos demos</option>
                    <option value="CATEGORY" className="bg-[#0f0f0f] text-white">Categoría</option>
                    <option value="ROLE" className="bg-[#0f0f0f] text-white">Rol / Perfil</option>
                  </select>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input placeholder="Buscar alumno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="bg-black/40 border border-white/5 rounded-full py-1.5 pl-9 pr-4 text-[10px] outline-none focus:border-white/20 transition-all font-medium uppercase tracking-widest" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-white/20 bg-white/[0.02] font-black tracking-widest">
                  <tr>
                    {renderHeader('Alumno', 'NAME')}
                    {renderHeader('Teléfono', 'PHONE')}
                    {renderHeader('Correo', 'EMAIL')}
                    {renderHeader('Estado', 'STATUS')}
                    {renderHeader('Demos', 'DEMOS')}
                    {renderHeader('Categoría', 'CATEGORY')}
                    <th className="px-4 py-4 text-right select-none text-white/20">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.map((entry, idx) => {
                    const statusInfo = getStatusInfo(entry);
                    const isEditing = editingEntry?.phone === entry.phone;

                    return (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">

                        {/* Nombre */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                              placeholder="Nombre"
                              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-black text-white uppercase tracking-tight w-full outline-none focus:border-sud-turquoise/50 min-w-[120px]" />
                          ) : (
                            <button
                              onClick={() => {
                                if (!entry.uid) return;
                                // Enriquecer con avatar del usuario registrado
                                const fullUser = users.find(u => u.uid === entry.uid);
                                setSelectedEntry({ ...entry, avatar: fullUser?.avatar || entry.avatar });
                              }}
                              className={`text-sm font-black uppercase tracking-tight text-left transition-colors ${entry.uid
                                  ? 'text-white hover:text-sud-turquoise cursor-pointer'
                                  : 'text-slate-500 cursor-default'
                                }`}
                              title={entry.uid ? 'Ver perfil' : 'Sin cuenta registrada'}
                            >
                              {entry.name || 'Sin Nombre'}
                              {entry.uid && <ChevronRight size={12} className="inline ml-1 opacity-50" />}
                            </button>
                          )}
                        </td>

                        {/* Teléfono */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-sud-turquoise/50 min-w-[160px]">
                              <span className="px-2 py-1.5 text-slate-500 font-mono text-xs border-r border-white/10 select-none shrink-0">+56 9</span>
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                placeholder="XXXX XXXX"
                                maxLength={8}
                                className="bg-transparent px-2 py-1.5 text-white font-mono text-sm outline-none w-full tracking-widest"
                              />
                            </div>
                          ) : (
                            <span className="font-mono text-sm text-slate-400">
                              {formatPhone(entry.phone) ?? <span className="text-slate-600 italic text-xs">Sin teléfono</span>}
                            </span>
                          )}
                        </td>

                        {/* Correo */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="relative group">
                              <input
                                type="email"
                                value={editEmail}
                                onChange={e => setEditEmail(e.target.value.slice(0, 35))}
                                maxLength={35}
                                placeholder="correo@ejemplo.cl"
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-sud-turquoise/50 w-full min-w-[160px] pr-14"
                              />
                              {/* Contador */}
                              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black tabular-nums pointer-events-none select-none transition-colors ${
                                editEmail.length >= 35 ? 'text-red-400' : editEmail.length >= 28 ? 'text-sud-yellow' : 'text-slate-600'
                              }`}>
                                {editEmail.length}/35
                              </span>
                              {/* Tooltip */}
                            </div>
                          ) : (
                            <span className={`text-xs font-bold ${entry.email ? 'text-slate-400' : 'text-slate-600 italic'}`}>
                              {entry.email || '—'}
                            </span>
                          )}
                        </td>

                        {/* Estado + botones de aprobación */}
                        <td className="px-4 py-3">
                          {entry.uid && onUpdateStatus ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {statusInfo && (
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.cls}`}>
                                  <statusInfo.Icon size={9} />
                                  {statusInfo.label}
                                </span>
                              )}
                              {entry.status !== 'APPROVED' && (
                                <button onClick={() => onUpdateStatus(entry.uid!, 'APPROVED')}
                                  className="w-6 h-6 rounded-full bg-sud-turquoise/10 hover:bg-sud-turquoise/30 flex items-center justify-center transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Aprobar perfil">
                                  <CheckCircle size={13} className="text-sud-turquoise" />
                                </button>
                              )}
                              {entry.status !== 'INACTIVE' && (
                                <button onClick={() => onUpdateStatus(entry.uid!, 'INACTIVE')}
                                  className="w-6 h-6 rounded-full bg-red-500/10 hover:bg-red-500/30 flex items-center justify-center transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Desactivar perfil">
                                  <XCircle size={13} className="text-red-400" />
                                </button>
                              )}
                              {entry.status !== 'PENDING' && (
                                <button onClick={() => onUpdateStatus(entry.uid!, 'PENDING')}
                                  className="w-6 h-6 rounded-full bg-sud-yellow/10 hover:bg-sud-yellow/30 flex items-center justify-center transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Volver a revisión">
                                  <Clock size={13} className="text-sud-yellow" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${statusInfo?.cls ?? 'text-slate-600 border-white/10'}`}>
                              {statusInfo ? <><statusInfo.Icon size={9} />{statusInfo.label}</> : '—'}
                            </span>
                          )}
                        </td>

                        {/* Demos */}
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${entry.uid && demoCounts[entry.uid] > 0
                              ? 'text-sud-turquoise border-sud-turquoise/20 bg-sud-turquoise/5 font-black'
                              : 'text-slate-500 border-white/5 bg-white/5'
                            }`}>
                            {entry.uid ? (
                              demoCounts[entry.uid] !== undefined ? (
                                demoCounts[entry.uid] === 0 ? 'Sin demos' :
                                demoCounts[entry.uid] === 1 ? '1 demo' :
                                `${demoCounts[entry.uid]} demos`
                              ) : 'Cargando...'
                            ) : 'Sin demos'}
                          </span>
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                className="flex items-center justify-between gap-1.5 border border-white/20 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-tight outline-none cursor-pointer bg-black/60 hover:bg-black/80 hover:border-sud-turquoise/40 focus:border-sud-turquoise/50 transition-colors w-[110px]"
                              >
                                <span className={
                                  editCategory === 'ADULT' ? 'text-blue-400' :
                                  editCategory === 'MINOR' ? 'text-pink-400' :
                                  editCategory === 'BOTH' ? 'text-purple-400' :
                                  'text-slate-400'
                                }>
                                  {editCategory === 'NONE' ? 'Sin Cat.' :
                                   editCategory === 'ADULT' ? 'Adulto' :
                                   editCategory === 'MINOR' ? 'Menor' :
                                   editCategory === 'BOTH' ? 'Ambos' : 'Sin Cat.'}
                                </span>
                                <span className="text-white/40 text-[7px]">▼</span>
                              </button>

                              {isCategoryDropdownOpen && (
                                <>
                                  {/* Underlay invisible to detect click outside */}
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setIsCategoryDropdownOpen(false)}
                                  />
                                  <div className="absolute left-0 mt-1.5 w-[110px] rounded-lg border border-white/10 bg-[#0f0f0f]/95 backdrop-blur-md shadow-2xl z-20 py-1 overflow-hidden transition-all duration-100 ease-out">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditCategory('NONE');
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 text-[10px] font-black uppercase tracking-tight transition-colors flex items-center justify-between ${
                                        editCategory === 'NONE' 
                                          ? 'bg-white/5 text-slate-200' 
                                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                      }`}
                                    >
                                      Sin Cat.
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditCategory('ADULT');
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 text-[10px] font-black uppercase tracking-tight transition-colors flex items-center justify-between ${
                                        editCategory === 'ADULT' 
                                          ? 'bg-blue-400/10 text-blue-400' 
                                          : 'text-blue-400/80 hover:bg-blue-400/5 hover:text-blue-400'
                                      }`}
                                    >
                                      Adulto
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditCategory('MINOR');
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 text-[10px] font-black uppercase tracking-tight transition-colors flex items-center justify-between ${
                                        editCategory === 'MINOR' 
                                          ? 'bg-pink-400/10 text-pink-400' 
                                          : 'text-pink-400/80 hover:bg-pink-400/5 hover:text-pink-400'
                                      }`}
                                    >
                                      Menor
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditCategory('BOTH');
                                        setIsCategoryDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 text-[10px] font-black uppercase tracking-tight transition-colors flex items-center justify-between ${
                                        editCategory === 'BOTH' 
                                          ? 'bg-purple-400/10 text-purple-400' 
                                          : 'text-purple-400/80 hover:bg-purple-400/5 hover:text-purple-400'
                                      }`}
                                    >
                                      Ambos
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-current/10 ${entry.category === 'ADULT' ? 'text-blue-400 bg-blue-400/5' :
                                entry.category === 'MINOR' ? 'text-pink-400 bg-pink-400/5' :
                                  entry.category === 'BOTH' ? 'text-purple-400 bg-purple-400/5' :
                                    'text-slate-500 opacity-50 bg-white/5'
                              }`}>
                              {getCategoryLabel(entry.category)}
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={handleSaveEdit}
                                  className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors" title="Guardar">
                                  <CheckCircle2 size={18} />
                                </button>
                                <button onClick={() => { setEditingEntry(null); setIsCategoryDropdownOpen(false); }}
                                  className="p-2 text-slate-500 hover:bg-white/5 rounded-lg transition-colors" title="Cancelar">
                                  <LogOut size={18} className="rotate-180" />
                                </button>
                              </>
                            ) : (
                              <>
                                {entry.uid && (
                                  <button onClick={() => {
                                    const fullUser = users.find(u => u.uid === entry.uid);
                                    setSelectedEntry({ ...entry, avatar: fullUser?.avatar || entry.avatar });
                                  }}
                                    className="p-2 text-white/10 hover:text-sud-turquoise hover:bg-sud-turquoise/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 cursor-pointer"
                                    title="Ver perfil">
                                    <User size={18} />
                                  </button>
                                )}
                                <button onClick={() => handleStartEdit(entry)}
                                  className="p-2 text-white/10 hover:text-sud-turquoise hover:bg-sud-turquoise/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100"
                                  title="Editar">
                                  <Settings size={18} />
                                </button>
                                <button onClick={() => setDeletingEntryConfirm(entry)}
                                  className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 cursor-pointer"
                                  title="Eliminar">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel de perfil del alumno ── */}
      {selectedEntry && (
        <>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setSelectedEntry(null)} />
          <div className="fixed inset-y-0 right-0 w-full md:w-[520px] bg-sud-black border-l border-white/10 z-50 flex flex-col h-full max-h-screen overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Perfil del Alumno</h3>
                <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mt-0.5">
                  {selectedEntry.uid ? `ID: ${String(selectedEntry.uid).slice(0, 8)}...` : 'Sin cuenta'}
                </p>
              </div>
              <button onClick={() => setSelectedEntry(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-20 md:pb-24 space-y-6 min-h-0">
              {/* Avatar + info básica */}
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.5rem] bg-sud-gradient p-[1px] shrink-0">
                  <div className="w-full h-full rounded-[1.3rem] bg-black flex items-center justify-center overflow-hidden">
                    {selectedEntry.avatar ? (
                      <img src={selectedEntry.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} className="text-sud-turquoise" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xl font-black text-white uppercase tracking-tight">{selectedEntry.name || 'Sin nombre'}</p>
                  {(() => {
                    const si = getStatusInfo(selectedEntry);
                    return si ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <si.Icon size={11} className={si.cls.split(' ')[0]} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${si.cls.split(' ')[0]}`}>{si.label}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Datos de contacto */}
              <div className="space-y-3">
                {selectedEntry.email && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Mail size={14} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Correo</p>
                      <p className="text-sm text-slate-300">{selectedEntry.email}</p>
                    </div>
                  </div>
                )}
                {selectedEntry.phone && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Phone size={14} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Teléfono</p>
                      <p className="text-sm text-slate-300 font-mono">{formatPhone(selectedEntry.phone)}</p>
                    </div>
                  </div>
                )}
                {selectedEntry.addedAt && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                    <Calendar size={14} className="text-sud-turquoise shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Registrado</p>
                      <p className="text-sm text-slate-300">
                        {new Date(selectedEntry.addedAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
                {/* Enlace externo (Drive, etc.) */}
                {(() => {
                  const fullUser = users.find(u => u.uid === selectedEntry.uid);
                  const link = (fullUser as any)?.profileAudioUrl;
                  if (!link) return null;
                  return (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-sud-turquoise/5 rounded-xl border border-sud-turquoise/20 hover:bg-sud-turquoise/10 transition-all group"
                    >
                      <FileText size={14} className="text-sud-turquoise shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Carpeta externa</p>
                        <p className="text-xs text-sud-turquoise truncate group-hover:underline">{link}</p>
                      </div>
                    </a>
                  );
                })()}
              </div>

              {/* Cambiar estado */}
              {selectedEntry.uid && onUpdateStatus && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest">Estado del perfil</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedEntry.status !== 'APPROVED' && (
                      <button onClick={() => { onUpdateStatus(selectedEntry.uid, 'APPROVED'); setSelectedEntry({ ...selectedEntry, status: 'APPROVED' }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-sud-turquoise/10 hover:bg-sud-turquoise/20 border border-sud-turquoise/20 text-sud-turquoise font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        <CheckCircle size={13} /> Aprobar
                      </button>
                    )}
                    {selectedEntry.status !== 'INACTIVE' && (
                      <button onClick={() => { onUpdateStatus(selectedEntry.uid, 'INACTIVE'); setSelectedEntry({ ...selectedEntry, status: 'INACTIVE' }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        <XCircle size={13} /> Desactivar
                      </button>
                    )}
                    {selectedEntry.status !== 'PENDING' && (
                      <button onClick={() => { onUpdateStatus(selectedEntry.uid, 'PENDING'); setSelectedEntry({ ...selectedEntry, status: 'PENDING' }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-sud-yellow/10 hover:bg-sud-yellow/20 border border-sud-yellow/20 text-sud-yellow font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        <Clock size={13} /> En revisión
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cursos Asignados */}
              {selectedEntry.uid && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest flex items-center gap-2">
                      <BookOpen size={13} className="text-sud-orange" /> Cursos Asignados
                    </p>
                    {!editingCursos && (
                      <button
                        onClick={startEditCursos}
                        className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-sud-turquoise transition-colors flex items-center gap-1"
                      >
                        <Settings size={11} /> Editar
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded-2xl p-4 bg-white/[0.01] space-y-2.5">
                    {allCursos.map(curso => {
                      const alumnoId = String(selectedEntry?.uid || '');
                      const isEnrolled = editingCursos
                        ? pendingCursoIds.has(curso.id)
                        : curso.alumnos?.some((a: any) => String(a.id || a.alumnoId) === alumnoId);
                      return (
                        <label
                          key={curso.id}
                          className={`flex items-start gap-3 text-xs font-bold select-none py-0.5 ${editingCursos ? 'cursor-pointer text-slate-300 hover:text-white' : 'cursor-default text-slate-400'}`}
                        >
                          <input
                            type="checkbox"
                            checked={!!isEnrolled}
                            disabled={!editingCursos}
                            onChange={editingCursos ? (e) => {
                              setPendingCursoIds(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(curso.id);
                                else next.delete(curso.id);
                                return next;
                              });
                            } : undefined}
                            className="w-4 h-4 rounded border-white/10 bg-black text-sud-turquoise focus:ring-0 accent-sud-turquoise shrink-0 mt-0.5 disabled:opacity-50"
                          />
                          <span className="leading-snug">{curso.titulo} ({curso.modalidad})</span>
                        </label>
                      );
                    })}
                  </div>
                  {/* Botones Aceptar / Cancelar */}
                  {editingCursos && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={cancelEditCursos}
                        disabled={savingCursos}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all disabled:opacity-40"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveEditCursos}
                        disabled={savingCursos}
                        className="flex-1 py-2.5 rounded-xl border border-sud-turquoise/30 bg-sud-turquoise/10 hover:bg-sud-turquoise/20 text-[10px] font-black uppercase tracking-widest text-sud-turquoise transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {savingCursos
                          ? <><div className="w-3 h-3 border-2 border-sud-turquoise/30 border-t-sud-turquoise rounded-full animate-spin" /> Guardando...</>
                          : <><CheckCircle size={12} /> Aceptar</>}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Demos */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest flex items-center gap-2">
                  <AudioLines size={13} className="text-sud-orange" /> Demos
                  {!loadingDemos && <span className="text-slate-700 font-mono">({userDemos.filter(d => d.category === 'demo').length})</span>}
                </p>

                {loadingDemos ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-sud-orange/30 border-t-sud-orange rounded-full animate-spin" />
                  </div>
                ) : userDemos.filter(d => d.category === 'demo').length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-white/5 rounded-2xl">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Sin demos subidas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userDemos.filter(d => d.category === 'demo').map(demo => (
                      <div key={demo.id} className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-white uppercase tracking-tight truncate">{demo.title}</p>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${(demo.mediaType || '').toLowerCase().includes('video')
                              ? 'bg-sud-turquoise/10 text-sud-turquoise'
                              : 'bg-sud-orange/10 text-sud-orange'
                            }`}>
                            {(demo.mediaType || '').toLowerCase().includes('video') ? 'Video' : 'Audio'}
                          </span>
                        </div>
                        {!(demo.mediaType || '').toLowerCase().includes('video') && (
                          <AudioPlayer src={demo.fileUrl} showVolume />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enlace externo (Drive, YouTube, etc.) */}
              {externalLink && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest flex items-center gap-2">
                    <FileText size={13} className="text-sud-turquoise" /> Carpeta externa
                  </p>
                  <a
                    href={externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-sud-turquoise/5 rounded-2xl border border-sud-turquoise/20 hover:bg-sud-turquoise/10 transition-all group"
                  >
                    <FileText size={14} className="text-sud-turquoise shrink-0" />
                    <p className="text-xs text-sud-turquoise truncate group-hover:underline">{externalLink}</p>
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modal de Confirmación de Eliminación ── */}
      {deletingEntryConfirm && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !isDeletingUser && setDeletingEntryConfirm(null)}>
            <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                  <Trash2 size={16} /> Confirmar eliminación
                </h3>
                <button 
                  onClick={() => !isDeletingUser && setDeletingEntryConfirm(null)}
                  disabled={isDeletingUser}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <X size={14} className="text-white/60" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm font-black uppercase tracking-tight text-white leading-normal">
                  ¿Estás seguro de que quieres eliminar a <span className="text-red-400">{deletingEntryConfirm.name || 'este alumno'}</span>?
                </p>
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider text-justify">
                  Esta acción eliminará el usuario de la base de datos. Si solo quieres impedir el acceso, usa Desactivar.
                </p>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={() => setDeletingEntryConfirm(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={handleExecuteDelete}
                  className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 hover:border-red-500/50 text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingUser ? 'Eliminando...' : 'Eliminar usuario'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Toast de Feedback Visual ── */}
      {toast && (
        <div className={`fixed top-24 right-6 z-[9999] p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="shrink-0 text-emerald-400" size={16} />
          ) : (
            <XCircle className="shrink-0 text-red-400" size={16} />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 transition-opacity cursor-pointer">
            <X size={14} className="text-white/40" />
          </button>
        </div>
      )}

      {/* ── Modal de Importación desde WhatsApp ── */}
      {showImportModal && createPortal(
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150]" onClick={() => !importing && setShowImportModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4 md:p-6 z-[160] pointer-events-none">
            <div className="bg-[#121212]/95 border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-6rem)] flex flex-col overflow-hidden pointer-events-auto shadow-2xl glassmorphism">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <MessageSquare className="text-sud-turquoise" size={20} />
                    Importar desde WhatsApp
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
                    Carga masiva de teléfonos a la whitelist
                  </p>
                </div>
                <button 
                  disabled={importing}
                  onClick={() => setShowImportModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {importStep === 'INPUT' && (
                  <div className="space-y-6">

                    {/* ── Sección: Importar desde imagen ── */}
                    <div className="border border-white/10 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border-b border-white/10">
                        <ImagePlus size={15} className="text-sud-turquoise shrink-0" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Importar desde imagen <span className="text-slate-600 font-medium normal-case tracking-normal">(opcional)</span></p>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Aviso de privacidad */}
                        <div className="flex items-start gap-2 text-[10px] text-slate-500 font-medium">
                          <AlertTriangle size={12} className="text-sud-yellow shrink-0 mt-0.5" />
                          <span>La imagen se procesa con IA externa. Sube solo capturas autorizadas para gestión interna.</span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Recomendado: captura clara de WhatsApp Web, buen zoom, números visibles. La detección puede fallar si la imagen está borrosa o muy comprimida.
                        </p>

                        {/* Zona de subida */}
                        {!imageFile ? (
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-sud-turquoise/30 hover:bg-sud-turquoise/5 transition-all text-slate-500 hover:text-sud-turquoise cursor-pointer"
                          >
                            <ImagePlus size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Subir captura</span>
                            <span className="text-[9px] text-slate-700 font-medium">PNG · JPG · WEBP · máx 5 MB</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-4">
                            <img
                              src={imagePreviewUrl!}
                              alt="Captura seleccionada"
                              className="w-20 h-20 object-cover rounded-xl border border-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white font-bold truncate">{imageFile.name}</p>
                              <p className="text-[10px] text-slate-500">{(imageFile.size / 1024).toFixed(0)} KB</p>
                              <button
                                type="button"
                                onClick={() => { setImageFile(null); setImagePreviewUrl(null); setImageError(null); setImageSuccess(false); if (imageInputRef.current) imageInputRef.current.value = ''; }}
                                className="mt-1 text-[9px] text-red-400 hover:text-red-300 uppercase tracking-widest font-bold transition-colors"
                              >
                                Quitar imagen
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleExtractFromImage}
                              disabled={extractingImage}
                              className="flex items-center gap-2 px-4 py-2.5 bg-sud-turquoise hover:bg-sud-turquoise/80 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                              {extractingImage
                                ? <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                : <ImagePlus size={14} />}
                              {extractingImage ? 'Extrayendo...' : 'Extraer desde imagen'}
                            </button>
                          </div>
                        )}

                        {/* Feedback imagen */}
                        {imageError && (
                          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-red-400 font-bold">{imageError}</span>
                          </div>
                        )}
                        {imageSuccess && (
                          <div className="flex items-center gap-2 p-3 bg-sud-turquoise/10 border border-sud-turquoise/20 rounded-xl">
                            <CheckCircle size={13} className="text-sud-turquoise shrink-0" />
                            <span className="text-xs text-sud-turquoise font-bold">Contactos extraídos y añadidos al texto. Revisa el área de texto y luego haz clic en Analizar.</span>
                          </div>
                        )}

                        {/* Input file oculto */}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* ── Sección: Texto manual ── */}
                    <div className="space-y-3">
                      <p className="text-sm text-slate-300">
                        Pega la lista de contactos o texto copiado de WhatsApp. Nuestro analizador detectará automáticamente los números de teléfono chilenos y extraerá los nombres disponibles.
                      </p>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ejemplo de formatos soportados:</h4>
                        <pre className="text-xs font-mono text-slate-500 space-y-1">
                          {`+56 9 1234 5678 Juan Pérez\n987654321 - María José\n[10:30 AM] +56999998888: Hola\n+56911112222`}
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-widest">Texto de WhatsApp</label>
                        <textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          placeholder="Pega el texto aquí o usa la extracción desde imagen de arriba..."
                          className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-sud-turquoise/50 resize-none font-mono"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider">
                        {errorMsg}
                      </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowImportModal(false)}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        disabled={analyzing || !importText.trim()}
                        className="px-6 py-3 bg-sud-turquoise hover:bg-sud-turquoise/80 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {analyzing && <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                        Analizar
                      </button>
                    </div>
                  </div>
                )}

                {importStep === 'PREVIEW' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Resultado del Análisis</h4>
                        <p className="text-xs text-slate-400">Revisa la lista, edita los nombres y desmarca los que no deseas importar.</p>
                      </div>
                      <div className="flex gap-2 flex-wrap text-[10px] font-black uppercase tracking-wider font-mono">
                        <span className="px-2 py-1 rounded bg-sud-turquoise/10 border border-sud-turquoise/20 text-sud-turquoise">
                          Listos: {candidates.filter(c => c.status === 'VALID').length}
                        </span>
                        <span className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                          Duplicados: {candidates.filter(c => c.status === 'DUPLICATE').length}
                        </span>
                        <span className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                          Existentes: {candidates.filter(c => c.status === 'ALREADY_EXISTS').length}
                        </span>
                        <span className="px-2 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400">
                          Inválidos: {candidates.filter(c => c.status === 'INVALID').length}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-white/10 rounded-2xl max-h-96">
                      <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead className="text-[10px] uppercase text-white/40 bg-white/5 font-black tracking-widest sticky top-0">
                          <tr>
                            <th className="px-4 py-3 border-b border-white/10 w-12 text-center">
                              <input
                                type="checkbox"
                                checked={selectedCandidateIndices.length === candidates.filter(c => c.status === 'VALID').length && selectedCandidateIndices.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCandidateIndices(
                                      candidates
                                        .map((c, i) => c.status === 'VALID' ? i : -1)
                                        .filter(idx => idx !== -1)
                                    );
                                  } else {
                                    setSelectedCandidateIndices([]);
                                  }
                                }}
                                className="rounded border-white/10 bg-black/40 text-sud-turquoise focus:ring-0 cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-3 border-b border-white/10">Nombre de Contacto (Editable)</th>
                            <th className="px-4 py-3 border-b border-white/10 font-mono">Teléfono Original</th>
                            <th className="px-4 py-3 border-b border-white/10 font-mono">Normalizado</th>
                            <th className="px-4 py-3 border-b border-white/10">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-black/20">
                          {candidates.map((c, idx) => {
                            const isSelected = selectedCandidateIndices.includes(idx);
                            const isEditable = c.status === 'VALID' || c.status === 'DUPLICATE';
                            
                            let statusBadgeClass = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
                            let statusText = 'Inválido';
                            if (c.status === 'VALID') {
                              statusBadgeClass = 'text-sud-turquoise bg-sud-turquoise/10 border-sud-turquoise/20';
                              statusText = 'Listo';
                            } else if (c.status === 'ALREADY_EXISTS') {
                              statusBadgeClass = 'text-red-400 bg-red-500/10 border-red-500/20';
                              statusText = 'Ya existe';
                            } else if (c.status === 'DUPLICATE') {
                              statusBadgeClass = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
                              statusText = 'Duplicado';
                            }

                            return (
                              <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${!isSelected && c.status === 'VALID' ? 'opacity-60' : ''}`}>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={c.status === 'INVALID' || c.status === 'ALREADY_EXISTS'}
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCandidateIndices(prev => [...prev, idx]);
                                      } else {
                                        setSelectedCandidateIndices(prev => prev.filter(i => i !== idx));
                                      }
                                    }}
                                    className="rounded border-white/10 bg-black/40 text-sud-turquoise focus:ring-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  {isEditable ? (
                                    <input
                                      type="text"
                                      value={c.name}
                                      onChange={(e) => handleEditCandidateName(idx, e.target.value)}
                                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white uppercase tracking-tight w-full outline-none focus:border-sud-turquoise/30"
                                    />
                                  ) : (
                                    <span className="text-xs text-slate-500 italic uppercase">
                                      {c.name || 'Sin nombre'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs font-mono text-slate-400">
                                  {c.rawPhone || '—'}
                                </td>
                                <td className="px-4 py-3 text-xs font-mono text-white">
                                  {c.normalizedPhone ? formatPhone(c.normalizedPhone) : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    title={c.validationMessage}
                                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
                                  >
                                    {statusText}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider">
                        {errorMsg}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <button
                        type="button"
                        disabled={importing}
                        onClick={() => setImportStep('INPUT')}
                        className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Volver a pegar
                      </button>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={importing}
                          onClick={() => setShowImportModal(false)}
                          className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmImport}
                          disabled={importing || selectedCandidateIndices.length === 0}
                          className="px-6 py-3 bg-sud-turquoise hover:bg-sud-turquoise/80 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {importing && <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                          Importar Seleccionados ({selectedCandidateIndices.length})
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {importStep === 'SUMMARY' && summary && (
                  <div className="text-center py-6 space-y-6 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-sud-turquoise/10 border border-sud-turquoise/20 rounded-full flex items-center justify-center mx-auto text-sud-turquoise">
                      <CheckCircle2 size={36} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-white uppercase tracking-tight">¡Importación Exitosa!</h4>
                      <p className="text-xs text-slate-400">Los números telefónicos han sido autorizados en la lista blanca de SudTalent.</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 divide-y divide-white/5 text-left text-xs font-medium uppercase tracking-wider">
                      <div className="flex justify-between py-2.5">
                        <span className="text-slate-400">Teléfonos Agregados:</span>
                        <span className="font-mono text-sud-turquoise font-black">{summary.agregados}</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-slate-400">Omitidos por duplicados:</span>
                        <span className="font-mono text-slate-400">{summary.omitidosDuplicados}</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-slate-400">Ya existentes en Whitelist:</span>
                        <span className="font-mono text-slate-400">{summary.yaExistentes}</span>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <span className="text-slate-400">Omitidos por inválidos:</span>
                        <span className="font-mono text-slate-400">{summary.invalidos}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseSummary}
                      className="w-full py-4 bg-sud-turquoise hover:bg-sud-turquoise/80 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Entendido
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
