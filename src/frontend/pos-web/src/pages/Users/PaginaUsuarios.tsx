import React, { useState, useEffect } from 'react';
import { servicioUsuarios, UsuarioGestion, PeticionCrearUsuario, PeticionActualizarUsuario } from '../../services/servicioUsuarios';

export const PaginaUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioGestion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioGestion | null>(null);

  const [formState, setFormState] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    jobTitle: 'Cajero / Vendedor',
    roleName: 'Cajero',
    isActive: true
  });

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      setError(null);
      const datos = await servicioUsuarios.obtenerUsuarios();
      setUsuarios(datos);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el directorio de usuarios.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const abrirNuevoUsuario = () => {
    setUsuarioEditando(null);
    setFormState({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      jobTitle: 'Cajero / Vendedor',
      roleName: 'Cajero',
      isActive: true
    });
    setMostrarModal(true);
  };

  const abrirEditarUsuario = (user: UsuarioGestion) => {
    setUsuarioEditando(user);
    setFormState({
      username: user.username,
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle,
      roleName: user.roles[0] || 'Cajero',
      isActive: user.isActive
    });
    setMostrarModal(true);
  };

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (usuarioEditando) {
        const payload: PeticionActualizarUsuario = {
          email: formState.email,
          firstName: formState.firstName,
          lastName: formState.lastName,
          jobTitle: formState.jobTitle,
          roleName: formState.roleName,
          isActive: formState.isActive,
          newPassword: formState.password ? formState.password : undefined
        };
        await servicioUsuarios.actualizarUsuario(usuarioEditando.id, payload);
      } else {
        const payload: PeticionCrearUsuario = {
          username: formState.username,
          email: formState.email,
          password: formState.password,
          firstName: formState.firstName,
          lastName: formState.lastName,
          jobTitle: formState.jobTitle,
          roleName: formState.roleName
        };
        await servicioUsuarios.crearUsuario(payload);
      }
      setMostrarModal(false);
      cargarUsuarios();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ocurrió un error al guardar el usuario.');
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>👥 Gestión de Usuarios y Permisos</h1>
          <p style={{ color: 'var(--color-texto-secundario, #9ca3af)', margin: '0.25rem 0 0 0' }}>
            Administración de cuentas de acceso, roles (Administrador / Cajero) y personal de WPC Bajío.
          </p>
        </div>
        <button
          onClick={abrirNuevoUsuario}
          style={{
            backgroundColor: 'var(--color-primario, #3b82f6)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            padding: '0.625rem 1.25rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ➕ Nuevo Usuario / Empleado
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-texto-secundario, #9ca3af)' }}>
          Cargando directorio de usuarios...
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--color-tarjeta-bg, #1f2937)', borderRadius: '0.5rem', border: '1px solid var(--color-borde, #374151)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--color-borde, #374151)' }}>
                <th style={{ padding: '0.875rem 1rem' }}>Usuario / Empleado</th>
                <th style={{ padding: '0.875rem 1rem' }}>Correo Electrónico</th>
                <th style={{ padding: '0.875rem 1rem' }}>Puesto</th>
                <th style={{ padding: '0.875rem 1rem' }}>Rol de Sistema</th>
                <th style={{ padding: '0.875rem 1rem' }}>Estado</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-borde, #374151)' }}>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>
                    {u.fullName}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-texto-secundario, #9ca3af)' }}>@{u.username}</div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>{u.email}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>{u.jobTitle}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{
                      backgroundColor: u.roles.includes('Administrador') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: u.roles.includes('Administrador') ? '#60a5fa' : '#34d399',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }}>
                      🛡️ {u.roles.join(', ') || 'Cajero'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ color: u.isActive ? '#34d399' : '#f87171', fontWeight: 600 }}>
                      {u.isActive ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => abrirEditarUsuario(u)}
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--color-primario, #3b82f6)',
                        border: '1px solid var(--color-primario, #3b82f6)',
                        borderRadius: '0.25rem',
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Editar / Rol
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal ABC de Usuario */}
      {mostrarModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--color-tarjeta-bg, #1f2937)',
            borderRadius: '0.5rem',
            border: '1px solid var(--color-borde, #374151)',
            width: '100%',
            maxWidth: '550px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-borde, #374151)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>
                {usuarioEditando ? `✏️ Editar Usuario: @${usuarioEditando.username}` : '➕ Nuevo Usuario de Sistema WPC Bajío'}
              </h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={guardarUsuario} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nombre(s) *</label>
                  <input
                    type="text"
                    required
                    value={formState.firstName}
                    onChange={(e) => setFormState({ ...formState, firstName: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'var(--color-input-bg, #111827)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Apellido(s) *</label>
                  <input
                    type="text"
                    required
                    value={formState.lastName}
                    onChange={(e) => setFormState({ ...formState, lastName: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'var(--color-input-bg, #111827)', color: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nombre de Usuario *</label>
                  <input
                    type="text"
                    required
                    disabled={!!usuarioEditando}
                    value={formState.username}
                    onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'var(--color-input-bg, #111827)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'var(--color-input-bg, #111827)', color: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {usuarioEditando ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso *'}
                  </label>
                  <input
                    type="password"
                    required={!usuarioEditando}
                    placeholder={usuarioEditando ? 'Dejar en blanco para mantener' : '••••••••'}
                    value={formState.password}
                    onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'var(--color-input-bg, #111827)', color: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Puesto / Función</label>
                  <input
                    type="text"
                    value={formState.jobTitle}
                    onChange={(e) => setFormState({ ...formState, jobTitle: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'var(--color-input-bg, #111827)', color: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Rol de Seguridad *</label>
                  <select
                    value={formState.roleName}
                    onChange={(e) => setFormState({ ...formState, roleName: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'var(--color-input-bg, #111827)', color: 'inherit' }}
                  >
                    <option value="Administrador">🛡️ Administrador (Acceso Total)</option>
                    <option value="Cajero">💳 Cajero (Ventas, Caja y PDV)</option>
                  </select>
                </div>
                {usuarioEditando && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Estado de Cuenta</label>
                    <select
                      value={formState.isActive ? 'true' : 'false'}
                      onChange={(e) => setFormState({ ...formState, isActive: e.target.value === 'true' })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'var(--color-input-bg, #111827)', color: 'inherit' }}
                    >
                      <option value="true">🟢 Cuenta Activa</option>
                      <option value="false">🔴 Cuenta Desactivada</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', border: '1px solid var(--color-borde, #374151)', backgroundColor: 'transparent', color: 'inherit', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '0.25rem', border: 'none', backgroundColor: 'var(--color-primario, #3b82f6)', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  💾 Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
