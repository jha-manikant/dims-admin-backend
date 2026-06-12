import { Router } from 'express';
import { labsRouter } from './labs.routes.js';

/**
 * Aggregator router for everything that proxies to the DIMS .NET API.
 *
 * Sub-routers use `services/dims.services.ts` (the `callDims` helper) to
 * talk to DIMS. Add new DIMS-facing routers here as they land
 * (reports, users-in-dims, etc).
 */
export const dimsProxyRouter = Router();

dimsProxyRouter.use('/labs', labsRouter);
// Future DIMS-proxied modules wire up here:
//   dimsProxyRouter.use('/reports', reportsRouter);
