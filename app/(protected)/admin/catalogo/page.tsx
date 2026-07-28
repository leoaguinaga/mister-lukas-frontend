'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PlatoCarta, CategoriaCarta } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, Search, Trash2 } from 'lucide-react';

type FormState = {
  nombre: string;
  precio: string;
  categoriaId: string;
};

// ─── Modal de edición ─────────────────────────────────────────────────────────

function EditModal({ plato, categorias, onClose, onSaved }: {
  plato: PlatoCarta;
  categorias: CategoriaCarta[];
  onClose: () => void;
  onSaved: (p: PlatoCarta) => void;
}) {
  const [form, setForm] = useState<FormState>({
    nombre:              plato.nombre,
    precio:              plato.precio,
    categoriaId:         plato.categoriaId || plato.categoria?.id || (categorias[0]?.id ?? ''),
  });
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    if (!form.nombre || !form.precio || !form.categoriaId) { toast.error('Completa nombre, precio y categoría'); return; }
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio <= 0) { toast.error('Precio inválido'); return; }

    setGuardando(true);
    try {
      const updated = await api.admin.editarPlato(plato.id, {
        nombre:              form.nombre,
        precio:              precio.toFixed(2),
        categoriaId:         form.categoriaId,
      });
      onSaved({
        ...plato,
        ...updated,
        stockActual:        plato.stockActual,
        nombreUnidadMinima: plato.nombreUnidadMinima,
      });
      toast.success(`"${form.nombre}" actualizado`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

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
            <label className="text-xs text-muted-foreground">Categoría</label>
            <select
              value={form.categoriaId}
              onChange={(e) => setForm((p) => ({ ...p, categoriaId: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
            >
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>
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

function BulkModal({
  categorias,
  onClose,
  onSaved,
}: {
  categorias: CategoriaCarta[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoriaId, setCategoriaId] = useState<string>(categorias[0]?.id ?? '');
  const [filas, setFilas] = useState<Array<{ tempId: number; nombre: string; precio: string; descripcion: string }>>([
    { tempId: 1, nombre: '', precio: '', descripcion: '' },
  ]);
  const [guardando, setGuardando] = useState(false);
  const [nextTempId, setNextTempId] = useState(2);

  function agregarFila() {
    setFilas((prev) => [...prev, { tempId: nextTempId, nombre: '', precio: '', descripcion: '' }]);
    setNextTempId((id) => id + 1);
  }

  function quitarFila(tempId: number) {
    if (filas.length === 1) {
      setFilas([{ tempId: nextTempId, nombre: '', precio: '', descripcion: '' }]);
      setNextTempId((id) => id + 1);
      return;
    }
    setFilas((prev) => prev.filter((f) => f.tempId !== tempId));
  }

  function updateFila(tempId: number, field: 'nombre' | 'precio' | 'descripcion', val: string) {
    setFilas((prev) => prev.map((f) => f.tempId === tempId ? { ...f, [field]: val } : f));
  }

  async function handleGuardar() {
    const filasValidas = filas.filter((f) => f.nombre.trim() !== '' && f.precio.trim() !== '');
    if (filasValidas.length === 0) {
      toast.error('Añade al menos un plato con nombre y precio');
      return;
    }
    if (!categoriaId) {
      toast.error('Selecciona una categoría para el lote');
      return;
    }

    for (const f of filasValidas) {
      const p = parseFloat(f.precio);
      if (isNaN(p) || p <= 0) {
        toast.error(`Precio inválido en el plato "${f.nombre}"`);
        return;
      }
    }

    setGuardando(true);
    try {
      await api.admin.crearPlatosBulk({
        categoriaId,
        platos: filasValidas.map((f) => ({
          nombre: f.nombre.trim(),
          precio: parseFloat(f.precio).toFixed(2),
          descripcion: f.descripcion.trim() || undefined,
        })),
      });

      toast.success(`${filasValidas.length} platos creados exitosamente`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el lote');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div>
            <h3 className="font-semibold text-lg text-[var(--carbon)]">Crear platos en lote</h3>
            <p className="text-xs text-muted-foreground">Todos los productos ingresados pertenecerán a la misma categoría seleccionada</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-[var(--carbon)] text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 py-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Categoría para el lote *</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
            >
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Platos a registrar</label>
            
            <div className="space-y-2">
              {filas.map((fila, idx) => (
                <div key={fila.tempId} className="flex gap-2 items-center bg-gray-50/50 p-2.5 rounded-xl border border-border/50">
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 text-center">{idx + 1}</span>
                  
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="Nombre del plato *"
                      value={fila.nombre}
                      onChange={(e) => updateFila(fila.tempId, 'nombre', e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--dorado)] bg-white"
                    />
                  </div>

                  <div className="w-24 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">S/</span>
                      <input
                        type="number"
                        step="0.50"
                        placeholder="Precio *"
                        value={fila.precio}
                        onChange={(e) => updateFila(fila.tempId, 'precio', e.target.value)}
                        className="w-full h-9 pl-6 pr-1.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--dorado)] bg-white text-right"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="Descripción (opcional)"
                      value={fila.descripcion}
                      onChange={(e) => updateFila(fila.tempId, 'descripcion', e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-[var(--dorado)] bg-white"
                    />
                  </div>

                  <button
                    onClick={() => quitarFila(fila.tempId)}
                    className="text-muted-foreground hover:text-[var(--terracota)] p-1.5 rounded-lg hover:bg-muted shrink-0 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={agregarFila}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--carbon)] transition-colors font-medium pt-1"
            >
              <Plus size={14} className="mr-1" /> Añadir otra fila
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors font-medium">
            Cancelar
          </button>
          <Button
            className="flex-1 h-11 bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-bold"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? 'Guardando lote…' : `Guardar lote (${filas.filter((f) => f.nombre.trim() !== '' && f.precio.trim() !== '').length} platos)`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Gestión de Categorías ───────────────────────────────────────────

function CategoriasModal({
  categorias,
  onClose,
  onRefresh,
}: {
  categorias: CategoriaCarta[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [descuentaStock, setDescuentaStock] = useState(false);
  const [esParaCocina, setEsParaCocina] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  async function handleCrear() {
    if (!nombre.trim()) {
      toast.error('Ingresa el nombre de la categoría');
      return;
    }
    setGuardando(true);
    try {
      await api.categorias.create({
        nombre: nombre.trim(),
        descuentaStock,
        esParaCocina,
      });
      toast.success(`Categoría "${nombre.trim()}" creada`);
      setNombre('');
      setDescuentaStock(false);
      setEsParaCocina(true);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear categoría');
    } finally {
      setGuardando(false);
    }
  }

  async function handleToggleProp(
    cat: CategoriaCarta,
    field: 'descuentaStock' | 'esParaCocina',
    value: boolean,
  ) {
    setActualizandoId(cat.id);
    try {
      await api.categorias.update(cat.id, { [field]: value });
      toast.success(`Categoría "${cat.nombre}" actualizada`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setActualizandoId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 flex flex-col max-h-[85vh] space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div>
            <h3 className="font-semibold text-lg text-[var(--carbon)]">Gestión de Categorías</h3>
            <p className="text-xs text-muted-foreground">Crea nuevas categorías y configura sus reglas de stock e impresión</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-[var(--carbon)] text-xl leading-none">×</button>
        </div>

        {/* Crear nueva categoría */}
        <div className="rounded-xl border border-border bg-gray-50/60 p-4 space-y-3 shrink-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nueva Categoría</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Ej: Postres, Pescados, Vinos…"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
            />
            <div className="grid grid-cols-2 gap-2 text-xs text-[var(--carbon)] pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={esParaCocina}
                  onChange={(e) => setEsParaCocina(e.target.checked)}
                  className="rounded border-border text-[var(--dorado)] focus:ring-[var(--dorado)]"
                />
                <span>Enviar comanda a Cocina</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={descuentaStock}
                  onChange={(e) => setDescuentaStock(e.target.checked)}
                  className="rounded border-border text-[var(--dorado)] focus:ring-[var(--dorado)]"
                />
                <span>Descuenta Stock (Reventa)</span>
              </label>
            </div>
          </div>
          <Button
            onClick={handleCrear}
            disabled={guardando || !nombre.trim()}
            className="w-full h-9 bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold text-xs"
          >
            {guardando ? 'Guardando…' : '+ Crear categoría'}
          </Button>
        </div>

        {/* Listado de categorías */}
        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Categorías Activas ({categorias.length})</p>
          {categorias.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-white text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--carbon)] truncate">{cat.nombre}</p>
                <p className="text-[11px] text-muted-foreground truncate">slug: {cat.slug}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleProp(cat, 'esParaCocina', !cat.esParaCocina)}
                  disabled={actualizandoId === cat.id}
                  className={[
                    'text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors',
                    cat.esParaCocina ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500 line-through',
                  ].join(' ')}
                  title="Toggle impresión en cocina"
                >
                  {cat.esParaCocina ? 'Cocina ✓' : 'Sin cocina'}
                </button>
                <button
                  onClick={() => handleToggleProp(cat, 'descuentaStock', !cat.descuentaStock)}
                  disabled={actualizandoId === cat.id}
                  className={[
                    'text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors',
                    cat.descuentaStock ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500',
                  ].join(' ')}
                  title="Toggle descuento automático de stock"
                >
                  {cat.descuentaStock ? 'Stock 📉' : 'Sin stock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminCatalogoPage() {
  const [platos, setPlatos]       = useState<PlatoCarta[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCarta[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [editando, setEditando]   = useState<PlatoCarta | null>(null);
  const [form, setForm]           = useState<FormState>({ nombre: '', precio: '', categoriaId: '' });
  const [guardando, setGuardando] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [busqueda, setBusqueda]   = useState('');
  const [filtroCat, setFiltroCat] = useState<'todas' | string>('todas');
  const [bulkModalAbierto, setBulkModalAbierto] = useState(false);
  const [categoriasModalAbierto, setCategoriasModalAbierto] = useState(false);

  const fetchPlatos = useCallback(async () => {
    try {
      const [resPlatos, catData] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/platos`, { credentials: 'include' }).then((r) => r.json()),
        api.categorias.list().catch(() => []),
      ]);
      if (Array.isArray(resPlatos)) setPlatos(resPlatos);
      if (Array.isArray(catData)) {
        setCategorias(catData);
        setForm((f) => (f.categoriaId ? f : { ...f, categoriaId: catData[0]?.id ?? '' }));
      }
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
    if (!form.nombre || !form.precio || !form.categoriaId) { toast.error('Completa nombre, precio y categoría'); return; }
    const precio = parseFloat(form.precio);
    if (isNaN(precio) || precio <= 0) { toast.error('Precio inválido'); return; }

    setGuardando(true);
    try {
      await api.admin.crearPlato({
        nombre:      form.nombre,
        precio:      precio.toFixed(2),
        categoriaId: form.categoriaId,
      });
      toast.success(`"${form.nombre}" agregado a la carta`);
      setForm({ nombre: '', precio: '', categoriaId: categorias[0]?.id ?? '' });
      setFormAbierto(false);
      fetchPlatos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setGuardando(false); }
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

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando carta…</div>;

  return (
    <>
      {editando && (
        <EditModal
          plato={editando}
          categorias={categorias}
          onClose={() => setEditando(null)}
          onSaved={(updated) => {
            setPlatos((prev) => prev.map((p) => p.id === updated.id ? updated : p));
            setEditando(null);
            fetchPlatos();
          }}
        />
      )}

      {bulkModalAbierto && (
        <BulkModal
          categorias={categorias}
          onClose={() => setBulkModalAbierto(false)}
          onSaved={() => {
            fetchPlatos();
          }}
        />
      )}

      {categoriasModalAbierto && (
        <CategoriasModal
          categorias={categorias}
          onClose={() => setCategoriasModalAbierto(false)}
          onRefresh={() => {
            fetchPlatos();
          }}
        />
      )}

      <div className="p-5 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--carbon)]">Carta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {platos.length} platos{sinStock > 0 && <span className="text-[var(--terracota)]"> · {sinStock} sin stock</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              onClick={() => setCategoriasModalAbierto(true)}
              variant="outline"
              className="border-border text-[var(--carbon)] hover:bg-muted font-semibold"
            >
              Categorías ({categorias.length})
            </Button>
            <Button
              onClick={() => setBulkModalAbierto(true)}
              variant="outline"
              className="border-border text-[var(--carbon)] hover:bg-muted font-semibold"
            >
              Crear en lote
            </Button>
            <Button
              onClick={() => setFormAbierto((v) => !v)}
              className="bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
            >
              <Plus size={15} className="mr-1" /> {formAbierto ? 'Cerrar' : 'Nuevo plato'}
            </Button>
          </div>
        </div>

        {/* Formulario nuevo plato (colapsable) */}
        {formAbierto && (
          <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">Nombre</label>
                <input
                  type="text" placeholder="Ej: Lomo saltado" autoFocus
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
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">Categoría</label>
                <select
                  value={form.categoriaId}
                  onChange={(e) => setForm((p) => ({ ...p, categoriaId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
                >
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              className="w-full bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
              onClick={handleCrearPlato} disabled={guardando || !form.nombre || !form.precio || !form.categoriaId}
            >
              {guardando ? 'Agregando…' : 'Agregar a la carta'}
            </Button>
          </div>
        )}

        {/* Buscador + filtro por categoría */}
        <div className="flex items-center gap-2 sticky top-0 z-10 bg-[var(--crema)] pb-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar plato…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <select
            value={filtroCat}
            onChange={(e) => setFiltroCat(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
          >
            <option value="todas">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
        </div>

        {(() => {
          const q = busqueda.trim().toLowerCase();
          const platosFiltrados = platos.filter((p) => {
            if (filtroCat !== 'todas' && p.categoriaId !== filtroCat && p.categoria?.id !== filtroCat) return false;
            if (q && !p.nombre.toLowerCase().includes(q)) return false;
            return true;
          });
          if (platosFiltrados.length === 0) {
            return (
              <p className="text-sm text-muted-foreground text-center py-8">
                Ningún plato coincide con la búsqueda.
              </p>
            );
          }
          return categorias.map((cat) => {
            const items = platosFiltrados.filter((p) => p.categoriaId === cat.id || p.categoria?.id === cat.id);
            if (!items.length) return null;
            return (
              <section key={cat.id}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{cat.nombre}</h3>
                <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
                  {items.map((p) => <PlatoRow key={p.id} plato={p} />)}
                </div>
              </section>
            );
          });
        })()}
      </div>
    </>
  );
}
