import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

const AuthContext = createContext(null);

/**
 * AuthProvider - провайдер контекста авторизации
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(false);

  // Синхронизация с localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  /**
   * Вход в систему
   */
  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка входа'
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Регистрация
   */
  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка регистрации'
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Выход из системы
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  /**
   * Обновление данных пользователя
   */
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    token,
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook - доступ к контексту авторизации
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}

export default useAuth;
