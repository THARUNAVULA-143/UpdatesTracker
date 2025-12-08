// src/routes/reportRoutes.js

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const exportController = require('../controllers/exportController');

// ============================================
// REPORT CRUD ROUTES
// ============================================

/**
 * POST /api/reports/format
 * Format raw text into structured report (PREVIEW - No Save)
 */
router.post('/format', reportController.formatReport);

/**
 * POST /api/reports
 * Create and save a new report to database
 */
router.post('/', reportController.createReport);

/**
 * GET /api/reports
 * Get all reports (sorted by date, newest first)
 */
router.get('/', reportController.getAllReports);

// ============================================
// EXPORT ROUTES (MUST BE BEFORE /:id ROUTES)
// ============================================

/**
 * GET /api/reports/export/csv
 * Export reports as CSV
 * Query params: ?months=3 OR ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/export/csv', exportController.exportCSV);

/**
 * GET /api/reports/export/pdf
 * Export reports as PDF
 * Query params: ?months=3 OR ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/export/pdf', exportController.exportPDF);

/**
 * GET /api/reports/export/excel
 * Export reports as Excel
 * Query params: ?months=3 OR ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/export/excel', exportController.exportExcel);

// ============================================
// ADDITIONAL ROUTES (BEFORE /:id)
// ============================================

/**
 * GET /api/reports/range
 * Get reports by date range
 * Query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/range', reportController.getReportsByDateRange);

/**
 * GET /api/reports/models
 * Get available AI models
 */
router.get('/models', reportController.getAvailableModels);

// ============================================
// REPORT ID ROUTES (MUST BE AFTER SPECIFIC ROUTES)
// ============================================

/**
 * GET /api/reports/:id
 * Get a single report by ID
 */
router.get('/:id', reportController.getReportById);

/**
 * PUT /api/reports/:id
 * Update an existing report
 */
router.put('/:id', reportController.updateReport);

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
router.delete('/:id', reportController.deleteReport);

module.exports = router;