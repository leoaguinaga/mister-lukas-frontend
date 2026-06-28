'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Mesa } from '@/lib/types';
import { Trash2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const DEFAULT_FILAS = 6;
const DEFAULT_COLS = 2;

export default function AdminMesasPage() {
  const [mesas, setMesas]       = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formAbierto, setFormAbierto] = useState(false);
  const [numero, setNumero]     = useState('');
  const [capacidad, setCapacidad] = useState('4');
  const [guardando, setGuardando] = useState(false);

  // Posiciones editables localmente; se persisten con "Guardar layout".
  // Mapa de mesaId → { fila, col } (null = sin posición).
  const [posiciones, setPosiciones] = useState<Map<string, { fila: number | null; col: number | null }>>(new Map());
  const [filas, setFilas] = useState(DEFAULT_FILAS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [guardandoLayout, setGuardandoLayout] = useState(false);
  const [mesaParaEliminar, setMesaParaEliminar] = useState<Mesa | null>(null);

  const fetchMesas = useCallback(async () => {
    try {
      const data = await api.mesas.list();
      // Excluye la mesa virtual 0 (legacy "para llevar") del editor
      const reales = data.filter((m) => m.numero !== 0);
      setMesas(reales);

      // Sincroniza posiciones con datos del servidor
      const next = new Map<string, { fila: number | null; col: number | null }>();
      let maxFila = DEFAULT_FILAS - 1;
      let maxCol = DEFAULT_COLS - 1;
      for (const m of reales) {
        next.set(m.id, { fila: m.filaPosicion, col: m.colPosicion });
        if (m.filaPosicion !== null && m.filaPosicion > maxFila) maxFila = m.filaPosicion;
        if (m.colPosicion !== null && m.colPosicion > maxCol) maxCol = m.colPosicion;
      }
      setPosiciones(next);
      setFilas(Math.max(DEFAULT_FILAS, maxFila + 1));
      setCols(Math.max(DEFAULT_COLS, maxCol + 1));
      setLayoutDirty(false);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { fetchMesas(); }, [fetchMesas]);

  async function handleAgregar() {
    const n = parseInt(numero);
    const c = parseInt(capacidad);
    if (!n || n < 1) { toast.error('Número de mesa inválido'); return; }
    if (!c || c < 1) { toast.error('Capacidad inválida'); return; }
    if (mesas.some((m) => m.numero === n)) { toast.error(`Mesa ${n} ya existe`); return; }
    setGuardando(true);
    try {
      await api.admin.crearMesa(n, c);
      toast.success(`Mesa ${n} creada`);
      setNumero('');
      setFormAbierto(false);
      fetchMesas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setGuardando(false); }
  }

  async function confirmarEliminar() {
    if (!mesaParaEliminar) return;
    const mesa = mesaParaEliminar;
    try {
      await api.admin.eliminarMesa(mesa.id);
      toast.success(`Mesa ${mesa.numero} eliminada`);
      setMesaParaEliminar(null);
      fetchMesas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  // Mapa fila/col → mesaId para render rápido
  const gridMap = useMemo(() => {
    const m = new Map<string, string>(); // `${fila},${col}` → mesaId
    for (const [id, pos] of posiciones.entries()) {
      if (pos.fila === null || pos.col === null) continue;
      m.set(`${pos.fila},${pos.col}`, id);
    }
    return m;
  }, [posiciones]);

  // Mesas sin posición — se muestran abajo como "por ubicar"
  const mesasSinPosicion = mesas.filter((m) => {
    const p = posiciones.get(m.id);
    return !p || p.fila === null || p.col === null;
  });

  function asignarPosicion(mesaId: string, fila: number, col: number) {
    setPosiciones((prev) => {
      const next = new Map(prev);
      // Si la celda ya tiene una mesa, intercámbialas
      const ocupante = gridMap.get(`${fila},${col}`);
      const actual = prev.get(mesaId) ?? { fila: null, col: null };
      if (ocupante && ocupante !== mesaId) {
        next.set(ocupante, { fila: actual.fila, col: actual.col });
      }
      next.set(mesaId, { fila, col });
      return next;
    });
    setLayoutDirty(true);
  }

  function quitarDeGrilla(mesaId: string) {
    setPosiciones((prev) => {
      const next = new Map(prev);
      next.set(mesaId, { fila: null, col: null });
      return next;
    });
    setLayoutDirty(true);
  }

  function onDragStart(e: React.DragEvent, mesaId: string) {
    e.dataTransfer.setData('text/plain', mesaId);
  }

  function onDropEnGrilla(e: React.DragEvent, fila: number, col: number) {
    e.preventDefault();
    const mesaId = e.dataTransfer.getData('text/plain');
    if (mesaId) asignarPosicion(mesaId, fila, col);
  }

  function onDropEnBanco(e: React.DragEvent) {
    e.preventDefault();
    const mesaId = e.dataTransfer.getData('text/plain');
    if (mesaId) quitarDeGrilla(mesaId);
  }

  async function handleGuardarLayout() {
    setGuardandoLayout(true);
    try {
      const payload = mesas.map((m) => {
        const p = posiciones.get(m.id) ?? { fila: null, col: null };
        return { id: m.id, filaPosicion: p.fila, colPosicion: p.col };
      });
      await api.mesas.actualizarLayout(payload);
      toast.success('Layout guardado');
      setLayoutDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar layout');
    } finally {
      setGuardandoLayout(false);
    }
  }

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando…</div>;

  const mesasById = new Map(mesas.map((m) => [m.id, m]));

  return (
    <div className="p-5 space-y-6 max-w-3xl mx-auto">
      {/* Cabecera con botón Agregar a la derecha */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--carbon)]">Mesas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{mesas.length} en total · arrastra para acomodar el salón</p>
        </div>
        <Button
          onClick={() => setFormAbierto((v) => !v)}
          className="bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
        >
          <Plus size={15} className="mr-1" /> {formAbierto ? 'Cerrar' : 'Agregar mesa'}
        </Button>
      </div>

      {/* Formulario de alta (colapsable) */}
      {formAbierto && (
        <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Número</label>
              <input
                type="number" min="1" placeholder="11"
                value={numero} onChange={(e) => setNumero(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
                autoFocus
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
            <div className="w-28 space-y-1">
              <label className="text-xs text-muted-foreground">Capacidad</label>
              <input
                type="number" min="1" placeholder="4"
                value={capacidad} onChange={(e) => setCapacidad(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
          </div>
          <Button
            className="w-full bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
            onClick={handleAgregar} disabled={guardando || !numero}
          >
            {guardando ? 'Agregando…' : 'Agregar mesa'}
          </Button>
        </div>
      )}

      {/* Editor de layout */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--carbon)]">Layout del salón</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilas((f) => Math.max(1, f - 1))}
              className="h-8 w-8 rounded-lg border border-border text-sm hover:bg-muted"
              title="Quitar fila"
            >−</button>
            <span className="text-xs text-muted-foreground">{filas} filas</span>
            <button
              onClick={() => setFilas((f) => f + 1)}
              className="h-8 w-8 rounded-lg border border-border text-sm hover:bg-muted"
              title="Agregar fila"
            >+</button>
            <span className="text-xs text-muted-foreground mx-1">·</span>
            <button
              onClick={() => setCols((c) => Math.max(1, c - 1))}
              className="h-8 w-8 rounded-lg border border-border text-sm hover:bg-muted"
              title="Quitar columna"
            >−</button>
            <span className="text-xs text-muted-foreground">{cols} cols</span>
            <button
              onClick={() => setCols((c) => c + 1)}
              className="h-8 w-8 rounded-lg border border-border text-sm hover:bg-muted"
              title="Agregar columna"
            >+</button>
          </div>
        </div>

        <div
          className="rounded-2xl border border-border bg-white p-4"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '0.5rem' }}
        >
          {Array.from({ length: filas * cols }).map((_, idx) => {
            const fila = Math.floor(idx / cols);
            const col = idx % cols;
            const mesaId = gridMap.get(`${fila},${col}`);
            const mesa = mesaId ? mesasById.get(mesaId) : null;
            return (
              <div
                key={`${fila}-${col}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropEnGrilla(e, fila, col)}
                className={[
                  'aspect-square rounded-xl border-2 border-dashed flex items-center justify-center text-center transition-colors',
                  mesa
                    ? mesa.estado === 'ocupada'
                      ? 'border-[var(--terracota)] bg-[var(--terracota)]/10'
                      : 'border-[var(--salvia)] bg-[var(--salvia)]/10'
                    : 'border-border bg-muted/30 hover:bg-muted/50',
                ].join(' ')}
              >
                {mesa ? (
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, mesa.id)}
                    onDoubleClick={() => quitarDeGrilla(mesa.id)}
                    title="Arrastra para mover · Doble click para quitar de la grilla"
                    className="cursor-grab active:cursor-grabbing select-none"
                  >
                    <p className="text-lg font-bold text-[var(--carbon)]">#{mesa.numero}</p>
                    <p className="text-[10px] text-muted-foreground">{mesa.capacidad ?? '—'} pers.</p>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/40">{fila},{col}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Banco de mesas sin posición */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropEnBanco}
          className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sin ubicar ({mesasSinPosicion.length})
          </p>
          {mesasSinPosicion.length === 0 ? (
            <p className="text-xs text-muted-foreground/70">Todas las mesas están en la grilla.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mesasSinPosicion.map((mesa) => (
                <div
                  key={mesa.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, mesa.id)}
                  className="cursor-grab active:cursor-grabbing select-none rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold"
                  title="Arrastra a una celda de la grilla"
                >
                  #{mesa.numero}
                </div>
              ))}
            </div>
          )}
        </div>

        {layoutDirty && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={fetchMesas}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-2"
            >
              Descartar cambios
            </button>
            <Button
              onClick={handleGuardarLayout}
              disabled={guardandoLayout}
              className="bg-[var(--carbon)] hover:bg-[#1a1410] text-white"
            >
              <Save size={14} className="mr-1.5" />
              {guardandoLayout ? 'Guardando…' : 'Guardar layout'}
            </Button>
          </div>
        )}
      </section>

      {/* Lista de eliminación */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--carbon)]">Eliminar mesas</h3>
        <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
          {mesas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sin mesas registradas</p>
          )}
          {mesas.map((mesa) => (
            <div key={mesa.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="text-base font-bold text-[var(--carbon)] w-8">#{mesa.numero}</span>
                <span className="text-sm text-muted-foreground">{mesa.capacidad} pers.</span>
                <span className={[
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  mesa.estado === 'ocupada'
                    ? 'bg-[var(--terracota)]/15 text-[var(--terracota)]'
                    : 'bg-[var(--salvia)]/15 text-[var(--salvia)]',
                ].join(' ')}>
                  {mesa.estado === 'ocupada' ? 'Ocupada' : 'Libre'}
                </span>
              </div>
              <button
                onClick={() => mesa.estado === 'ocupada' ? toast.error('No se puede eliminar una mesa ocupada') : setMesaParaEliminar(mesa)}
                disabled={mesa.estado === 'ocupada'}
                className="text-muted-foreground hover:text-[var(--terracota)] disabled:opacity-30 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={!!mesaParaEliminar}
        title={mesaParaEliminar ? `Eliminar mesa ${mesaParaEliminar.numero}` : ''}
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={confirmarEliminar}
        onCancel={() => setMesaParaEliminar(null)}
      />
    </div>
  );
}
