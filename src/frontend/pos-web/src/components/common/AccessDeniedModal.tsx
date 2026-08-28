import React from 'react';
import { useTranslation } from 'react-i18next';
import './AccessDeniedModal.css';

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName?: string;
  customMessage?: string;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  onClose,
  moduleName,
  customMessage
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="access-denied-backdrop" role="presentation" onClick={onClose}>
      <div className="access-denied-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="access-denied-header">
          <span className="access-denied-icon">⚠️</span>
          <h2>{t('accessDeniedTitle', 'Acceso Restringido')}</h2>
        </div>

        <div className="access-denied-body">
          <p>
            {customMessage || (
              moduleName
                ? t('accessDeniedModuleMessage', { module: moduleName, defaultValue: `No cuenta con permisos de seguridad suficientes para acceder al módulo "${moduleName}".` })
                : t('accessDeniedDefaultMessage', 'No cuenta con los permisos necesarios para realizar esta acción o visualizar este módulo.')
            )}
          </p>
          <small className="access-denied-hint">
            {t('accessDeniedHint', 'Consulte con un Administrador del sistema si requiere la asignación de este permiso.')}
          </small>
        </div>

        <div className="access-denied-actions">
          <button type="button" className="action-btn access-denied-btn" onClick={onClose}>
            {t('understood', 'Entendido')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedModal;
