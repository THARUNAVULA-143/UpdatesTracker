// src/controllers/reportController.js

const Report = require('../models/Report');
const huggingFaceService = require('../services/huggingface');
const { startOfDay, endOfDay } = require('date-fns');

/**
 * ✅ IMPROVED PROMPT BUILDER
 */
function buildPrompt(rawInput) {
  return `You are a professional IT standup report formatter.

**Your task:** Transform raw input into a clean, professional standup update with three sections.

**Input:** ${rawInput}

**Instructions:**
1. Extract ALL tasks mentioned - never skip any task
2. Categorize into: Completed (past tense), In Progress (present tense), Support (time only)
3. Fix grammar and spelling but keep all original information intact
4. Use exact numbers - never change "2.5" to "5" or round anything
5. If a section is truly empty, write "None"

**Format your response EXACTLY like this:**

## Completed
- [List completed tasks in past tense, or "None" if empty]

## In Progress
- [List ongoing tasks in present continuous, or "None" if empty]

## Support
- [Time duration only, like "2.5 hours" or "30 minutes", or "None" if empty]

**Example 1:**
Input: "completed task 101, testing task 202, support 2.5 hrs"

Output:
## Completed
- Completed Task 101

## In Progress
- Currently testing Task 202

## Support
- 2.5 hours

**Example 2:**
Input: "working on task 55 and task 66, got help for 30 minutes"

Output:
## Completed
None

## In Progress
- Currently working on Task 55
- Currently working on Task 66

## Support
- 30 minutes

Now format this input following the exact format above: ${rawInput}`;
}

/**
 * FORMAT ONLY (No Save) - FOR PREVIEW
 */
exports.formatReportOnly = async (req, res) => {
  try {
    console.log('🎨 Formatting report (PREVIEW ONLY)...');
    
    const { rawInputs, llmModel } = req.body;

    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field',
      });
    }

    console.log('📋 Raw input:', rawInputs.accomplishments);
    
    // ✅ Use improved prompt
    const prompt = buildPrompt(rawInputs.accomplishments);

    console.log('🤖 Sending to AI for formatting...');

    const formattedReport = await huggingFaceService.generateReport(
      prompt,
      llmModel || 'Qwen/Qwen2.5-7B-Instruct'
    );

    const extractSection = (text, sectionName) => {
      const regex = new RegExp(`##\\s*${sectionName}\\s*([\\s\\S]*?)(?=##|$)`, "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const parsedSections = {
      inProgress: extractSection(formattedReport, "In Progress"),
      completed: extractSection(formattedReport, "Completed"),
      support: extractSection(formattedReport, "Support"),
    };

    console.log('✅ Formatting complete:', parsedSections);

    res.status(200).json({
      success: true,
      message: 'Report formatted successfully (preview only)',
      formattedReport,
      parsedSections,
    });
    
  } catch (error) {
    console.error('❌ Error formatting report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to format report',
    });
  }
};

/**
 * CREATE AND SAVE TO DATABASE
 */
exports.createReport = async (req, res) => {
  try {
    console.log('💾 Creating and SAVING report...');
    
    const { rawInputs, llmModel, title, parsedSections } = req.body;

    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one input field',
      });
    }
    
    console.log('📋 Raw input:', rawInputs.accomplishments);

    // ✅ Use improved prompt
    const prompt = buildPrompt(rawInputs.accomplishments);
    
    console.log('🤖 Sending to AI for formatting...');

    const formattedReport = await huggingFaceService.generateReport(
      prompt,
      llmModel || 'Qwen/Qwen2.5-7B-Instruct'
    );

    const extractSection = (text, sectionName) => {
      const regex = new RegExp(`##\\s*${sectionName}\\s*([\\s\\S]*?)(?=##|$)`, "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const sections = parsedSections || {
      inProgress: extractSection(formattedReport, "In Progress"),
      completed: extractSection(formattedReport, "Completed"),
      support: extractSection(formattedReport, "Support"),
    };

    const report = new Report({
      rawInputs,
      formattedReport,
      inProgress: sections.inProgress,
      completed: sections.completed,
      support: sections.support,
      llmModel: llmModel || 'Qwen/Qwen2.5-7B-Instruct',
      title: title || `Daily Report - ${new Date().toLocaleDateString()}`,
    });

    await report.save();

    console.log('💾 SAVED TO DATABASE:', report._id);

    res.status(201).json({
      success: true,
      message: 'Report created and saved successfully',
      formattedReport, 
      data: report,
    });
    
  } catch (error) {
    console.error('❌ Error creating report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create report',
    });
  }
};

/**
 * GET ALL REPORTS
 */
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ 
      success: true, 
      count: reports.length, 
      data: reports 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reports' 
    });
  }
};

/**
 * GET REPORT BY ID
 */
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }
    res.status(200).json({ 
      success: true, 
      data: report 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch report' 
    });
  }
};

/**
 * GET REPORTS BY DATE RANGE
 */
exports.getReportsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Provide both startDate and endDate' 
      });
    }
    
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    
    const reports = await Report.find({ 
      createdAt: { $gte: start, $lte: end } 
    }).sort({ createdAt: -1 });
    
    res.status(200).json({ 
      success: true, 
      count: reports.length, 
      data: reports 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reports' 
    });
  }
};

/**
 * UPDATE REPORT BY ID
 */
exports.updateReportById = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Report updated successfully', 
      data: report 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update report' 
    });
  }
};

/**
 * DELETE REPORT BY ID
 */
exports.deleteReportById = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Report deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete report' 
    });
  }
};

/**
 * GET AVAILABLE MODELS
 */
exports.getAvailableModels = (req, res) => {
  try {
    // Add method to huggingface service if needed
    const models = [
      'Qwen/Qwen2.5-7B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.2',
      'microsoft/Phi-3-mini-4k-instruct'
    ];
    
    res.status(200).json({ 
      success: true, 
      count: models.length, 
      data: models 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get models' 
    });
  }
};