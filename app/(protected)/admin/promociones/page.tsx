'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import type { PlatoCarta, Promocion, TipoDescuento, UpsertPromocion } from '@/lib/types';
import { Button } from '@/components/ui/button';

const DIAS = [
  { iso: 1, corto: 'L',  largo: 'Lunes' },
  { iso: 2, corto: 'Ma', largo: 'Martes' },
  { iso: 3, corto: 'Mi', largo: 'Miércoles' },
  { iso: 4, corto: 'J',  largo: 'Jueves' },
  { iso: 5, corto: 'V',  largo: 'Viernes' },
  { iso: 6, corto: 'S',  largo: 'Sábado' },
  { iso: 7, corto: 'D',  largo: 'Domingo' },
];

const FORM_VACIO: UpsertPromocion = {
  nombre:          '',
  descripcion:     '',
  tipoDescuento:   'porcentaje',
  valorDescuento:  '10',
  diasSemana:      [2, 4],
  horaInicio:      null,
  horaFin:         null,
  vigenteDesde:    null,
  vigenteHasta:    null,
  activo:          true,
  platoCartaIds:   [],
};

function resumenDias(dias: number[]): string {
  if (dias.length === 0) return '—';
  if (dias.length === 7) return 'Todos los días';
  return dias.map((d) => DIAS.find((x) => x.iso === d)?.corto ?? d).join(', ');
}

function resumenDescuento(p: Promocion): string {
  const v = parseFloat(p.valorDescuento);
  return p.tipoDescuento === 'porcentaje' ? `-${v.toFixed(0)}%` : `-S/${v.toFixed(2)}`;
}

// ─── Modal crear/editar ───────────────────────────────────────────────────────

