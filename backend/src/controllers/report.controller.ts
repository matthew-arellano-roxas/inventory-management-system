import { StatusCodes } from 'http-status-codes';
import createHttpError from 'http-errors';
import { ok } from '@/helpers/response';
import { Controller } from '@/types/controller.type';
import { reportService } from '@/services';
import { DailyReportQuery, ProductReportQuery } from '@/types/report.types';

const PRODUCT_REPORT_PAGE_SIZE = 30;

// Get monthly reports
const getMonthlyReport: Controller = async (req, res, _next) => {
  const reports = await reportService.getMonthlyReports();
  res.status(StatusCodes.OK).json(ok(reports, 'Monthly report retrieved'));
};

const parseDailyReportQuery = (input: Record<string, unknown>) => {
  const { branchId } = input;
  const query: DailyReportQuery = {};

  if (typeof branchId === 'string' && branchId.trim() !== '') {
    const parsedBranchId = Number(branchId);

    if (Object.is(parsedBranchId, NaN) || parsedBranchId <= 0) {
      throw new createHttpError.BadRequest('Please provide a valid branchId query');
    }

    query.branchId = parsedBranchId;
  }

  return query;
};

const getDailyReport: Controller = async (req, res, _next) => {
  const query = parseDailyReportQuery(req.query);
  const reports = await reportService.getDailyReports(query);
  res.status(StatusCodes.OK).json(ok(reports, 'Daily report retrieved'));
};

const getCurrentDayReport: Controller = async (req, res, _next) => {
  const query = parseDailyReportQuery(req.query);
  const reports = await reportService.getCurrentDayReport(query);
  res.status(StatusCodes.OK).json(ok(reports, 'Current day report retrieved'));
};

// Get current month report
const getCurrentMonthReport: Controller = async (req, res, _next) => {
  const reports = await reportService.getCurrentMonthReport();
  res.status(StatusCodes.OK).json(ok(reports, 'Current month report retrieved'));
};

// Get product reports
const parseProductReportQuery = (input: Record<string, unknown>) => {
  const { product_details, search, page, limit, productId, branchId } = input;
  const query: ProductReportQuery = {};

  if (typeof product_details === 'string') {
    query.product_details = product_details === 'true';
  }

  if (typeof search === 'string' && search.trim() !== '') {
    query.search = search.trim();
  }

  if (typeof page === 'string' && page.trim() !== '') {
    const parsedPage = Number(page);
    if (Object.is(parsedPage, NaN) || parsedPage <= 0) {
      throw new createHttpError.BadRequest('Please provide a valid page query');
    }
    query.page = parsedPage;
  }

  if (typeof limit === 'string' && limit.trim() !== '') {
    const parsedLimit = Number(limit);
    if (Object.is(parsedLimit, NaN) || parsedLimit <= 0) {
      throw new createHttpError.BadRequest('Please provide a valid limit query');
    }
    query.limit = parsedLimit;
  }

  if (typeof productId === 'string' && productId.trim() !== '') {
    const parsedProductId = Number(productId);
    if (Object.is(parsedProductId, NaN) || parsedProductId <= 0) {
      throw new createHttpError.BadRequest('Please provide a valid productId query');
    }
    query.productId = parsedProductId;
  }

  if (typeof branchId === 'string' && branchId.trim() !== '') {
    const parsedBranchId = Number(branchId);
    if (Object.is(parsedBranchId, NaN) || parsedBranchId <= 0) {
      throw new createHttpError.BadRequest('Please provide a valid branchId query');
    }
    query.branchId = parsedBranchId;
  }

  return query;
};

const getProductReport: Controller = async (req, res, _next) => {
  const query = parseProductReportQuery(req.query);

  const reports = await reportService.getProductReports(query);

  if (query.page != null) {
    const totalItems = await reportService.getProductReportCount(query);
    res.status(StatusCodes.OK).json(
      ok(reports, 'Product report retrieved', {
        page: query.page,
        pageSize: PRODUCT_REPORT_PAGE_SIZE,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / PRODUCT_REPORT_PAGE_SIZE)),
      }),
    );
    return;
  }

  res.status(StatusCodes.OK).json(ok(reports, 'Product report retrieved'));
};

const getProductReportSummary: Controller = async (req, res, _next) => {
  const query = parseProductReportQuery(req.query);
  delete query.page;
  delete query.product_details;

  const summary = await reportService.getProductReportSummary(query);
  res.status(StatusCodes.OK).json(ok(summary, 'Product report summary retrieved'));
};

// Get product report by product ID
const getProductReportByProductId: Controller = async (req, res, _next) => {
  const productId = Number(req.params.productId);

  if (Object.is(productId, NaN)) {
    throw new createHttpError.BadRequest('Please provide a valid product id');
  }

  const reports = await reportService.getProductReportByProductId(productId);
  res.status(StatusCodes.OK).json(ok(reports, `Report for product ${productId} retrieved`));
};

// Get branch reports
const getBranchReport: Controller = async (req, res, _next) => {
  const reports = await reportService.getBranchReports();
  res.status(StatusCodes.OK).json(ok(reports, 'Branch report retrieved'));
};

// Get branch report by branch ID
const getFinancialReportByBranchId: Controller = async (req, res, _next) => {
  const branchId = Number(req.params.branchId);
  if (Object.is(branchId, NaN)) {
    throw new createHttpError.BadRequest('Please provide a valid branch id');
  }
  const financialReport = await reportService.getFinancialReportByBranchId(branchId);
  res.status(StatusCodes.OK).json(ok(financialReport, `Report for branch ${branchId} retrieved`));
};

const getBranchFinancialReportList: Controller = async (req, res, _next) => {
  const reports = await reportService.getFinancialReportList();
  res.status(StatusCodes.OK).json(ok(reports, 'Branch Financial Report List retrieved'));
};

export const reportController = {
  getMonthlyReport,
  getDailyReport,
  getCurrentDayReport,
  getCurrentMonthReport,
  getProductReport,
  getProductReportSummary,
  getProductReportByProductId,
  getBranchReport,
  getFinancialReportByBranchId,
  getBranchFinancialReportList,
};
