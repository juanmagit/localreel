import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { App } from './App';
import { CatalogPage } from './pages/CatalogPage';
import { WatchPage } from './pages/WatchPage';
import { LoginPage } from './pages/LoginPage';

export const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CatalogPage,
});

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watch/$mediaId',
  component: WatchPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const routeTree = rootRoute.addChildren([indexRoute, watchRoute, loginRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
