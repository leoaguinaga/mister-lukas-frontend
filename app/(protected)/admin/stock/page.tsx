'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, InsumoStock } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Search, PackageCheck, AlertTriangle, Layers, Edit2, Sliders } from 'lucide-react';

export default function AdminStockPage() {
  const [insumos, setInsumos] = useState<InsumoStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [sincronizando, setSincronizando] = useState(false);

  // Modales
  const [insumoParaAjuste, setInsumoParaAjuste] = useState<InsumoStock | null>(null);
  const [insumoParaEditar, setInsumoParaEditar] = useState<InsumoStock | null>(null);
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);

  const fetchStock = useCallback(async () => {
    try {
      const data = await api.admin.getStock();
      setInsumos(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar stock');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
    const id = setInterval(fetchStock, 15000);
    return () => clearInterval(id);
  }, [fetchStock]);

  async function handleSyncDisponible() {
    setSincronizando(true);
    try {
      const res = await api.admin.syncDisponible();
      toast.success(`Disponibilidad sincronizada: ${res.conStock} platos disponibles, ${res.sinStock} agotados`);
      fetchStock();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar');
    } finally {
      setSincronizando(false);
    }
  }

  const q = busqueda.trim().toLowerCase();
  const insumosFiltrados = insumos.filter((i) =>
    q ? i.nombre.toLowerCase().includes(q) : true,
  );

  const totalInsumos = insumos.length;
  const sinStockCount = insumos.filter((i) => (i.stockActual ?? 0) <= 0).length;
  const conStockCount = totalInsumos - sinStockCount;

  if (cargando) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando inventario…</div>;
  }

  return (
    <div className="p-5 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--carbon)]">Inventario y Stock</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Supervisa y ajusta el stock en tiempo real de productos fraccionables y de reventa
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSyncDisponible}
            disabled={sincronizando}
            variant="outline"
            className="border-border text-[var(--carbon)] hover:bg-muted font-medium text-xs"
          >
            <RefreshCw size={14} className={`mr-1.5 ${sincronizando ? 'animate-spin' : ''}`} />
            Sincronizar Platos
          </Button>
          <Button
            onClick={() => setModalNuevoAbierto(true)}
            className="bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold text-xs"
          >
            <Plus size={15} className="mr-1" /> Nuevo Insumo
          </Button>
        </div>
      </div>

      {/* Resumen Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-white p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers size={14} /> Total Insumos
          </div>
          <p className="text-2xl font-bold text-[var(--carbon)]">{totalInsumos}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--salvia)]">
            <PackageCheck size={14} /> Con Stock
          </div>
          <p className="text-2xl font-bold text-[var(--salvia)]">{conStockCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--terracota)]">
            <AlertTriangle size={14} /> Agotados
          </div>
          <p className="text-2xl font-bold text-[var(--terracota)]">{sinStockCount}</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar insumo (ej: Inca Kola, Pollo, Cerveza)…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
        />
      </div>

      {/* Tabla / Listado de Insumos */}
      {insumosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay insumos que coincidan con la búsqueda.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border shadow-sm">
          {insumosFiltrados.map((insumo) => {
            const stock = insumo.stockActual ?? 0;
            const esAgotado = stock <= 0;
            const esBajo = stock > 0 && stock <= 5;

            return (
              <div key={insumo.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-[var(--carbon)] truncate">{insumo.nombre}</p>
                    <span
                      className={[
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        esAgotado
                          ? 'bg-[var(--terracota)]/15 text-[var(--terracota)]'
                          : esBajo
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#e8f0d8] text-[var(--salvia)]',
                      ].join(' ')}
                    >
                      {esAgotado ? 'Agotado ✗' : esBajo ? 'Stock bajo ⚠️' : 'En stock ✓'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Empaque: 1 unidad = {insumo.unidadesPorUnidadDeCompra} {insumo.nombreUnidadMinima}(s)
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-lg font-bold text-[var(--carbon)]">
                      {stock} <span className="text-xs font-medium text-muted-foreground">{insumo.nombreUnidadMinima}(s)</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => setInsumoParaAjuste(insumo)}
                      className="h-8 text-xs bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
                    >
                      <Sliders size={13} className="mr-1" /> Ajustar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInsumoParaEditar(insumo)}
                      className="h-8 text-xs border-border text-muted-foreground hover:text-[var(--carbon)]"
                    >
                      <Edit2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Ajustar Stock */}
      {insumoParaAjuste && (
        <AjustarStockModal
          insumo={insumoParaAjuste}
          onClose={() => setInsumoParaAjuste(null)}
          onSuccess={() => {
            setInsumoParaAjuste(null);
            fetchStock();
          }}
        />
      )}

      {/* Modal Nuevo Insumo */}
      {modalNuevoAbierto && (
        <NuevoInsumoModal
          onClose={() => setModalNuevoAbierto(false)}
          onSuccess={() => {
            setModalNuevoAbierto(false);
            fetchStock();
          }}
        />
      )}

      {/* Modal Editar Insumo */}
      {insumoParaEditar && (
        <EditarInsumoModal
          insumo={insumoParaEditar}
          onClose={() => setInsumoParaEditar(null)}
          onSuccess={() => {
            setInsumoParaEditar(null);
            fetchStock();
          }}
        />
      )}
    </div>
  );
}

// ─── Modal Ajustar Stock ──────────────────────────────────────────────────────

function AjustarStockModal({
  insumo,
  onClose,
  onSuccess,
}: {
  insumo: InsumoStock;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [modo, setModo] = useState<'ingreso' | 'perdida' | 'fijar'>('ingreso');
  const [cantidad, setCantidad] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    const val = parseInt(cantidad, 10);
    if (isNaN(val) || val <= 0) {
      toast.error('Ingresa una cantidad válida mayor a 0');
      return;
    }

    let cantidadAjuste = val;
    if (modo === 'perdida') {
      cantidadAjuste = -val;
    } else if (modo === 'fijar') {
      // Ajuste para llegar exactamente a la cantidad indicada
      cantidadAjuste = val - (insumo.stockActual ?? 0);
    }

    setGuardando(true);
    try {
      await api.admin.ajustarStock(insumo.id, cantidadAjuste, notas.trim() || undefined);
      toast.success(`Stock de "${insumo.nombre}" actualizado`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al ajustar stock');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-semibold text-[var(--carbon)]">Ajustar Stock</h3>
            <p className="text-xs text-muted-foreground">{insumo.nombre}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-[var(--carbon)] text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setModo('ingreso')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${modo === 'ingreso' ? 'bg-white text-[var(--salvia)] shadow-sm' : 'text-muted-foreground'}`}
            >
              + Ingreso
            </button>
            <button
              onClick={() => setModo('perdida')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${modo === 'perdida' ? 'bg-white text-[var(--terracota)] shadow-sm' : 'text-muted-foreground'}`}
            >
              - Pérdida
            </button>
            <button
              onClick={() => setModo('fijar')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${modo === 'fijar' ? 'bg-white text-[var(--carbon)] shadow-sm' : 'text-muted-foreground'}`}
            >
              Fijar Total
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {modo === 'ingreso' && 'Cantidad a agregar (' + insumo.nombreUnidadMinima + 's)'}
              {modo === 'perdida' && 'Cantidad a descontar (' + insumo.nombreUnidadMinima + 's)'}
              {modo === 'fijar' && 'Nuevo total exacto de ' + insumo.nombreUnidadMinima + 's'}
            </label>
            <input
              type="number"
              min="1"
              autoFocus
              placeholder="Ej: 12"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Motivo / Notas (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Compra del día, botella rota…"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Stock actual: <span className="font-bold text-[var(--carbon)]">{insumo.stockActual}</span> {insumo.nombreUnidadMinima}(s)
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted font-medium">
            Cancelar
          </button>
          <Button
            onClick={handleGuardar}
            disabled={guardando || !cantidad}
            className="flex-1 h-10 bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold text-xs"
          >
            {guardando ? 'Guardando…' : 'Confirmar Ajuste'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Nuevo Insumo ───────────────────────────────────────────────────────

function NuevoInsumoModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [nombreUnidadMinima, setNombreUnidadMinima] = useState('botella');
  const [unidadesPorCompra, setUnidadesPorCompra] = useState('1');
  const [stockActual, setStockActual] = useState('0');
  const [guardando, setGuardando] = useState(false);

  async function handleCrear() {
    if (!nombre.trim()) {
      toast.error('Ingresa el nombre del insumo');
      return;
    }

    setGuardando(true);
    try {
      await api.insumos.create({
        nombre: nombre.trim(),
        nombreUnidadMinima: nombreUnidadMinima.trim() || 'unidad',
        unidadesPorUnidadDeCompra: parseInt(unidadesPorCompra, 10) || 1,
        stockActual: parseInt(stockActual, 10) || 0,
      });
      toast.success(`Insumo "${nombre.trim()}" registrado`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar insumo');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-semibold text-[var(--carbon)]">Registrar Nuevo Insumo</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-[var(--carbon)] text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nombre del Insumo</label>
            <input
              type="text"
              placeholder="Ej: Cerveza Pilsen 620ml"
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nombre unidad</label>
              <input
                type="text"
                placeholder="botella, octavo…"
                value={nombreUnidadMinima}
                onChange={(e) => setNombreUnidadMinima(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Unidades / empaque</label>
              <input
                type="number"
                min="1"
                value={unidadesPorCompra}
                onChange={(e) => setUnidadesPorCompra(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Stock inicial (unidades mínimas)</label>
            <input
              type="number"
              min="0"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted font-medium">
            Cancelar
          </button>
          <Button
            onClick={handleCrear}
            disabled={guardando || !nombre.trim()}
            className="flex-1 h-10 bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold text-xs"
          >
            {guardando ? 'Guardando…' : 'Crear Insumo'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Editar Insumo ──────────────────────────────────────────────────────

function EditarInsumoModal({
  insumo,
  onClose,
  onSuccess,
}: {
  insumo: InsumoStock;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nombre, setNombre] = useState(insumo.nombre);
  const [nombreUnidadMinima, setNombreUnidadMinima] = useState(insumo.nombreUnidadMinima);
  const [unidadesPorCompra, setUnidadesPorCompra] = useState(String(insumo.unidadesPorUnidadDeCompra));
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    if (!nombre.trim()) {
      toast.error('Ingresa el nombre del insumo');
      return;
    }

    setGuardando(true);
    try {
      await api.insumos.update(insumo.id, {
        nombre: nombre.trim(),
        nombreUnidadMinima: nombreUnidadMinima.trim() || 'unidad',
        unidadesPorUnidadDeCompra: parseInt(unidadesPorCompra, 10) || 1,
      });
      toast.success(`Insumo "${nombre.trim()}" actualizado`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar insumo');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-semibold text-[var(--carbon)]">Editar Insumo</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-[var(--carbon)] text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nombre del Insumo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nombre unidad</label>
              <input
                type="text"
                value={nombreUnidadMinima}
                onChange={(e) => setNombreUnidadMinima(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Unidades / empaque</label>
              <input
                type="number"
                min="1"
                value={unidadesPorCompra}
                onChange={(e) => setUnidadesPorCompra(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted font-medium">
            Cancelar
          </button>
          <Button
            onClick={handleGuardar}
            disabled={guardando || !nombre.trim()}
            className="flex-1 h-10 bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold text-xs"
          >
            {guardando ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
