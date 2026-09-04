export type AppTab =
  | 'pos'
  | 'sales'
  | 'shift'
  | 'reports'
  | 'quotes'
  | 'commercial'
  | 'transactions'
  | 'returns'
  | 'contracts'
  | 'catalog'
  | 'categories'
  | 'inventory'
  | 'inventory-movements'
  | 'customers'
  | 'users'
  | 'audit'
  | 'profile';

export const systemRoleNames = {
  administrator: 'Administrador',
  cashier: 'Cajero'
} as const;

export const permissionCodes = {
  salesProcess: 'ventas:procesar',
  cashOpen: 'caja:aperturar',
  cashClose: 'caja:cerrar',
  cashZReport: 'caja:corte_z',
  cashWithdrawal: 'caja:sangria',
  reportsSalesView: 'reportes:ver_ventas',
  reportsInventoryView: 'reportes:ver_inventario',
  commercialInstallments: 'comercial:abonos',
  commercialReturns: 'comercial:devoluciones',
  commercialQuotes: 'comercial:cotizaciones',
  commercialContracts: 'comercial:contratos',
  catalogProductsCreate: 'catalogo:productos_crear',
  catalogProductsEdit: 'catalogo:productos_editar',
  catalogCategoriesCreate: 'catalogo:categorias_crear',
  inventoryView: 'inventario:ver',
  inventoryMovements: 'inventario:movimientos',
  customersCreate: 'clientes:crear',
  customersEdit: 'clientes:editar',
  usersAdminister: 'usuarios:administrar'
} as const;

const tabPermissions: Record<Exclude<AppTab, 'profile'>, readonly string[]> = {
  pos: [permissionCodes.salesProcess],
  sales: [permissionCodes.reportsSalesView],
  shift: [
    permissionCodes.cashOpen,
    permissionCodes.cashClose,
    permissionCodes.cashZReport,
    permissionCodes.cashWithdrawal
  ],
  reports: [permissionCodes.reportsSalesView, permissionCodes.reportsInventoryView],
  quotes: [permissionCodes.commercialQuotes],
  commercial: [permissionCodes.commercialInstallments],
  transactions: [permissionCodes.reportsSalesView, permissionCodes.usersAdminister],
  returns: [permissionCodes.commercialReturns],
  contracts: [permissionCodes.commercialContracts],
  catalog: [
    permissionCodes.catalogProductsCreate,
    permissionCodes.catalogProductsEdit,
    permissionCodes.catalogCategoriesCreate
  ],
  categories: [
    permissionCodes.catalogCategoriesCreate,
    permissionCodes.catalogProductsCreate,
    permissionCodes.catalogProductsEdit,
    permissionCodes.usersAdminister
  ],
  inventory: [permissionCodes.inventoryView],
  'inventory-movements': [permissionCodes.inventoryMovements],
  customers: [permissionCodes.customersCreate, permissionCodes.customersEdit],
  users: [permissionCodes.usersAdminister],
  audit: [permissionCodes.usersAdminister]
};

export const canAccessTab = (permissions: readonly string[], tab: AppTab): boolean => {
  if (tab === 'profile') {
    return true;
  }

  const normalizedPermissions = new Set(permissions.map(permission => permission.toLowerCase()));
  return tabPermissions[tab].some(permission => normalizedPermissions.has(permission));
};

export const getDefaultTab = (permissions: readonly string[]): AppTab =>
  canAccessTab(permissions, 'pos') ? 'pos' : 'profile';
