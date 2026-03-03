import { Router } from 'express';
import { reportController } from '@/controllers/report.controller';
import { cacheMiddleware } from '@/middlewares/cache';
import { TTL } from '@/enums';
import { checkPermissions } from '@/middlewares';

const reportRoute: Router = Router();

reportRoute.use(checkPermissions(['read:report']));
reportRoute.use(cacheMiddleware(TTL.ONE_MINUTE));

// Monthly
reportRoute.get('/monthly', reportController.getMonthlyReport);
reportRoute.get('/daily', reportController.getDailyReport);
reportRoute.get('/current-day', reportController.getCurrentDayReport);
reportRoute.get('/current-month', reportController.getCurrentMonthReport);

// Product
reportRoute.get('/product', reportController.getProductReport);
reportRoute.get('/product-summary', reportController.getProductReportSummary);
reportRoute.get('/product/:productId', reportController.getProductReportByProductId);

// Branch
reportRoute.get('/branch', reportController.getBranchReport);
reportRoute.get('/branch-list', reportController.getBranchFinancialReportList);
reportRoute.get('/branch/:branchId', reportController.getFinancialReportByBranchId);

export { reportRoute };
