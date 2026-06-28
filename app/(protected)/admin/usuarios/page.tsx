'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, UsuarioAdmin } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const ROL_LABEL: Record<string, string> = {
  administracion: 'Admin',
  cajero: 'Cajero',
  mesero: 'Mesero',
};

const ROL_COLOR: Record<string, string> = {
  administracion: 'bg-[var(--dorado)]/15 text-[var(--dorado)]',
  cajero:         'bg-blue-50 text-blue-600',
  mesero:         'bg-[var(--salvia)]/15 text-[var(--salvia)]',
};

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'mesero' });
  const [guardando, setGuardando] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    try {
      const data = await api.admin.listUsuarios();
      setUsuarios(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  async function handleCrear() {
    if (!form.name || !form.email || !form.password) { toast.error('Completa todos los campos'); return; }
    setGuardando(true);
    try {
      await api.admin.crearUsuario(form);
      toast.success(`${form.name} creado`);
      setForm({ name: '', email: '', password: '', role: 'mesero' });
      setFormAbierto(false);
      fetchUsuarios();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setGuardando(false); }
  }

  async function handleToggleActivo(u: UsuarioAdmin) {
    setToggling(u.id);
    try {
      await api.admin.updateUsuario(u.id, { activo: !u.activo });
      setUsuarios((prev) => prev.map((x) => x.id === u.id ? { ...x, activo: !x.activo } : x));
      toast.success(u.activo ? `${u.name} desactivado` : `${u.name} activado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setToggling(null); }
  }

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-5 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--carbon)]">Staff</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{usuarios.length} usuarios</p>
        </div>
        <Button
          onClick={() => setFormAbierto((v) => !v)}
          className="bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
        >
          <Plus size={15} className="mr-1" /> {formAbierto ? 'Cerrar' : 'Nuevo usuario'}
        </Button>
      </div>

      {/* Formulario nuevo usuario (colapsable) */}
      {formAbierto && (
        <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nombre</label>
              <input
                type="text" placeholder="Ana García" autoFocus
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Rol</label>
              <select
                value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
              >
                <option value="mesero">Mesero</option>
                <option value="cajero">Cajero</option>
                <option value="administracion">Administración</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                type="email" placeholder="ana@misterluka.local"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Contraseña</label>
              <input
                type="password" placeholder="mínimo 8 caracteres"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
          </div>
          <Button
            className="w-full bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
            onClick={handleCrear} disabled={guardando}
          >
            {guardando ? 'Creando…' : 'Crear usuario'}
          </Button>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={['font-medium', !u.activo ? 'text-muted-foreground line-through' : 'text-[var(--carbon)]'].join(' ')}>
                  {u.name}
                </p>
                <span className={['text-xs font-medium px-2 py-0.5 rounded-full', ROL_COLOR[u.role] ?? 'bg-muted text-muted-foreground'].join(' ')}>
                  {ROL_LABEL[u.role] ?? u.role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <button
              onClick={() => handleToggleActivo(u)}
              disabled={toggling === u.id}
              className={[
                'ml-4 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50',
                u.activo
                  ? 'bg-[var(--salvia)]/15 text-[var(--salvia)] hover:bg-[var(--salvia)]/25'
                  : 'bg-[var(--terracota)]/15 text-[var(--terracota)] hover:bg-[var(--terracota)]/25',
              ].join(' ')}
            >
              {toggling === u.id ? '…' : u.activo ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
