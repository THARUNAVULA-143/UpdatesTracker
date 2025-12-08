// src/controllers/reportController.js

const Report = require('../models/Report');
const huggingFaceService = require('../services/huggingface');
const { startOfDay, endOfDay } = require('date-fns');

/**
 * ✅ PROFESSIONAL IT STANDUP PROMPT - NEVER MISSES ANYTHING
 */
function buildPrompt(rawInput) {
  return `You are an expert IT standup assistant. Your job is to help IT professionals format their daily updates for managers.

**CRITICAL RULES - NEVER BREAK THESE:**
1. EXTRACT EVERY SINGLE TICKET NUMBER mentioned (Task 117, LAA-107, LAA-90, JIRA-123, etc.) - Missing even ONE ticket is unacceptable
2. PRESERVE EXACT TIME EXPRESSIONS - If user says "more than 20 min", write "More than 20 minutes" (NEVER change to just "20 minutes")
3. If user says "will test", "going to work on", "plan to do" → Put in "In Progress"
4. If user says "done", "completed", "finished", "updated" → Put in "Completed"
5. Fix spelling/grammar but keep ALL information
6. Group related actions together in one bullet
7. If no support mentioned, write "None"

**Common IT Terms to Understand:**
- "test ticket 117" = working on testing Task 117 (In Progress)
- "done with LAA-107" = completed LAA-107 (Completed)
- "updated test cases in Jira" = completed action (Completed)
- "support for 30 min" = received 30 minutes of help
- "more than X minutes" = preserve "more than" phrase exactly
- "creating test issue on board" = Jira/test management work (Completed)

**Input from IT professional:**
${rawInput}

**Your task:**
Parse the input and format it professionally. Fix spelling errors like:
- "createing" → "creating"
- "jira" → "Jira"
- "toady" → "today"
- "scenareos" → "scenarios"
- "zypher" → "Zephyr"

**Format EXACTLY like this:**

## Completed
- [List ALL completed tasks in past tense, or "None"]

## In Progress
- [List ALL tasks planned/being worked on, or "None"]

## Support
- [EXACT time phrase from user, or "None"]

**Example 1:**
Input: "will test 117 today, done with LAA-107 and LAA-90, support more than 20 min, updated cases in jira"

Output:
## Completed
- Completed LAA-107 and LAA-90
- Updated test cases in Jira

## In Progress
- Will test Task 117 today

## Support
- More than 20 minutes

**Example 2:**
Input: "working on task 50 and task 51, finished task 49, got help for about 1 hour"

Output:
## Completed
- Completed Task 49

## In Progress
- Working on Task 50 and Task 51

## Support
- About 1 hour

**Example 3:**
Input: "testing LAA-100, LAA-101, LAA-102, deployed to staging, 45 mins support"

Output:
## Completed
- Deployed to staging

## In Progress
- Testing LAA-100, LAA-101, and LAA-102

## Support
- 45 minutes

**NOW FORMAT THIS INPUT - REMEMBER: DO NOT MISS ANY TICKET NUMBERS OR CHANGE TIME EXPRESSIONS:**
${rawInput}`;
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

exports.getAvailableModels = (req, res) => {
  try {
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