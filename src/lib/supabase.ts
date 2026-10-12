import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para manejar errores en español
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos';
    if (msg.includes('email not confirmed')) return 'Confirma tu email antes de iniciar sesión';
    if (msg.includes('user already registered')) return 'Este email ya está registrado';
    if (msg.includes('password')) return 'La contraseña debe tener al menos 6 caracteres';
    if (msg.includes('network') || msg.includes('fetch')) return 'Error de conexión. Verifica tu internet.';
    if (msg.includes('jwt')) return 'Sesión expirada. Inicia sesión de nuevo.';
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}