function PromoModal({
  promo,
  platos,
  onClose,
  onSaved,
}: {
  promo: Promocion | null;
  platos: PlatoCarta[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UpsertPromocion>(() => {
    if (!promo) return FORM_VACIO;
    return {
      nombre:         promo.nombre,
      descripcion:    promo.descripcion ?? '',
      tipoDescuento:  promo.tipoDescuento,
      valorDescuento: promo.valorDescuento,
      diasSemana:     promo.diasSemana,
      horaInicio:     promo.horaInicio,
      horaFin:        promo.horaFin,
      vigenteDesde:   promo.vigenteDesde,
      vigenteHasta:   promo.vigenteHasta,
      activo:         promo.activo,
      platoCartaIds:  promo.platoCartaIds,
    };
  });
  const [guardando, setGuardando] = useState(false);
  const [filtroPlato, setFiltroPlato] = useState('');

  const platosFiltrados = useMemo(() => {
    const q = filtroPlato.trim().toLowerCase();
    const base = platos.filter((p) => p.activo);
    if (!q) return base;
    return base.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [platos, filtroPlato]);

  function toggleDia(iso: number) {
    setForm((f) => ({
      ...f,
      diasSemana: f.diasSemana.includes(iso)
        ? f.diasSemana.filter((d) => d !== iso)
        : [...f.diasSemana, iso].sort((a, b) => a - b),
    }));
  }

  function togglePlato(id: string) {
    setForm((f) => ({
      ...f,
      platoCartaIds: f.platoCartaIds.includes(id)
        ? f.platoCartaIds.filter((p) => p !== id)
        : [...f.platoCartaIds, id],
    }));
  }

  function seleccionarTodosFiltrados() {
    const ids = platosFiltrados.map((p) => p.id);
    setForm((f) => ({
      ...f,
      platoCartaIds: Array.from(new Set([...f.platoCartaIds, ...ids])),
    }));
  }

  function deseleccionarTodos() {
    setForm((f) => ({ ...f, platoCartaIds: [] }));
  }

  async function handleGuardar() {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    const valor = parseFloat(form.valorDescuento);
    if (isNaN(valor) || valor <= 0) { toast.error('Valor de descuento inválido'); return; }
    if (form.tipoDescuento === 'porcentaje' && valor > 100) { toast.error('El porcentaje no puede superar 100'); return; }
    if (form.diasSemana.length === 0) { toast.error('Selecciona al menos un día'); return; }
    if (form.platoCartaIds.length === 0) { toast.error('Selecciona al menos un plato'); return; }

    const payload: UpsertPromocion = {
      ...form,
      descripcion: form.descripcion?.trim() || null,
      valorDescuento: valor.toFixed(2),
      horaInicio: form.horaInicio || null,
      horaFin:    form.horaFin || null,
      vigenteDesde: form.vigenteDesde || null,
      vigenteHasta: form.vigenteHasta || null,
    };

    setGuardando(true);
    try {
      if (promo) {
        await api.admin.promociones.update(promo.id, payload);
        toast.success('Promoción actualizada');
      } else {
        await api.admin.promociones.create(payload);
        toast.success('Promoción creada');
      }
      onSaved();
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
      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--carbon)]">
            {promo ? 'Editar promoción' : 'Nueva promoción'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-[var(--carbon)] text-xl leading-none">×</button>
        </div>

        {/* Nombre + descripción */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Martes y jueves polleros"
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Descripción (opcional)</label>
            <input
              type="text"
              value={form.descripcion ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
        </div>

        {/* Descuento */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1 col-span-2">
            <label className="text-xs text-muted-foreground">Tipo de descuento</label>
            <select
              value={form.tipoDescuento}
              onChange={(e) => setForm((p) => ({ ...p, tipoDescuento: e.target.value as TipoDescuento }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto_fijo">Monto fijo (S/)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Valor</label>
            <input
              type="number" min="0" step={form.tipoDescuento === 'porcentaje' ? '1' : '0.50'}
              value={form.valorDescuento}
              onChange={(e) => setForm((p) => ({ ...p, valorDescuento: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
        </div>

        {/* Días de la semana */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Días de la semana</label>
          <div className="flex gap-1.5 flex-wrap">
            {DIAS.map((d) => {
              const activo = form.diasSemana.includes(d.iso);
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => toggleDia(d.iso)}
                  title={d.largo}
                  className={[
                    'h-9 min-w-9 px-2.5 rounded-lg text-xs font-medium border transition-colors',
                    activo
                      ? 'bg-[var(--dorado)] border-[var(--dorado)] text-[var(--carbon)]'
                      : 'bg-white border-border text-muted-foreground hover:bg-muted',
                  ].join(' ')}
                >
                  {d.corto}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horario opcional */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Hora inicio (opcional)</label>
            <input
              type="time"
              value={form.horaInicio ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value || null }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Hora fin (opcional)</label>
            <input
              type="time"
              value={form.horaFin ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, horaFin: e.target.value || null }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
        </div>

        {/* Vigencia */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Vigente desde (opcional)</label>
            <input
              type="date"
              value={form.vigenteDesde ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, vigenteDesde: e.target.value || null }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Vigente hasta (opcional)</label>
            <input
              type="date"
              value={form.vigenteHasta ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, vigenteHasta: e.target.value || null }))}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
        </div>

        {/* Activo */}
        <label className="flex items-center gap-2 text-sm text-[var(--carbon)]">
          <input
            type="checkbox"
            checked={form.activo ?? true}
            onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
            className="h-4 w-4 accent-[var(--dorado)]"
          />
          Activa
        </label>

        {/* Selección de platos */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--carbon)]">
              Platos incluidos ({form.platoCartaIds.length})
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={seleccionarTodosFiltrados}
                className="text-xs text-muted-foreground hover:text-[var(--carbon)] underline"
              >
                Seleccionar visibles
              </button>
              <button
                type="button"
                onClick={deseleccionarTodos}
                className="text-xs text-muted-foreground hover:text-[var(--carbon)] underline"
              >
                Limpiar
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder="Buscar plato…"
            value={filtroPlato}
            onChange={(e) => setFiltroPlato(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
          />
          <div className="max-h-56 overflow-y-auto border border-border rounded-xl divide-y divide-border">
            {platosFiltrados.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">Sin resultados</div>
            ) : (
              platosFiltrados.map((p) => (
                <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.platoCartaIds.includes(p.id)}
                    onChange={() => togglePlato(p.id)}
                    className="h-4 w-4 accent-[var(--dorado)]"
                  />
                  <span className="flex-1 text-sm text-[var(--carbon)]">{p.nombre}</span>
                  <span className="text-xs text-muted-foreground">S/{p.precio}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <Button
            className="flex-1 h-10 bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : promo ? 'Guardar cambios' : 'Crear promoción'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminPromocionesPage() {
  const [promos, setPromos]     = useState<Promocion[]>([]);
  const [platos, setPlatos]     = useState<PlatoCarta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Promocion | null>(null);
  const [creando, setCreando]   = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([
        api.admin.promociones.list(),
        api.menu.list(),
      ]);
      setPromos(p);
      setPlatos(m);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleToggleActivo(promo: Promocion) {
    try {
      await api.admin.promociones.setActivo(promo.id, !promo.activo);
      setPromos((prev) => prev.map((p) => (p.id === promo.id ? { ...p, activo: !p.activo } : p)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  async function handleEliminar(promo: Promocion) {
    if (!confirm(`¿Eliminar promoción "${promo.nombre}"?`)) return;
    try {
      await api.admin.promociones.remove(promo.id);
      setPromos((prev) => prev.filter((p) => p.id !== promo.id));
      toast.success('Eliminada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  const platoMap = useMemo(() => new Map(platos.map((p) => [p.id, p])), [platos]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Cargando promociones…
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Promociones</h2>
        <Button
          onClick={() => setCreando(true)}
          className="bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
        >
          + Nueva promoción
        </Button>
      </div>

      {promos.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-8 text-center text-muted-foreground">
          No hay promociones configuradas.
          <br />
          Crea una para aplicar descuentos automáticos según el día.
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <div
              key={p.id}
              className={[
                'bg-white border rounded-2xl p-4 space-y-2',
                p.activo ? 'border-border' : 'border-border opacity-60',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--carbon)]">{p.nombre}</span>
                    <span className="text-sm font-bold text-[var(--rojo)]">{resumenDescuento(p)}</span>
                    {!p.activo && (
                      <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        inactiva
                      </span>
                    )}
                  </div>
                  {p.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.descripcion}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    <div>📅 {resumenDias(p.diasSemana)}</div>
                    {(p.horaInicio || p.horaFin) && (
                      <div>⏰ {p.horaInicio?.slice(0, 5) ?? '00:00'} – {p.horaFin?.slice(0, 5) ?? '23:59'}</div>
                    )}
                    {(p.vigenteDesde || p.vigenteHasta) && (
                      <div>🗓 {p.vigenteDesde ?? 'sin inicio'} → {p.vigenteHasta ?? 'sin fin'}</div>
                    )}
                    <div>🍽 {p.platoCartaIds.length} plato(s): {p.platoCartaIds.slice(0, 3).map((id) => platoMap.get(id)?.nombre ?? '?').join(', ')}{p.platoCartaIds.length > 3 ? '…' : ''}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <button
                    onClick={() => handleToggleActivo(p)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-[var(--carbon)]"
                  >
                    {p.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => setEditando(p)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-[var(--carbon)]"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(p)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--rojo)]/30 text-[var(--rojo)] hover:bg-[var(--rojo)]/10"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creando || editando) && (
        <PromoModal
          promo={editando}
          platos={platos}
          onClose={() => { setCreando(false); setEditando(null); }}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}
