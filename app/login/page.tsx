'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, homeForRole, type Rol } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });

      if (result?.error) {
        toast.error(result.error.message ?? 'No se pudo iniciar sesión');
        return;
      }

      if (!result?.data?.user) {
        toast.error('No se pudo iniciar sesión. Verificá tu conexión con el servidor.');
        return;
      }

      const role = result.data.user.role as Rol | undefined;
      toast.success(`Bienvenido, ${result.data.user.name ?? ''}`);
      router.push(role ? homeForRole(role) : '/');
    } catch {
      toast.error('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground font-serif">ML</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-serif text-foreground">
            Mister Luka
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistema operativo del restaurante
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@misterluka.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-12 text-base bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 text-base bg-white"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={loading}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </main>
  );
}
