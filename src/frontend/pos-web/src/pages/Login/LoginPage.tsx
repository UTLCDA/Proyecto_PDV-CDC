import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState('admin@lambrin.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(emailOrUsername, password);
    } catch (err: any) {
      setError(err.message || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h2>{t('loginTitle')}</h2>
          <p>{t('loginSubtitle')}</p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('emailOrUsername')}</label>
            <input
              id="email"
              type="text"
              className="form-control"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              placeholder="admin@lambrin.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('loggingIn') : t('loginButton')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
