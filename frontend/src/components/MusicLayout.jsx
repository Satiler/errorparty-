import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Music, Radio, Compass, ListMusic, TrendingUp, Clock } from 'lucide-react';
import './MusicLayout.css';

const MusicLayout = () => {
  const location = useLocation();

  const navigationItems = [
    { path: '/music', icon: Home, label: 'Главная', exact: true },
    { path: '/music/library', icon: Music, label: 'Библиотека' },
    { path: '/music/playlists', icon: ListMusic, label: 'Плейлисты' },
    { path: '/music/radio', icon: Radio, label: 'Радио' },
    { path: '/music/discover', icon: Compass, label: 'Обзор' }
  ];

  const quickLinks = [
    { path: '/music/discover-weekly', icon: Compass, label: 'Discover Weekly' },
    { path: '/music/smart-mixes', icon: Clock, label: 'Smart Mixes' },
    { path: '/music/trending', icon: TrendingUp, label: 'В тренде' }
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Генерация breadcrumbs
  const generateBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Музыка', path: '/music' }];

    if (pathParts.length > 1) {
      const section = pathParts[1];
      const sectionMap = {
        library: 'Библиотека',
        playlists: 'Плейлисты',
        radio: 'Радио',
        discover: 'Обзор',
        'discover-weekly': 'Discover Weekly',
        'smart-mixes': 'Smart Mixes',
        trending: 'В тренде'
      };

      if (sectionMap[section]) {
        breadcrumbs.push({
          label: sectionMap[section],
          path: `/music/${section}`
        });
      }

      // Добавляем подразделы если есть
      if (pathParts.length > 2) {
        const subsection = pathParts[2];
        breadcrumbs.push({
          label: decodeURIComponent(subsection),
          path: location.pathname
        });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className="music-layout">
      {/* Sidebar Navigation */}
      <aside className="music-sidebar">
        <nav className="music-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">Навигация</h3>
            <ul className="nav-list">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`nav-link ${active ? 'active' : ''}`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="nav-section">
            <h3 className="nav-section-title">Быстрый доступ</h3>
            <ul className="nav-list">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`nav-link ${active ? 'active' : ''}`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="music-content">
        {/* Breadcrumbs */}
        <div className="breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="breadcrumb-item">
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              {index === breadcrumbs.length - 1 ? (
                <span className="breadcrumb-current">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="breadcrumb-link">
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Page Content */}
        <div className="music-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MusicLayout;
