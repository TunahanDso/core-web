/* Before first paint: preferences live on the document, not a replaceable RSC shell. */
(() => {
  if (!location.pathname.startsWith('/portal')) return;
  const root = document.documentElement;
  let theme = 'system', density = 'comfortable', sidebar = '0';
  try {
    theme = localStorage.getItem('core.portal.theme') || theme;
    density = localStorage.getItem('core.portal.density') || density;
    sidebar = localStorage.getItem('core.portal.sidebar.collapsed') || sidebar;
  } catch { /* Storage can be unavailable in private WebViews. */ }
  root.dataset.portalThemePreference = ['light', 'dark', 'aurora'].includes(theme) ? theme : 'system';
  root.dataset.portalTheme = theme === 'aurora' ? 'aurora' : theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  root.dataset.density = density === 'compact' ? 'compact' : 'comfortable';
  root.dataset.portalSidebar = sidebar === '1' ? 'collapsed' : 'expanded';
})();
