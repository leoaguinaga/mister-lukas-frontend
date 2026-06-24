import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ?? 'http://localhost:4000',
  basePath: '/api/auth',
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: 'string', required: true },
        activo: { type: 'boolean', required: false },
      },
    }),
  ],
});

export const { signIn, signOut, useSession, getSession } = authClient;

export type Rol = 'mesero' | 'cajero' | 'administracion';

export function homeForRole(role: Rol): string {
  switch (role) {
    case 'mesero':
      return '/mesero';
    case 'cajero':
      return '/caja';
    case 'administracion':
      return '/admin';
  }
}
