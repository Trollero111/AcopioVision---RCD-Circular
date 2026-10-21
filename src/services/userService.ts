/**
 * Servicio de Gestión de Usuarios y Control de Acceso por Roles (RBAC)
 * RCD Circular - Monzón (Aragón)
 *
 * Roles disponibles:
 * - 'jefe': Acceso total a todos los acopios, estadísticas globales de planta,
 *   auditoría completa y configuración de planta.
 * - 'operario': Acceso restringido exclusivamente a los acopios y análisis subidos
 *   por el propio operario.
 * - 'tecnico_calidad': Acceso para validación de pesajes de báscula, laboratorio
 *   y control de impropios.
 */

import { UserAccount, UserRole, PileAnalysisRecord } from '../types';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-jefe-carlos',
    name: 'Carlos Martínez',
    username: 'carlos.jefe',
    role: 'jefe',
    email: 'carlos.martinez@rcdcircular.es',
    jobTitle: 'Jefe de Planta & Director Técnico',
    plantLocation: 'Planta La Campaneta (Monzón)',
    shift: 'Jornada Completa',
    avatarBg: 'bg-emerald-600',
    isDefault: true,
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr-op-manolo',
    name: 'Manolo Gómez',
    username: 'manolo.operario',
    role: 'operario',
    email: 'manolo.gomez@rcdcircular.es',
    jobTitle: 'Operario Retroexcavadora & Acopios',
    plantLocation: 'Planta La Campaneta',
    shift: 'Turno Mañana (07:00 - 15:00)',
    avatarBg: 'bg-amber-600',
    isDefault: false,
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr-op-david',
    name: 'David Sanz',
    username: 'david.operario',
    role: 'operario',
    email: 'david.sanz@rcdcircular.es',
    jobTitle: 'Operario Trituradora Móvil & Machaqueo',
    plantLocation: 'Obra Externa / Planta',
    shift: 'Turno Tarde (15:00 - 23:00)',
    avatarBg: 'bg-blue-600',
    isDefault: false,
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr-tec-laura',
    name: 'Laura Ibáñez',
    username: 'laura.calidad',
    role: 'tecnico_calidad',
    email: 'laura.ibanez@rcdcircular.es',
    jobTitle: 'Responsable de Báscula y Control Calidad',
    plantLocation: 'Báscula y Laboratorio',
    shift: 'Turno Continuo',
    avatarBg: 'bg-purple-600',
    isDefault: false,
    createdAt: '2026-01-01T08:00:00Z',
  },
];

const STORAGE_KEYS = {
  CURRENT_USER: 'acopiovision_current_user_v1',
  LOCAL_USERS: 'acopiovision_users_v1',
};

class UserService {
  private currentUser: UserAccount | null = null;
  private listeners: Array<(user: UserAccount) => void> = [];

  constructor() {
    this.initCurrentUser();
  }

  private initCurrentUser(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading stored current user:', e);
    }

    if (!this.currentUser) {
      // Por defecto arranca como Carlos Martínez (Jefe de Planta) para ofrecer vista completa inicial
      this.currentUser = DEFAULT_USERS[0];
      this.persistCurrentUser(this.currentUser);
    }
  }

  public getCurrentUser(): UserAccount {
    if (!this.currentUser) {
      this.currentUser = DEFAULT_USERS[0];
    }
    return this.currentUser;
  }

  public setCurrentUser(user: UserAccount): void {
    this.currentUser = user;
    this.persistCurrentUser(user);
    this.notifyListeners(user);
  }

  public subscribe(listener: (user: UserAccount) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(user: UserAccount): void {
    this.listeners.forEach((l) => {
      try {
        l(user);
      } catch (err) {
        console.error('Error notifying user listener:', err);
      }
    });
  }

  private persistCurrentUser(user: UserAccount): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } catch (e) {
      console.warn('Error persisting current user:', e);
    }
  }

  public async getUsers(): Promise<UserAccount[]> {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch (e) {
      // Fallback a localStorage o por defecto
    }

    const local = localStorage.getItem(STORAGE_KEYS.LOCAL_USERS);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }

    return DEFAULT_USERS;
  }

  public async saveUser(user: UserAccount): Promise<UserAccount> {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('API error saving user, storing locally:', e);
    }

    // Fallback local
    const users = await this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));

    if (this.currentUser?.id === user.id) {
      this.setCurrentUser(user);
    }
    return user;
  }

  public async deleteUser(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) return true;
    } catch (_) {}

    const users = (await this.getUsers()).filter((u) => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
    return true;
  }

  /**
   * Filtra los acopios según el rol del usuario:
   * - JEFE o TECNICO_CALIDAD: ve todos los acopios de la planta.
   * - OPERARIO: ve ÚNICAMENTE los acopios subidos por él.
   */
  public filterRecordsForUser(records: PileAnalysisRecord[], user: UserAccount): PileAnalysisRecord[] {
    if (!user || user.role === 'jefe' || user.role === 'tecnico_calidad') {
      return records;
    }

    // Rol operario: filtrar por su id de usuario o coincidencia de nombre
    const userFirstName = user.name.toLowerCase().split(' ')[0];
    return records.filter((r) => {
      if (r.operatorUserId && r.operatorUserId === user.id) {
        return true;
      }
      if (r.operatorUser) {
        const opLower = r.operatorUser.toLowerCase();
        if (opLower.includes(user.name.toLowerCase()) || opLower.includes(userFirstName)) {
          return true;
        }
      }
      return false;
    });
  }

  public canUserViewAllRecords(user: UserAccount): boolean {
    return user.role === 'jefe' || user.role === 'tecnico_calidad';
  }

  public canUserManageSettings(user: UserAccount): boolean {
    return user.role === 'jefe';
  }

  public canUserDeleteAllRecords(user: UserAccount): boolean {
    return user.role === 'jefe';
  }

  public getRoleInfo(role: UserRole): {
    label: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    description: string;
  } {
    switch (role) {
      case 'jefe':
        return {
          label: 'Jefe de Planta',
          badgeBg: 'bg-emerald-500/15',
          textColor: 'text-emerald-300',
          borderColor: 'border-emerald-500/30',
          description: 'Acceso total: puede ver todos los acopios, balances anuales, auditoría y ajustes.',
        };
      case 'operario':
        return {
          label: 'Operario',
          badgeBg: 'bg-amber-500/15',
          textColor: 'text-amber-300',
          borderColor: 'border-amber-500/30',
          description: 'Solo ve y gestiona los acopios y análisis que haya subido él.',
        };
      case 'tecnico_calidad':
        return {
          label: 'Control Calidad',
          badgeBg: 'bg-purple-500/15',
          textColor: 'text-purple-300',
          borderColor: 'border-purple-500/30',
          description: 'Verificación de báscula, metrología y revisión de alertas de peligrosidad.',
        };
    }
  }
}

export const userService = new UserService();
