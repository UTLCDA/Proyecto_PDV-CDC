import api from './apiClient';

export interface UsuarioGestion {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  roles: string[];
  createdAtUtc: string;
}

export interface RolGestion {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isSystemRole: boolean;
  userCount: number;
  permissionCodes: string[];
}

export interface PermisoGestion {
  id: string;
  code: string;
  module: string;
  action: string;
  description: string;
}

export interface PeticionCrearUsuario {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  roleId: string;
}

export interface PeticionActualizarUsuario {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  roleId: string;
  isActive: boolean;
  newPassword?: string;
}

export interface PeticionCrearRol {
  name: string;
  description: string;
  permissionCodes: string[];
}

export interface PeticionActualizarRol extends PeticionCrearRol {
  isActive: boolean;
}

export const servicioUsuarios = {
  obtenerUsuarios: async (): Promise<UsuarioGestion[]> => {
    const respuesta = await api.get<UsuarioGestion[]>('/users');
    return respuesta.data;
  },

  obtenerRoles: async (): Promise<RolGestion[]> => {
    const respuesta = await api.get<RolGestion[]>('/roles');
    return respuesta.data;
  },

  obtenerPermisos: async (): Promise<PermisoGestion[]> => {
    const respuesta = await api.get<PermisoGestion[]>('/roles/permissions');
    return respuesta.data;
  },

  crearUsuario: async (datos: PeticionCrearUsuario): Promise<UsuarioGestion> => {
    const respuesta = await api.post<UsuarioGestion>('/users', datos);
    return respuesta.data;
  },

  actualizarUsuario: async (id: string, datos: PeticionActualizarUsuario): Promise<UsuarioGestion> => {
    const respuesta = await api.put<UsuarioGestion>(`/users/${id}`, datos);
    return respuesta.data;
  },

  crearRol: async (datos: PeticionCrearRol): Promise<RolGestion> => {
    const respuesta = await api.post<RolGestion>('/roles', datos);
    return respuesta.data;
  },

  actualizarRol: async (id: string, datos: PeticionActualizarRol): Promise<RolGestion> => {
    const respuesta = await api.put<RolGestion>(`/roles/${id}`, datos);
    return respuesta.data;
  }
};
