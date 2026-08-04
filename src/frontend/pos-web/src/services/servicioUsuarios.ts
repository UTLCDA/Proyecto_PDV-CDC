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
  roles: string[];
  createdAtUtc: string;
}

export interface PeticionCrearUsuario {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  roleName: string;
}

export interface PeticionActualizarUsuario {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  roleName: string;
  isActive: boolean;
  newPassword?: string;
}

export const servicioUsuarios = {
  obtenerUsuarios: async (): Promise<UsuarioGestion[]> => {
    const respuesta = await api.get<UsuarioGestion[]>('/users');
    return respuesta.data;
  },

  crearUsuario: async (datos: PeticionCrearUsuario): Promise<UsuarioGestion> => {
    const respuesta = await api.post<UsuarioGestion>('/users', datos);
    return respuesta.data;
  },

  actualizarUsuario: async (id: string, datos: PeticionActualizarUsuario): Promise<UsuarioGestion> => {
    const respuesta = await api.put<UsuarioGestion>(`/users/${id}`, datos);
    return respuesta.data;
  }
};
