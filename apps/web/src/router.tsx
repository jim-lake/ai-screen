import type { RouteObject } from 'react-router';

import Loading from './loading';
import Home from './home';

import Api from './tools/api';
import { herdOnce, getVersion } from './tools/util';
import { log, errorLog } from './tools/log';

const _globalLoader = herdOnce(async () => {
  log('router._globalLoader:', getVersion());
  try {
    await Api.init();
    log('router._globalLoader: startup done');
  } catch (e) {
    errorLog('router._globalLoader: threw:', e);
  }
  return null;
});
export const routes: RouteObject[] = [
  {
    path: '/',
    loader: _globalLoader,
    HydrateFallback: Loading,
    children: [{ index: true, Component: Home }],
  },
  { path: '*', lazy: () => import('./not_found.tsx') },
];
