import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PermisoGestion,
  PeticionActualizarRol,
  PeticionActualizarUsuario,
  PeticionCrearRol,
  PeticionCrearUsuario,
  RolGestion,
  servicioUsuarios,
  UsuarioGestion
} from '../../services/servicioUsuarios';
import { systemRoleNames } from '../../security/accessControl';
import ExportButtons from '../../components/export/ExportButtons';
import { ExportReportConfig } from '../../components/export/exportTypes';
import { evaluatePassword, isPasswordValid, PasswordRequirementStatus } from './passwordValidation';
import './PaginaUsuarios.css';

type Vista = 'usuarios' | 'roles';
type Aviso = { tipo: 'success' | 'error'; texto: string } | null;

const usuarioVacio = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  jobTitle: '',
  roleId: '',
  isActive: true
};

const rolVacio = {
  name: '',
  description: '',
  isActive: true,
  permissionCodes: [] as string[]
};

export const PaginaUsuarios: React.FC = () => {
  const { t } = useTranslation();
  const [vista, setVista] = useState<Vista>('usuarios');
  const [usuarios, setUsuarios] = useState<UsuarioGestion[]>([]);
  const [roles, setRoles] = useState<RolGestion[]>([]);
  const [permisos, setPermisos] = useState<PermisoGestion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [busqueda, setBusqueda] = useState('');

  const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioGestion | null>(null);
  const [formUsuario, setFormUsuario] = useState(usuarioVacio);
  const [userFormError, setUserFormError] = useState('');

  const [mostrarModalRol, setMostrarModalRol] = useState(false);
  const [rolEditando, setRolEditando] = useState<RolGestion | null>(null);
  const [formRol, setFormRol] = useState(rolVacio);

  const cargarDatos = async (mostrarCarga = true) => {
    try {
      if (mostrarCarga) setCargando(true);
      setAviso(null);
      const [usuariosApi, rolesApi, permisosApi] = await Promise.all([
        servicioUsuarios.obtenerUsuarios(),
        servicioUsuarios.obtenerRoles(),
        servicioUsuarios.obtenerPermisos()
      ]);
      setUsuarios(usuariosApi);
      setRoles(rolesApi);
      setPermisos(permisosApi);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error, t('usersLoadError')) });
    } finally {
      if (mostrarCarga) setCargando(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, []);

  useEffect(() => {
    if (!mostrarModalUsuario && !mostrarModalRol) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !guardando) {
        setMostrarModalUsuario(false);
        setMostrarModalRol(false);
      }
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', cerrarConEscape);
    };
  }, [mostrarModalUsuario, mostrarModalRol, guardando]);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    if (!termino) return usuarios;
    return usuarios.filter(usuario =>
      [usuario.fullName, usuario.username, usuario.email, usuario.jobTitle, usuario.roleName]
        .some(valor => valor.toLocaleLowerCase().includes(termino))
    );
  }, [busqueda, usuarios]);

  const userExportConfig = useMemo<ExportReportConfig<UsuarioGestion>>(() => ({
    moduleName: t('usersAndPermissionsTitle'),
    title: 'Catálogo de Usuarios',
    fileName: 'Usuarios',
    sheetName: 'Usuarios',
    orientation: 'landscape',
    filters: [{ label: 'Búsqueda', value: busqueda.trim() }],
    columns: [
      { key: 'name', label: 'Nombre', width: 1.25, value: user => user.fullName },
      { key: 'username', label: 'Usuario', width: 0.85, value: user => user.username },
      { key: 'email', label: 'Correo', width: 1.35, value: user => user.email },
      { key: 'jobTitle', label: 'Puesto', width: 1, value: user => user.jobTitle || t('notSpecified') },
      { key: 'role', label: 'Rol', width: 0.9, value: user => user.roleName },
      { key: 'status', label: 'Estado', width: 0.75, value: user => user.isActive ? t('activeAccount') : t('inactiveAccount') },
      { key: 'createdAt', label: 'Fecha de alta', type: 'datetime', width: 1.1, value: user => user.createdAtUtc }
    ]
  }), [busqueda, t]);

  const roleExportConfig = useMemo<ExportReportConfig<RolGestion>>(() => ({
    moduleName: t('rolesAndPermissionsTab'),
    title: 'Catálogo de Roles',
    fileName: 'Roles',
    sheetName: 'Roles',
    orientation: 'landscape',
    columns: [
      { key: 'name', label: 'Rol', width: 1, value: role => role.name },
      { key: 'description', label: 'Descripción', width: 1.7, value: role => role.description || t('noDescription') },
      { key: 'status', label: 'Estado', width: 0.75, value: role => role.isActive ? t('activeRole') : t('inactiveRole') },
      { key: 'system', label: 'Protegido por sistema', width: 0.9, value: role => role.isSystemRole ? 'Sí' : 'No' },
      { key: 'users', label: 'Usuarios asignados', type: 'number', width: 0.8, value: role => role.userCount },
      { key: 'permissions', label: 'Permisos asignados', type: 'number', width: 0.8, value: role => role.permissionCodes.length }
    ]
  }), [t]);

  const permisosPorModulo = useMemo(() => permisos.reduce<Record<string, PermisoGestion[]>>((grupos, permiso) => {
    (grupos[permiso.module] ??= []).push(permiso);
    return grupos;
  }, {}), [permisos]);

  const passwordStatus = evaluatePassword(formUsuario.password);
  const credentialCanSubmit = usuarioEditando
    ? formUsuario.password.length === 0 || isPasswordValid(formUsuario.password)
    : isPasswordValid(formUsuario.password);
  const passwordRequirementItems: Array<{ key: keyof PasswordRequirementStatus; label: string }> = [
    { key: 'length', label: t('passwordRequirementLength') },
    { key: 'uppercase', label: t('passwordRequirementUppercase') },
    { key: 'lowercase', label: t('passwordRequirementLowercase') },
    { key: 'number', label: t('passwordRequirementNumber') },
    { key: 'symbol', label: t('passwordRequirementSymbol') }
  ];

  const abrirNuevoUsuario = () => {
    const rolCajero = roles.find(rol => rol.isActive && rol.name === systemRoleNames.cashier);
    const primerRolActivo = roles.find(rol => rol.isActive);
    setUsuarioEditando(null);
    setFormUsuario({ ...usuarioVacio, roleId: rolCajero?.id ?? primerRolActivo?.id ?? '' });
    setAviso(null);
    setUserFormError('');
    setMostrarModalUsuario(true);
  };

  const abrirEditarUsuario = (usuario: UsuarioGestion) => {
    setUsuarioEditando(usuario);
    setFormUsuario({
      username: usuario.username,
      email: usuario.email,
      password: '',
      firstName: usuario.firstName,
      lastName: usuario.lastName,
      jobTitle: usuario.jobTitle,
      roleId: usuario.roleId,
      isActive: usuario.isActive
    });
    setAviso(null);
    setUserFormError('');
    setMostrarModalUsuario(true);
  };

  const guardarUsuario = async (event: React.FormEvent) => {
    event.preventDefault();
    const credentialMustBeValid = !usuarioEditando || formUsuario.password.length > 0;
    if (credentialMustBeValid && !isPasswordValid(formUsuario.password)) {
      setUserFormError(t('passwordRequirementsIncomplete'));
      return;
    }
    setGuardando(true);
    setAviso(null);
    setUserFormError('');
    try {
      if (usuarioEditando) {
        const payload: PeticionActualizarUsuario = {
          email: formUsuario.email,
          firstName: formUsuario.firstName,
          lastName: formUsuario.lastName,
          jobTitle: formUsuario.jobTitle,
          roleId: formUsuario.roleId,
          isActive: formUsuario.isActive,
          newPassword: formUsuario.password || undefined
        };
        await servicioUsuarios.actualizarUsuario(usuarioEditando.id, payload);
      } else {
        const payload: PeticionCrearUsuario = {
          username: formUsuario.username,
          email: formUsuario.email,
          password: formUsuario.password,
          firstName: formUsuario.firstName,
          lastName: formUsuario.lastName,
          jobTitle: formUsuario.jobTitle,
          roleId: formUsuario.roleId
        };
        await servicioUsuarios.crearUsuario(payload);
      }
      setMostrarModalUsuario(false);
      await cargarDatos(false);
      setAviso({ tipo: 'success', texto: t(usuarioEditando ? 'userUpdatedSuccess' : 'userCreatedSuccess') });
    } catch (error) {
      setUserFormError(mensajeDeError(error, t('userSaveError')));
    } finally {
      setGuardando(false);
    }
  };

  const abrirNuevoRol = () => {
    setRolEditando(null);
    setFormRol(rolVacio);
    setAviso(null);
    setMostrarModalRol(true);
  };

  const abrirEditarRol = (rol: RolGestion) => {
    setRolEditando(rol);
    setFormRol({
      name: rol.name,
      description: rol.description,
      isActive: rol.isActive,
      permissionCodes: [...rol.permissionCodes]
    });
    setAviso(null);
    setMostrarModalRol(true);
  };

  const alternarPermiso = (codigo: string) => {
    if (rolEditando?.name === systemRoleNames.administrator) return;
    setFormRol(actual => ({
      ...actual,
      permissionCodes: actual.permissionCodes.includes(codigo)
        ? actual.permissionCodes.filter(item => item !== codigo)
        : [...actual.permissionCodes, codigo]
    }));
  };

  const alternarModulo = (permisosModulo: PermisoGestion[]) => {
    if (rolEditando?.name === systemRoleNames.administrator) return;
    const codigos = permisosModulo.map(permiso => permiso.code);
    const todosSeleccionados = codigos.every(codigo => formRol.permissionCodes.includes(codigo));
    setFormRol(actual => ({
      ...actual,
      permissionCodes: todosSeleccionados
        ? actual.permissionCodes.filter(codigo => !codigos.includes(codigo))
        : Array.from(new Set([...actual.permissionCodes, ...codigos]))
    }));
  };

  const guardarRol = async (event: React.FormEvent) => {
    event.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      if (rolEditando) {
        const payload: PeticionActualizarRol = { ...formRol };
        await servicioUsuarios.actualizarRol(rolEditando.id, payload);
      } else {
        const payload: PeticionCrearRol = {
          name: formRol.name,
          description: formRol.description,
          permissionCodes: formRol.permissionCodes
        };
        await servicioUsuarios.crearRol(payload);
      }
      setMostrarModalRol(false);
      await cargarDatos(false);
      setAviso({ tipo: 'success', texto: t(rolEditando ? 'roleUpdatedSuccess' : 'roleCreatedSuccess') });
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error, t('roleSaveError')) });
    } finally {
      setGuardando(false);
    }
  };

  const formatRoleName = (roleName: string) => {
    const norm = (roleName || '').toLowerCase();
    if (norm === 'administrador') return t('roleAdmin');
    if (norm === 'cajero') return t('roleCashier');
    return roleName;
  };

  return (
    <section className="users-page">
      <header className="users-page__header">
        <div>
          <h1>👥 {t('usersAndPermissionsTitle')}</h1>
          <p>{t('usersAndPermissionsSubtitle')}</p>
        </div>
        <div className="users-page__header-actions">
          {vista === 'usuarios'
            ? <ExportButtons data={usuariosFiltrados} config={userExportConfig} />
            : <ExportButtons data={roles} config={roleExportConfig} />}
          <button className="action-btn" onClick={vista === 'usuarios' ? abrirNuevoUsuario : abrirNuevoRol}>
            {vista === 'usuarios' ? `➕ ${t('newUser')}` : `➕ ${t('newRole')}`}
          </button>
        </div>
      </header>

      <nav className="users-tabs" aria-label={t('usersAndRolesTabs')}>
        <button className={vista === 'usuarios' ? 'is-active' : ''} onClick={() => setVista('usuarios')}>
          {t('usersTab')} <span>{usuarios.length}</span>
        </button>
        <button className={vista === 'roles' ? 'is-active' : ''} onClick={() => setVista('roles')}>
          {t('rolesAndPermissionsTab')} <span>{roles.length}</span>
        </button>
      </nav>

      {aviso && <div className={`users-alert users-alert--${aviso.tipo}`} role="alert">{aviso.texto}</div>}

      {cargando ? (
        <div className="users-empty">{t('loading')}</div>
      ) : vista === 'usuarios' ? (
        <div className="users-panel">
          <div className="users-toolbar">
            <input
              className="input-field"
              type="search"
              value={busqueda}
              onChange={event => setBusqueda(event.target.value)}
              placeholder={t('searchUsersPlaceholder')}
              aria-label={t('searchUsersPlaceholder')}
            />
            <span>{t('recordsFound', { count: usuariosFiltrados.length })}</span>
          </div>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t('userEmployee')}</th>
                  <th>{t('email')}</th>
                  <th>{t('jobTitle')}</th>
                  <th>{t('systemRole')}</th>
                  <th>{t('status')}</th>
                  <th className="users-table__actions">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(usuario => (
                  <tr key={usuario.id}>
                    <td data-label={t('userEmployee')}>
                      <strong>{usuario.fullName}</strong>
                      <small>@{usuario.username}</small>
                    </td>
                    <td data-label={t('email')}>{usuario.email}</td>
                    <td data-label={t('jobTitle')}>{usuario.jobTitle || t('notSpecified')}</td>
                    <td data-label={t('systemRole')}><span className="users-role-badge">🛡️ {formatRoleName(usuario.roleName)}</span></td>
                    <td data-label={t('status')}>
                      <span className={`users-status users-status--${usuario.isActive ? 'active' : 'inactive'}`}>
                        {usuario.isActive ? t('activeAccount') : t('inactiveAccount')}
                      </span>
                    </td>
                    <td className="users-table__actions" data-label={t('actions')}>
                      <button className="users-secondary-btn" onClick={() => abrirEditarUsuario(usuario)}>{t('editUser')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usuariosFiltrados.length === 0 && <div className="users-empty">{t('noUsersFound')}</div>}
        </div>
      ) : (
        <div className="roles-grid">
          {roles.map(rol => (
            <article className={`role-card ${!rol.isActive ? 'role-card--inactive' : ''}`} key={rol.id}>
              <div className="role-card__title">
                <div>
                  <h2>{formatRoleName(rol.name)}</h2>
                  <span className={`users-status users-status--${rol.isActive ? 'active' : 'inactive'}`}>
                    {rol.isActive ? t('activeRole') : t('inactiveRole')}
                  </span>
                </div>
                {rol.isSystemRole && <span className="role-card__protected">🔒 {t('systemProtected')}</span>}
              </div>
              <p>{rol.description || t('noDescription')}</p>
              <dl>
                <div><dt>{t('assignedUsers')}</dt><dd>{rol.userCount}</dd></div>
                <div><dt>{t('assignedPermissions')}</dt><dd>{rol.permissionCodes.length}</dd></div>
              </dl>
              <button className="users-secondary-btn" onClick={() => abrirEditarRol(rol)}>
                {rol.isSystemRole ? t('viewRole') : t('editRole')}
              </button>
            </article>
          ))}
        </div>
      )}

      {mostrarModalUsuario && (
        <div className="users-modal-backdrop" role="presentation">
          <div className="users-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
            <div className="users-modal__header">
              <div>
                <h2 id="user-modal-title">{usuarioEditando ? t('editUserTitle') : t('newUserTitle')}</h2>
                <p>{t('userFormHint')}</p>
              </div>
              <button type="button" aria-label={t('close')} onClick={() => { setMostrarModalUsuario(false); setUserFormError(''); }}>×</button>
            </div>
            <form onSubmit={guardarUsuario} className="users-form">
              {userFormError && <div className="users-form__alert" role="alert">⚠️ {userFormError}</div>}
              <div className="users-form__grid">
                <label>{t('firstName')} *<input required minLength={2} value={formUsuario.firstName} onChange={event => setFormUsuario({ ...formUsuario, firstName: event.target.value })} /></label>
                <label>{t('lastName')} *<input required minLength={2} value={formUsuario.lastName} onChange={event => setFormUsuario({ ...formUsuario, lastName: event.target.value })} /></label>
                <label>{t('username')} *<input required minLength={3} disabled={!!usuarioEditando} autoComplete="off" value={formUsuario.username} onChange={event => setFormUsuario({ ...formUsuario, username: event.target.value })} /></label>
                <label>{t('email')} *<input required type="email" autoComplete="off" value={formUsuario.email} onChange={event => setFormUsuario({ ...formUsuario, email: event.target.value })} /></label>
                <label>{usuarioEditando ? t('newPasswordOptional') : `${t('password')} *`}<input required={!usuarioEditando} type="password" minLength={8} autoComplete="new-password" aria-describedby={!usuarioEditando || formUsuario.password.length > 0 ? 'password-requirements' : undefined} aria-invalid={formUsuario.password.length > 0 && !isPasswordValid(formUsuario.password)} value={formUsuario.password} onChange={event => { setFormUsuario({ ...formUsuario, password: event.target.value }); setUserFormError(''); }} /></label>
                <label>{t('jobTitle')}<input value={formUsuario.jobTitle} onChange={event => setFormUsuario({ ...formUsuario, jobTitle: event.target.value })} /></label>
                <label>{t('securityRole')} *
                  <select required value={formUsuario.roleId} onChange={event => setFormUsuario({ ...formUsuario, roleId: event.target.value })}>
                    <option value="">{t('selectRole')}</option>
                    {roles.filter(rol => rol.isActive || rol.id === formUsuario.roleId).map(rol => <option key={rol.id} value={rol.id}>{rol.name}</option>)}
                  </select>
                </label>
                {usuarioEditando && <label>{t('accountStatus')}
                  <select value={String(formUsuario.isActive)} onChange={event => setFormUsuario({ ...formUsuario, isActive: event.target.value === 'true' })}>
                    <option value="true">{t('activeAccount')}</option>
                    <option value="false">{t('inactiveAccount')}</option>
                  </select>
                </label>}
              </div>
              {(!usuarioEditando || formUsuario.password.length > 0) && <div id="password-requirements" className="users-password-help" aria-live="polite">
                <p>{t('passwordPolicy')}</p>
                <ul>
                  {passwordRequirementItems.map(requirement => {
                    const isMet = passwordStatus[requirement.key];
                    const stateClass = isMet ? 'is-met' : formUsuario.password.length > 0 ? 'is-missing' : 'is-pending';
                    return <li key={requirement.key} className={stateClass}><span aria-hidden="true">{isMet ? '✓' : '○'}</span>{requirement.label}</li>;
                  })}
                </ul>
              </div>}
              <div className="users-modal__actions">
                <button type="button" className="users-secondary-btn" disabled={guardando} onClick={() => { setMostrarModalUsuario(false); setUserFormError(''); }}>{t('cancel')}</button>
                <button type="submit" className="action-btn" disabled={guardando || !credentialCanSubmit}>{guardando ? t('saving') : t('saveUser')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalRol && (
        <div className="users-modal-backdrop" role="presentation">
          <div className="users-modal users-modal--wide" role="dialog" aria-modal="true" aria-labelledby="role-modal-title">
            <div className="users-modal__header">
              <div>
                <h2 id="role-modal-title">{rolEditando ? t('editRoleTitle') : t('newRoleTitle')}</h2>
                <p>{rolEditando?.isSystemRole ? t('protectedRoleHint') : t('roleFormHint')}</p>
              </div>
              <button type="button" aria-label={t('close')} onClick={() => setMostrarModalRol(false)}>×</button>
            </div>
            <form onSubmit={guardarRol} className="users-form">
              <div className="users-form__grid users-form__grid--role">
                <label>{t('roleName')} *<input required minLength={2} disabled={rolEditando?.name === systemRoleNames.administrator || rolEditando?.name === systemRoleNames.cashier} value={formRol.name} onChange={event => setFormRol({ ...formRol, name: event.target.value })} /></label>
                <label>{t('roleStatus')}
                  <select disabled={rolEditando?.name === systemRoleNames.administrator} value={String(formRol.isActive)} onChange={event => setFormRol({ ...formRol, isActive: event.target.value === 'true' })}>
                    <option value="true">{t('activeRole')}</option>
                    <option value="false">{t('inactiveRole')}</option>
                  </select>
                </label>
                <label className="users-form__full">{t('roleDescription')}<textarea rows={2} maxLength={250} disabled={rolEditando?.name === systemRoleNames.administrator} value={formRol.description} onChange={event => setFormRol({ ...formRol, description: event.target.value })} /></label>
              </div>

              <div className="permissions-header">
                <div><h3>{t('permissionMatrix')}</h3><p>{t('permissionMatrixHint')}</p></div>
                <strong>{t('permissionsSelected', { count: formRol.permissionCodes.length })}</strong>
              </div>
              <div className="permissions-grid">
                {Object.entries(permisosPorModulo).map(([modulo, permisosModulo]) => {
                  const todosSeleccionados = permisosModulo.every(permiso => formRol.permissionCodes.includes(permiso.code));
                  return <fieldset key={modulo} className="permission-group" disabled={rolEditando?.name === systemRoleNames.administrator}>
                    <legend>
                      <label><input type="checkbox" disabled={rolEditando?.name === systemRoleNames.administrator} checked={todosSeleccionados} onChange={() => alternarModulo(permisosModulo)} /> {nombreModulo(modulo, t)}</label>
                    </legend>
                    {permisosModulo.map(permiso => <label key={permiso.id} className="permission-item">
                      <input type="checkbox" disabled={rolEditando?.name === systemRoleNames.administrator} checked={formRol.permissionCodes.includes(permiso.code)} onChange={() => alternarPermiso(permiso.code)} />
                      <span><strong>{permiso.description}</strong><small>{permiso.code}</small></span>
                    </label>)}
                  </fieldset>;
                })}
              </div>

              <div className="users-modal__actions">
                <button type="button" className="users-secondary-btn" disabled={guardando} onClick={() => setMostrarModalRol(false)}>{t('cancel')}</button>
                <button type="submit" className="action-btn" disabled={guardando}>{guardando ? t('saving') : t('saveRole')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

const mensajeDeError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const nombreModulo = (modulo: string, t: (key: string) => string) => {
  const claves: Record<string, string> = {
    ventas: 'permissionModuleSales',
    caja: 'permissionModuleCash',
    catalogo: 'permissionModuleCatalog',
    inventario: 'permissionModuleInventory',
    clientes: 'permissionModuleCustomers',
    comercial: 'permissionModuleCommercial',
    reportes: 'permissionModuleReports',
    usuarios: 'permissionModuleUsers'
  };
  return t(claves[modulo] ?? modulo);
};
