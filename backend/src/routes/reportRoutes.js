const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.post('/format', reportController.formatReportOnly);

// Create a new report
router.post('/', reportController.createReport);

// Get all reports
router.get('/', reportController.getAllReports);


router.get('/models', reportController.getAvailableModels);


//Get a report by date range
router.get('/range', reportController.getReportsByDateRange);

// Get a single report by ID
router.get('/:id', reportController.getReportById);

// Update a report by ID
router.put('/:id', reportController.updateReportById);

// Delete a report by ID
router.delete('/:id', reportController.deleteReportById);

module.exports = router;