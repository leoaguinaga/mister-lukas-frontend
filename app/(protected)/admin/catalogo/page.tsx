'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PlatoCarta, TipoPlato, CategoriaInventario } from '@/lib/types';
import { Button } from '@/components/ui/button';

// ─── Etiquetas y orden ────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoPlato, string> = {
  entradas:             'Entradas',
  platos_a_la_carta:    'Platos a la carta',
  parrillas:            'Parrillas',
  parrillas_familiares: 'Parrillas Familiares',
  pastas:               'Pastas',
  guarniciones:         'Guarniciones',
  refresco:             'Refrescos',
  bebida:               'Bebidas',
  coctel:               'Cócteles',
};

// Sub-tipos disponibles por categoría de inventario
const TIPOS_POR_CATEGORIA: Record<CategoriaInventario, TipoPlato[]> = {
  multi_insumo: ['entradas', 'platos_a_la_carta', 'parrillas', 'parrillas_familiares', 'pastas', 'guarniciones'],
  reventa:      ['refresco', 'bebida', 'coctel'],
  fraccionable: [],
};

// Orden de secciones en la vista
const SECCIONES_CARTA: Array<{ label: string; filter: (p: PlatoCarta) => boolean }> = [
  { label: 'Entradas',            filter: (p) => p.categoriaInventario === 'multi_insumo' && p.tipoPlato === 'entradas' },
  { label: 'Platos a la carta',   filter: (p) => p.categoriaInventario === 'multi_insumo' && p.tipoPlato === 'platos_a_la_carta' },
  { label: 'Parrillas',           filter: (p) => p.categoriaInventario === 'multi_insumo' && p.tipoPlato === 'parrillas' },
  { label: 'Parrillas Familiares',filter: (p) => p.categoriaInventario === 'multi_insumo' && p.tipoPlato === 'parrillas_familiares' },
  { label: 'Pastas',              filter: (p) => p.categoriaInventario === 'multi_insumo' && p.tipoPlato === 'pastas' },
  { label: 'Guarniciones',        filter: (p) => p.categoriaInventario === 'multi_insumo' && p.tipoPlato === 'guarniciones' },
  { label: 'Sin categoría',       filter: (p) => p.categoriaInventario === 'multi_insumo' && !p.tipoPlato },
  { label: 'Pollo a la brasa',    filter: (p) => p.categoriaInventario === 'fraccionable' },
  { label: 'Refrescos',           filter: (p) => p.categoriaInventario === 'reventa' && p.tipoPlato === 'refresco' },
  { label: 'Bebidas',             filter: (p) => p.categoriaInventario === 'reventa' && p.tipoPlato === 'bebida' },
  { label: 'Cócteles',            filter: (p) => p.categoriaInventario === 'reventa' && p.tipoPlato === 'coctel' },
  { label: 'Bebidas sin tipo',    filter: (p) => p.categoriaInventario === 'reventa' && !p.tipoPlato },
];

// ─── Tipos internos ───────────────────────────────────────────────────────────

type FormState = {
  nombre: string;
  precio: string;
  categoriaInventario: CategoriaInventario;
  tipoPlato: TipoPlato | null;
};

const FORM_VACIO: FormState = {
  nombre: '',
  precio: '',
  categoriaInventario: 'multi_insumo',
  tipoPlato: 'platos_a_la_carta',
};

function defaultTipoPlato(cat: CategoriaInventario): TipoPlato | null {
  const tipos = TIPOS_POR_CATEGORIA[cat];
  return tipos.length > 0 ? tipos[0] : null;
}

// ─── Modal de edición ─────────────────────────────────────────────────────────

