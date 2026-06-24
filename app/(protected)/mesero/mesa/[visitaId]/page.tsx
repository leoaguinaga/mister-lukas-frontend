'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { PlatoCarta, Visita } from '@/lib/types';
import { RondaCard } from '@/components/mesero/RondaCard';
import { CantidadControl } from '@/components/mesero/CantidadControl';
import { Button } from '@/components/ui/button';

interface LineaPedido {
  platoCartaId: string;
  cantidad: number;
  notas: string;
  notaAbierta: boolean;
}

export default function MesaPage() {
  const { visitaId } = useParams<{ visitaId: string }>();
  const router = useRouter();

  const [visita, setVisita] = useState<Visita | null>(null);
  const [menu, setMenu] = useState<PlatoCarta[]>([]);
  const [lineas, setLineas] = useState<Map<string, LineaPedido>>(new Map());
  const [enviando, setEnviando] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);

  const platoMap = useMemo(() => new Map(menu.map((p) => [p.id, p])), [menu]);

  const fetchVisita = useCallback(async () => {
    try {
      const data = await api.visitas.get(visitaId);
      setVisita(data);
    } catch {
      // silencioso en polling
    }
  }, [visitaId]);

  useEffect(() => {
    api.menu.list().then(setMenu).catch(() => {});
    fetchVisita();
    const interval = setInterval(fetchVisita, 5000);
    return () => clearInterval(interval);
  }, [fetchVisita]);

  function setLinea(platoId: string, update: Partial<LineaPedido>) {
    setLineas((prev) => {
      const next = new Map(prev);
      const actual = next.get(platoId) ?? {
        platoCartaId: platoId,
        cantidad: 0,
        notas: '',
        notaAbierta: false,
      };
      next.set(platoId, { ...actual, ...update });
      return next;
    });
  }

  const itemsParaEnviar = Array.from(lineas.values()).filter((l) => l.cantidad > 0);
  const totalPedido = itemsParaEnviar.reduce((s, l) => {
    const precio = parseFloat(platoMap.get(l.platoCartaId)?.precio ?? '0');
    return s + precio * l.cantidad;
  }, 0);

  async function handleEnviarPedido() {
    if (itemsParaEnviar.length === 0) return;
    setEnviando(true);
    try {
      await api.visitas.crearPedido(
        visitaId,
        itemsParaEnviar.map((l) => ({
          platoCartaId: l.platoCartaId,
          cantidad: l.cantidad,
          notas: l.notas || undefined,
        })),
      );
      toast.success('Pedido enviado a cocina');
      setLineas(new Map());
      fetchVisita();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar pedido');
    } finally {
      setEnviando(false);
    }
  }

  async function handleMarcarEntregado(pedidoId: string) {
    setMarcando(pedidoId);
    try {
      await api.pedidos.cambiarEstado(pedidoId, 'entregado');
      toast.success('Entregado');
      fetchVisita();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setMarcando(null);
    }
  }

  async function handleCancelar(pedidoId: string) {
    if (!confirm('¿Cancelar esta ronda? Se restaurará el stock.')) return;
    setMarcando(pedidoId);
    try {
      await api.pedidos.cambiarEstado(pedidoId, 'cancelado');
      toast.success('Ronda cancelada');
      fetchVisita();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setMarcando(null);
    }
  }

  async function handleToggleDisponible(platoId: string, actual: boolean) {
    try {
      await api.menu.toggleDisponible(platoId, !actual);
      setMenu((prev) =>
        prev.map((p) => (p.id === platoId ? { ...p, disponible: !actual } : p)),
      );
      toast.success(!actual ? 'Plato disponible' : 'Plato no disponible');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  // Agrupar menu por categoría para mostrar
  const categorias: Array<{ label: string; key: string }> = [
    { label: 'Pollo a la brasa', key: 'fraccionable' },
    { label: 'Bebidas', key: 'reventa' },
    { label: 'Extras', key: 'multi_insumo' },
  ];

  if (!visita) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Cargando mesa…
      </div>
    );
  }

  const mesaNumero = '—'; // el backend no devuelve número en visita; lo obtenemos del título

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white">
        <button
          onClick={() => router.push('/mesero')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Mesas
        </button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total visita</p>
          <p className="font-bold text-[var(--carbon)]">S/{visita.total}</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">

        {/* ─── Izquierda: tomar pedido ─────────────────────────── */}
        <div className="flex flex-col border-r border-border overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {categorias.map(({ label, key }) => {
              const platos = menu.filter((p) => p.categoriaInventario === key);
              if (platos.length === 0) return null;
              return (
                <section key={key}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {label}
                  </h3>
                  <div className="space-y-2">
                    {platos.map((plato) => {
                      const linea = lineas.get(plato.id);
                      return (
                        <div
                          key={plato.id}
                          className={[
                            'rounded-xl border bg-white p-3 space-y-2 transition-opacity',
                            !plato.disponible ? 'opacity-40' : '',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={['font-medium text-sm leading-tight', !plato.disponible ? 'line-through' : ''].join(' ')}>
                                {plato.nombre}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">S/{plato.precio}</span>
                                {plato.categoriaInventario !== 'multi_insumo' && plato.stockActual !== null && (
                                  <span className={[
                                    'text-xs font-medium',
                                    plato.stockActual <= 0 ? 'text-[var(--terracota)]' : 'text-[var(--salvia)]',
                                  ].join(' ')}>
                                    {plato.stockActual <= 0 ? 'Agotado' : `${plato.stockActual} ${plato.nombreUnidadMinima ?? ''}`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleToggleDisponible(plato.id, plato.disponible)}
                                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                              >
                                {plato.disponible ? 'No hay' : 'Hay'}
                              </button>
                              <CantidadControl
                                value={linea?.cantidad ?? 0}
                                onChange={(v) => setLinea(plato.id, { platoCartaId: plato.id, cantidad: v })}
                              />
                            </div>
                          </div>

                          {/* Nota — visible si hay cantidad o nota ya escrita */}
                          {((linea?.cantidad ?? 0) > 0 || linea?.notaAbierta) && (
                            <input
                              placeholder="Nota (sin ají, sin crema…)"
                              value={linea?.notas ?? ''}
                              onChange={(e) => setLinea(plato.id, { notas: e.target.value })}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--terracota)]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Botón enviar — sticky */}
          <div className="p-4 border-t border-border bg-white">
            <Button
              className="w-full h-12 text-base bg-[var(--terracota)] hover:bg-[#9e3726] text-white disabled:opacity-40"
              disabled={itemsParaEnviar.length === 0 || enviando}
              onClick={handleEnviarPedido}
            >
              {enviando
                ? 'Enviando…'
                : itemsParaEnviar.length > 0
                  ? `Enviar a cocina · S/${totalPedido.toFixed(2)}`
                  : 'Enviar a cocina'}
            </Button>
          </div>
        </div>

        {/* ─── Derecha: rondas activas ──────────────────────────── */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-white">
            <h3 className="text-sm font-semibold text-[var(--carbon)]">
              Rondas activas
              {visita.pedidos.length > 0 && (
                <span className="ml-2 text-muted-foreground font-normal">
                  ({visita.pedidos.length})
                </span>
              )}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {visita.pedidos.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm pt-8">
                Sin pedidos aún
              </p>
            ) : (
              [...visita.pedidos]
                .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
                .map((pedido) => (
                  <RondaCard
                    key={pedido.id}
                    pedido={pedido}
                    platoMap={platoMap}
                    onMarcarEntregado={handleMarcarEntregado}
                    onCancelar={handleCancelar}
                    cargando={marcando === pedido.id}
                  />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
