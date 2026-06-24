'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, homeForRole, type Rol } from '@/lib/auth-client';

export default function Home() {
  const router = useRouter();
  const { data, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    if (!data?.user) {
      router.replace('/login');
      return;
    }
    const role = (data.user as { role?: Rol }).role;
    router.replace(role ? homeForRole(role) : '/login');
  }, [data, isPending, router]);

  return (
    <main className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
      Redirigiendo…
    </main>
  );
}