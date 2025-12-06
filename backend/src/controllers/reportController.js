const Report = require('../models/Report');
const huggingFaceService = require('../services/huggingface');
const { startOfDay, endOfDay } = require('date-fns');

/**
 * CREATE: Generate and save new report
 * 
 * Flow:
 * 1. Receive raw speech inputs from frontend
 * 2. Build prompt for AI
 * 3. Call Hugging Face to format text professionally
 * 4. Save to MongoDB
 * 5. Return formatted report to frontend
 * 
 * POST /api/reports
 */
exports.createReport = async (req, res) => {
  try {
    console.log('Creating new report...');
    
    // Get data from request body
    const { rawInputs, llmModel, title } = req.body;

    // Validation: Must have at least one input
    if (
      !rawInputs ||
      (!rawInputs.accomplishments &&
       !rawInputs.inProgress &&
       !rawInputs.blockers &&
       !rawInputs.notes)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field (accomplishments, inProgress, blockers, or notes)',
      });
    }

    console.log(' Raw inputs received:', {
      accomplishments: rawInputs.accomplishments ? '✓' : '✗',
      inProgress: rawInputs.inProgress ? '✓' : '✗',
      blockers: rawInputs.blockers ? '✓' : '✗',
      notes: rawInputs.notes ? '✓' : '✗',
    });

    // Build prompt for AI
    const prompt = `You are a professional assistant. Generate a concise, well-formatted daily status report based on these updates. Use proper grammar, complete sentences, and professional language.

${rawInputs.accomplishments ? `Accomplishments:\n${rawInputs.accomplishments}\n\n` : ''}
${rawInputs.inProgress ? `In Progress:\n${rawInputs.inProgress}\n\n` : ''}
${rawInputs.blockers ? `Blockers:\n${rawInputs.blockers}\n\n` : ''}
${rawInputs.notes ? `Additional Notes:\n${rawInputs.notes}\n\n` : ''}

Create a professional status report with clear sections and bullet points. Make the language polished and concise.`;

    console.log('🤖 Sending to AI for formatting...');

    // Call Hugging Face to generate formatted report
    const formattedReport = await huggingFaceService.generateReport(
      prompt,
      llmModel || 'meta-llama/Llama-3.2-3B-Instruct'
    );

    console.log('✅ AI formatting complete');

    // Save to MongoDB
    const report = new Report({
      rawInputs,
      formattedReport,
      llmModel: llmModel || 'meta-llama/Llama-3.2-3B-Instruct',
      title: title || `Daily Report - ${new Date().toLocaleDateString()}`,
    });

    await report.save();

    console.log('💾 Saved to database:', report._id);

    // Send response to frontend
    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report,
    });
    
  } catch (error) {
    console.error(' Error creating report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create report',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * READ: Get all reports
 * 
 * Returns all reports sorted by newest first
 * Limits to 100 most recent reports
 * 
 * GET /api/reports
 */
exports.getAllReports = async (req, res) => {
  try {
    console.log('Fetching all reports...');
    
    // Get all reports, sorted by creation date (newest first)
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 reports for performance

    console.log(`✅ Found ${reports.length} reports`);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
    
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
    });
  }
};

/**
 * READ: Get single report by ID
 * 
 * GET /api/reports/:id
 */
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(` Fetching report: ${id}`);

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    console.log('✅ Report found');

    res.status(200).json({
      success: true,
      data: report,
    });
    
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
    });
  }
};

/**
 * READ: Get reports by date range
 * 
 * This is for the DOWNLOAD feature!
 * Filter reports between two dates
 * 
 * Query params:
 * - startDate: YYYY-MM-DD (e.g., 2024-01-01)
 * - endDate: YYYY-MM-DD (e.g., 2024-01-31)
 * 
 * GET /api/reports/range?startDate=2024-01-01&endDate=2024-01-31
 */
exports.getReportsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validation
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both startDate and endDate query parameters',
        example: '/api/reports/range?startDate=2024-01-01&endDate=2024-01-31',
      });
    }

    // Convert to Date objects and include full day
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    console.log(`Fetching reports from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);

    // Query database for reports in date range
    const reports = await Report.find({
      createdAt: {
        $gte: start,  // Greater than or equal to start date
        $lte: end,    // Less than or equal to end date
      },
    }).sort({ createdAt: -1 });

    console.log(`Found ${reports.length} reports in date range`);

    res.status(200).json({
      success: true,
      count: reports.length,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      data: reports,
    });
    
  } catch (error) {
    console.error('Error fetching reports by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
    });
  }
};

/**
 * UPDATE: Update an existing report
 * 
 * Can update any field:
 * - title
 * - rawInputs
 * - formattedReport
 * - status
 * - tags
 * 
 * PUT /api/reports/:id
 */
exports.updateReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log(`✏️  Updating report: ${id}`);

    const report = await Report.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,           // Return updated document
        runValidators: true, // Validate updated data
      }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    console.log('✅ Report updated successfully');

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: report,
    });
    
  } catch (error) {
    console.error(' Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
    });
  }
};

/**
 * DELETE: Delete a report
 * 
 * Permanently removes report from database
 * 
 * DELETE /api/reports/:id
 */
exports.deleteReportById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️  Deleting report: ${id}`);

    const report = await Report.findByIdAndDelete(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    console.log('Report deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      data: {
        deletedId: id,
        deletedTitle: report.title,
      },
    });
    
  } catch (error) {
    console.error(' Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete report',
    });
  }
};

/**
 * EXTRA: Get available LLM models
 * 
 * Returns list of FREE Hugging Face models
 * 
 * GET /api/reports/models
 */
exports.getAvailableModels = (req, res) => {
  try {
    const models = huggingFaceService.getAvailableModels();
    
    res.status(200).json({
      success: true,
      count: models.length,
      data: models,
    });
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get models',
    });
  }
};