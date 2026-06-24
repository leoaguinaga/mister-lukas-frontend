'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Mesa } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminMesasPage() {
  const [mesas, setMesas]       = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [numero, setNumero]     = useState('');
  const [capacidad, setCapacidad] = useState('4');
  const [guardando, setGuardando] = useState(false);

  const fetchMesas = useCallback(async () => {
    try {
      const data = await api.mesas.list();
      setMesas(data);
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
      fetchMesas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally { setGuardando(false); }
  }

  async function handleEliminar(mesa: Mesa) {
    if (mesa.estado === 'ocupada') { toast.error('No se puede eliminar una mesa ocupada'); return; }
    if (!confirm(`¿Eliminar Mesa ${mesa.numero}?`)) return;
    try {
      await api.admin.eliminarMesa(mesa.id);
      toast.success(`Mesa ${mesa.numero} eliminada`);
      fetchMesas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  if (cargando) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando…</div>;

  return (
    <div className="p-5 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Mesas</h2>
        <span className="text-sm text-muted-foreground">{mesas.length} en total</span>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-border bg-white overflow-hidden divide-y divide-border">
        {mesas.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Sin mesas registradas</p>
        )}
        {mesas.map((mesa) => (
          <div key={mesa.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-[var(--carbon)] w-8">#{mesa.numero}</span>
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
              onClick={() => handleEliminar(mesa)}
              disabled={mesa.estado === 'ocupada'}
              className="text-muted-foreground hover:text-[var(--terracota)] disabled:opacity-30 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Formulario agregar */}
      <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-[var(--carbon)]">Agregar mesa</p>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Número</label>
            <input
              type="number" min="1" placeholder="11"
              value={numero} onChange={(e) => setNumero(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
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
    </div>
  );
}
