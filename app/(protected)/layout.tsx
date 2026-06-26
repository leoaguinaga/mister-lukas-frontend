'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !data?.user) {
      router.replace('/login');
    }
  }, [data, isPending, router]);

  if (isPending || !data?.user) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </main>
    );
  }

  return <>{children}</>;
}
