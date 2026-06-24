'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, InsumoStock } from '@/lib/api';

function StockBar({ actual, max }: { actual: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((actual / max) * 100)) : 0;
  const color =
    actual <= 0  ? 'bg-[var(--terracota)]' :
    pct < 25     ? 'bg-[var(--dorado)]'    :
                   'bg-[var(--salvia)]';
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1">
      <div className={['h-full rounded-full transition-all', color].join(' ')} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AdminStockPage() {
  const [insumos, setInsumos]   = useState<InsumoStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ajustando, setAjustando] = useState<string | null>(null);
  const [syncing, setSyncing]   = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});

  const fetchStock = useCallback(async () => {
    try {
      const data = await api.admin.getStock();
      setInsumos(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, []);

  // Al cargar, sincronizar disponible con stockActual para corregir cualquier desincronía
  useEffect(() => {
    api.admin.syncDisponible().catch(() => {});
    fetchStock();
    const id = setInterval(fetchStock, 15000);
    return () => clearInterval(id);
  }, [fetchStock]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await api.admin.syncDisponible();
      await fetchStock();
      toast.success(`Sincronizado: ${res.conStock} con stock · ${res.sinStock} agotados`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setSyncing(false); }
  }

  async function handleAjustar(ins: InsumoStock) {
    const raw = cantidades[ins.id] ?? '';
    const cantidad = parseInt(raw);
    if (!raw || isNaN(cantidad) || cantidad === 0) { toast.error('Ingresa una cantidad'); return; }

    setAjustando(ins.id);
    try {
      const res = await api.admin.ajustarStock(ins.id, cantidad);
      setInsumos((prev) =>
        prev.map((x) => x.id === ins.id ? { ...x, stockActual: res.stockActual } : x),
      );
      setCantidades((prev) => ({ ...prev, [ins.id]: '' }));
      toast.success(`${ins.nombre}: ${res.stockActual} ${ins.nombreUnidadMinima}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setAjustando(null); }
  }

  const sinStock = insumos.filter((i) => i.stockActual <= 0).length;

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-5 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold text-[var(--carbon)]">Stock</h2>
          {sinStock > 0 && (
            <span className="text-xs font-semibold text-[var(--terracota)]">{sinStock} agotado{sinStock > 1 ? 's' : ''}</span>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-xs text-muted-foreground hover:text-[var(--carbon)] px-3 py-1.5 rounded-lg hover:bg-white border border-border transition-colors disabled:opacity-40"
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar carta'}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
        {insumos.map((ins) => {
          const maxRef = ins.unidadesPorUnidadDeCompra * 10;
          return (
            <div key={ins.id} className="px-4 py-4 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="font-medium text-[var(--carbon)]">{ins.nombre}</p>
                    <span className={[
                      'text-xs font-semibold',
                      ins.stockActual <= 0 ? 'text-[var(--terracota)]' : 'text-[var(--salvia)]',
                    ].join(' ')}>
                      {ins.stockActual} {ins.nombreUnidadMinima}
                    </span>
                  </div>
                  <StockBar actual={ins.stockActual} max={maxRef} />
                </div>

                {/* Mini form de ingreso */}
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    placeholder="+8"
                    value={cantidades[ins.id] ?? ''}
                    onChange={(e) => setCantidades((p) => ({ ...p, [ins.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAjustar(ins)}
                    className="w-20 h-8 px-2 rounded-lg border border-border text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
                  />
                  <button
                    onClick={() => handleAjustar(ins)}
                    disabled={ajustando === ins.id || !cantidades[ins.id]}
                    className="h-8 px-3 rounded-lg bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] text-sm font-semibold disabled:opacity-40 transition-colors"
                  >
                    {ajustando === ins.id ? '…' : 'OK'}
                  </button>
                </div>
              </div>

              {/* Platos asociados */}
              {ins.platosAsociados.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {ins.platosAsociados.map((p) => (
                    <span
                      key={p.id}
                      className={[
                        'text-xs px-2 py-0.5 rounded-full',
                        p.disponible
                          ? 'bg-[var(--salvia)]/10 text-[var(--salvia)]'
                          : 'bg-[var(--terracota)]/10 text-[var(--terracota)]',
                      ].join(' ')}
                    >
                      {p.nombre} ({p.cantidadConsumida} u.)
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Ingresa la cantidad a sumar (positiva) o restar (negativa) y presiona OK o Enter.
      </p>
    </div>
  );
}