function EditModal({ plato, onClose, onSaved }: {
  plato: PlatoCarta;
  onClose: () => void;
  onSaved: (p: PlatoCarta) => void;
}) {
  const [form, setForm] = useState<FormState>({
    nombre:              plato.nombre,
    precio:              plato.precio,
    categoriaInventario: plato.categoriaInventario,
    tipoPlato:           plato.tipoPlato,
  });
  const [guardando, setGuardando] = useState(false);

  function handleCatChange(cat: CategoriaInventario) {
    setForm((prev) => ({
      ...prev,
      categoriaInventario: cat,
      tipoPlato: defaultTipoPlato(cat),
    }));
  }

  async function handleGuardar() {
    if (!form.nombre || !form.precio) { toast.error('Completa nombre y precio'); return; }
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio <= 0) { toast.error('Precio inválido'); return; }

    const tiposValidos = TIPOS_POR_CATEGORIA[form.categoriaInventario];
    const tipoPlato = tiposValidos.length > 0 ? form.tipoPlato : null;

    setGuardando(true);
    try {
      await api.admin.editarPlato(plato.id, {
        nombre:              form.nombre,
        precio:              precio.toFixed(2),
        categoriaInventario: form.categoriaInventario,
        tipoPlato,
      });
      onSaved({
        ...plato,
        nombre:              form.nombre,
        precio:              precio.toFixed(2),
        categoriaInventario: form.categoriaInventario,
        tipoPlato,
      });
      toast.success(`"${form.nombre}" actualizado`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  const tiposDisponibles = TIPOS_POR_CATEGORIA[form.categoriaInventario];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--carbon)]">Editar plato</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-[var(--carbon)] text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Precio (S/)</label>
            <input
              type="number" min="0" step="0.50"
              value={form.precio}
              onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tipo</label>
            <select
              value={form.categoriaInventario}
              onChange={(e) => handleCatChange(e.target.value as CategoriaInventario)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
            >
              <option value="multi_insumo">Plato (carta)</option>
              <option value="fraccionable">Pollo a la brasa</option>
              <option value="reventa">Bebida</option>
            </select>
          </div>
          {tiposDisponibles.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Categoría</label>
              <select
                value={form.tipoPlato ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, tipoPlato: e.target.value as TipoPlato }))}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
              >
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <Button
            className="flex-1 h-10 bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminCatalogoPage() {
  const [platos, setPlatos]       = useState<PlatoCarta[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [editando, setEditando]   = useState<PlatoCarta | null>(null);
  const [form, setForm]           = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const fetchPlatos = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/platos`, { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setPlatos(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    fetchPlatos();
    const id = setInterval(fetchPlatos, 20000);
    return () => clearInterval(id);
  }, [fetchPlatos]);

  async function handleToggleDisponible(plato: PlatoCarta) {
    setToggling(plato.id + '_disp');
    try {
      await api.menu.toggleDisponible(plato.id, !plato.disponible);
      setPlatos((prev) => prev.map((p) => p.id === plato.id ? { ...p, disponible: !p.disponible } : p));
      toast.success(!plato.disponible ? `"${plato.nombre}" disponible` : `"${plato.nombre}" sin stock`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setToggling(null); }
  }

  async function handleToggleActivo(plato: PlatoCarta) {
    setToggling(plato.id + '_activo');
    const nuevoActivo = !plato.activo;
    try {
      await api.admin.toggleActivoPlato(plato.id, nuevoActivo);
      setPlatos((prev) => prev.map((p) => p.id === plato.id ? { ...p, activo: nuevoActivo } : p));
      toast.success(nuevoActivo ? `"${plato.nombre}" activado en carta` : `"${plato.nombre}" retirado de carta`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setToggling(null); }
  }

  async function handleCrearPlato() {
    if (!form.nombre || !form.precio) { toast.error('Completa nombre y precio'); return; }
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio <= 0) { toast.error('Precio inválido'); return; }

    const tiposValidos = TIPOS_POR_CATEGORIA[form.categoriaInventario];
    const tipoPlato = tiposValidos.length > 0 ? form.tipoPlato : undefined;

    setGuardando(true);
    try {
      await api.admin.crearPlato({
        nombre:              form.nombre,
        precio:              precio.toFixed(2),
        categoriaInventario: form.categoriaInventario,
        ...(tipoPlato ? { tipoPlato } : {}),
      });
      toast.success(`"${form.nombre}" agregado a la carta`);
      setForm(FORM_VACIO);
      fetchPlatos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setGuardando(false); }
  }

  function handleFormCatChange(cat: CategoriaInventario) {
    setForm((prev) => ({
      ...prev,
      categoriaInventario: cat,
      tipoPlato: defaultTipoPlato(cat),
    }));
  }

  const PlatoRow = ({ plato }: { plato: PlatoCarta }) => (
    <div className={['flex items-center gap-2 px-4 py-3', !plato.activo ? 'opacity-50' : ''].join(' ')}>
      <div className="flex-1 min-w-0">
        <p className={['font-medium truncate', !plato.disponible ? 'text-muted-foreground line-through' : 'text-[var(--carbon)]'].join(' ')}>
          {plato.nombre}
        </p>
        <p className="text-sm text-muted-foreground">S/{plato.precio}</p>
      </div>

      <button
        onClick={() => setEditando(plato)}
        title="Editar"
        className="shrink-0 text-muted-foreground hover:text-[var(--carbon)] px-2 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
      >
        ✎
      </button>

      <button
        onClick={() => handleToggleDisponible(plato)}
        disabled={toggling === plato.id + '_disp' || !plato.activo}
        className={['shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-40',
          plato.disponible ? 'bg-[var(--salvia)]/15 text-[var(--salvia)] hover:bg-[var(--salvia)]/25'
                           : 'bg-[var(--terracota)]/15 text-[var(--terracota)] hover:bg-[var(--terracota)]/25',
        ].join(' ')}
      >
        {toggling === plato.id + '_disp' ? '…' : plato.disponible ? 'Hay' : 'No hay'}
      </button>

      <button
        onClick={() => handleToggleActivo(plato)}
        disabled={toggling === plato.id + '_activo'}
        title={plato.activo ? 'Retirar de carta' : 'Volver a carta'}
        className="shrink-0 text-xs text-muted-foreground hover:text-[var(--carbon)] px-2 py-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
      >
        {toggling === plato.id + '_activo' ? '…' : plato.activo ? 'En carta' : 'Retirado'}
      </button>
    </div>
  );

  const sinStock = platos.filter((p) => p.activo && !p.disponible).length;
  const tiposFormDisponibles = TIPOS_POR_CATEGORIA[form.categoriaInventario];

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando carta…</div>;

  return (
    <>
      {editando && (
        <EditModal
          plato={editando}
          onClose={() => setEditando(null)}
          onSaved={(updated) => {
            setPlatos((prev) => prev.map((p) => p.id === updated.id ? updated : p));
            setEditando(null);
          }}
        />
      )}

      <div className="p-5 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-[var(--carbon)]">Carta</h2>
          {sinStock > 0 && <span className="text-xs font-medium text-[var(--terracota)]">{sinStock} sin stock</span>}
        </div>

        {SECCIONES_CARTA.map(({ label, filter }) => {
          const items = platos.filter(filter);
          if (!items.length) return null;
          return (
            <section key={label}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{label}</h3>
              <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
                {items.map((p) => <PlatoRow key={p.id} plato={p} />)}
              </div>
            </section>
          );
        })}

        {/* Nuevo plato */}
        <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-[var(--carbon)]">Nuevo plato</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Nombre</label>
              <input
                type="text" placeholder="Ej: Lomo saltado"
                value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Precio (S/)</label>
              <input
                type="number" min="0" step="0.50" placeholder="0.00"
                value={form.precio} onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select
                value={form.categoriaInventario}
                onChange={(e) => handleFormCatChange(e.target.value as CategoriaInventario)}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
              >
                <option value="multi_insumo">Plato (carta)</option>
                <option value="fraccionable">Pollo a la brasa</option>
                <option value="reventa">Bebida</option>
              </select>
            </div>
            {tiposFormDisponibles.length > 0 && (
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">Categoría</label>
                <select
                  value={form.tipoPlato ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, tipoPlato: e.target.value as TipoPlato }))}
                  className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
                >
                  {tiposFormDisponibles.map((t) => (
                    <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <Button
            className="w-full bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
            onClick={handleCrearPlato} disabled={guardando || !form.nombre || !form.precio}
          >
            {guardando ? 'Agregando…' : 'Agregar a la carta'}
          </Button>
        </div>
      </div>
    </>
  );
}
