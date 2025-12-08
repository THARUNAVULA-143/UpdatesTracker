// src/controllers/reportController.js

const Report = require('../models/Report');
const huggingFaceService = require('../services/huggingface');
const { startOfDay, endOfDay } = require('date-fns');

/**
 * ✅ RULE-BASED PARSER - Reliable fallback
 */
function ruleBasedParser(input) {
  console.log('🔧 Using rule-based parser for reliability...');
  
  const text = input.toLowerCase();
  let completed = [];
  let inProgress = [];
  let support = "None";

  // Extract support/time first
  const timePatterns = [
    /support\s+(?:taken\s+)?(?:for\s+)?(.+?)(?:\.|$)/i,
    /(\d+\s*(?:min|minute|minutes|hour|hours|hr|hrs))/i,
    /(more\s+than\s+\d+\s+(?:min|minute|minutes))/i
  ];
  
  for (const pattern of timePatterns) {
    const match = input.match(pattern);
    if (match) {
      support = match[1].trim();
      // Normalize
      support = support.replace(/\bmin\b/gi, 'minutes')
                      .replace(/\bhr\b/gi, 'hours')
                      .replace(/\bhrs\b/gi, 'hours');
      // Capitalize first letter
      support = support.charAt(0).toUpperCase() + support.slice(1);
      break;
    }
  }

  // Split on common delimiters
  const sentences = input
    .split(/\.|,|and also|also|;/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  for (let sentence of sentences) {
    // Skip if it's just the support part
    if (/support|minute|min|hour|hr/i.test(sentence) && support !== "None") {
      continue;
    }

    const lower = sentence.toLowerCase();

    // Check for COMPLETED indicators (past tense)
    const completedIndicators = [
      /^i\s+completed/i,
      /^completed/i,
      /^finished/i,
      /^done\s+with/i,
      /^i\s+finished/i,
      /^resolved/i,
      /^closed/i,
      /^fixed/i,
      /^updated/i,
      /^created/i,
      /^wrote/i,
      /^deployed/i
    ];

    // Check for IN PROGRESS indicators (future tense)
    const inProgressIndicators = [
      /will\s+(?:be\s+)?test/i,
      /will\s+work/i,
      /will\s+finish/i,
      /going\s+to/i,
      /plan\s+to/i,
      /working\s+on/i,
      /currently/i,
      /testing\s+(?:once|when)/i,
      /^will/i,
      /i\s+will/i
    ];

    let isCompleted = completedIndicators.some(pattern => pattern.test(sentence));
    let isInProgress = inProgressIndicators.some(pattern => pattern.test(sentence));

    // Clean up the sentence
    let cleaned = sentence
      .replace(/^i\s+/i, '')
      .replace(/^completed\s+/i, '')
      .replace(/^finished\s+/i, '')
      .replace(/^done\s+with\s+/i, '')
      .trim();

    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    if (isCompleted && !isInProgress) {
      completed.push(cleaned);
    } else if (isInProgress || /will|going/.test(lower)) {
      inProgress.push(cleaned);
    } else if (isCompleted) {
      // If both matched, prefer completed
      completed.push(cleaned);
    }
  }

  // Remove duplicates and format
  completed = [...new Set(completed)].filter(s => s.length > 0);
  inProgress = [...new Set(inProgress)].filter(s => s.length > 0);

  return {
    completed: completed.length > 0 ? completed.map(s => `- ${s}`).join('\n') : 'None',
    inProgress: inProgress.length > 0 ? inProgress.map(s => `- ${s}`).join('\n') : 'None',
    support: support
  };
}

/**
 * ✅ PROFESSIONAL AI PROMPT - Simplified
 */
function buildAIPrompt(rawInput) {
  return `Parse this standup update into three categories:

INPUT: "${rawInput}"

RULES:
1. Completed = past tense (finished, done, completed, wrote, updated)
2. In Progress = future tense (will test, will work, going to, testing once)
3. Support = time taken only

Split sentences on "and also", "also", commas, and periods.
Extract EXACT time expressions.

OUTPUT FORMAT:
## Completed
- [task 1]
- [task 2]

## In Progress
- [task 1]

## Support
- [time or None]

Be concise and professional. Don't repeat information.`;
}

/**
 * ✅ FORMAT REPORT - HYBRID APPROACH
 */
exports.formatReport = async (req, res) => {
  try {
    console.log('🎨 Formatting report with HYBRID approach...');
    
    const { rawInputs, llmModel, useAI } = req.body;

    if (!rawInputs || !rawInputs.accomplishments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide accomplishments in rawInputs',
      });
    }

    const input = rawInputs.accomplishments;
    console.log('📋 Raw input:', input);

    let parsedSections;
    let formattedReport = '';

    // Try AI first if requested (default), fallback to rule-based
    if (useAI !== false) {
      try {
        console.log('🤖 Trying AI parsing...');
        const prompt = buildAIPrompt(input);
        
        const aiResponse = await huggingFaceService.generateReport(
          prompt,
          llmModel || 'Qwen/Qwen2.5-7B-Instruct'
        );

        console.log('🤖 AI Response:', aiResponse);

        // Extract sections from AI response
        const extractSection = (text, sectionName) => {
          const regex = new RegExp(`##\\s*${sectionName}\\s*([\\s\\S]*?)(?=##|$)`, "i");
          const match = text.match(regex);
          if (!match) return "";
          
          let section = match[1].trim();
          section = section.replace(/^-\s*-\s*$/gm, '');
          section = section.replace(/^-\s*$/gm, '');
          section = section.replace(/\n\n+/g, '\n').trim();
          
          return section || "None";
        };

        parsedSections = {
          completed: extractSection(aiResponse, "Completed"),
          inProgress: extractSection(aiResponse, "In Progress"),
          support: extractSection(aiResponse, "Support"),
        };

        formattedReport = aiResponse;

        // Validate AI output - check for hallucinations/duplicates
        const hasIssues = 
          parsedSections.completed.includes('Task 40, Task 1') ||
          parsedSections.completed.split('\n').length > 5 ||
          parsedSections.inProgress.split('\n').length > 5 ||
          (parsedSections.completed.match(/LAA-187/g) || []).length > 1;

        if (hasIssues) {
          console.log('⚠️ AI output has quality issues, switching to rule-based...');
          throw new Error('AI hallucinated');
        }

      } catch (error) {
        console.log('⚠️ AI failed, using rule-based parser:', error.message);
        parsedSections = ruleBasedParser(input);
        
        // Build formatted report from parsed sections
        formattedReport = `## Completed
${parsedSections.completed}

## In Progress
${parsedSections.inProgress}

## Support
${parsedSections.support}`;
      }
    } else {
      // Use rule-based directly
      parsedSections = ruleBasedParser(input);
      
      formattedReport = `## Completed
${parsedSections.completed}

## In Progress
${parsedSections.inProgress}

## Support
${parsedSections.support}`;
    }

    console.log('✅ Final parsed sections:', parsedSections);

    res.status(200).json({
      success: true,
      message: 'Report formatted successfully',
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
 * ✅ CREATE REPORT (Save to Database)
 */
exports.createReport = async (req, res) => {
  try {
    console.log('💾 Creating and SAVING report...');
    
    const { rawInputs, llmModel, title, parsedSections } = req.body;

    if (!parsedSections) {
      return res.status(400).json({
        success: false,
        message: 'Please provide parsedSections',
      });
    }

    // Build formatted report from sections if not provided
    let formattedReport = req.body.formattedReport;
    if (!formattedReport) {
      formattedReport = `## Completed
${parsedSections.completed || 'None'}

## In Progress
${parsedSections.inProgress || 'None'}

## Support
${parsedSections.support || 'None'}`;
    }

    const report = new Report({
      rawInputs: {
        accomplishments: rawInputs?.accomplishments || '',
      },
      formattedReport: formattedReport,
      completed: parsedSections.completed || 'None',
      inProgress: parsedSections.inProgress || 'None',
      support: parsedSections.support || 'None',
      llmModel: llmModel || 'Hybrid Parser',
      title: title || `Daily Report - ${new Date().toLocaleDateString()}`,
    });

    await report.save();

    console.log('💾 SAVED TO DATABASE:', report._id);

    res.status(201).json({
      success: true,
      message: 'Report saved successfully',
      data: report,
    });
    
  } catch (error) {
    console.error('❌ Error creating report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create report',
      error: error.message
    });
  }
};

/**
 * ✅ GET ALL REPORTS
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
    console.error('❌ Error fetching reports:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reports'
    });
  }
};

/**
 * ✅ GET REPORT BY ID
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
    console.error('❌ Error fetching report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch report'
    });
  }
};

/**
 * ✅ GET REPORTS BY DATE RANGE
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
    console.error('❌ Error fetching reports:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reports'
    });
  }
};

/**
 * ✅ UPDATE REPORT
 */
exports.updateReport = async (req, res) => {
  try {
    const { completed, inProgress, support } = req.body;

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      {
        completed: completed || 'None',
        inProgress: inProgress || 'None',
        support: support || 'None',
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedReport) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }

    console.log('✅ Report updated:', updatedReport._id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Report updated successfully', 
      data: updatedReport 
    });
  } catch (error) {
    console.error('❌ Error updating report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update report'
    });
  }
};

/**
 * ✅ DELETE REPORT
 */
exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }

    console.log('✅ Report deleted:', req.params.id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Report deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete report'
    });
  }
};

/**
 * ✅ GET AVAILABLE MODELS
 */
exports.getAvailableModels = (req, res) => {
  try {
    const models = [
      'Rule-Based Parser (Most Reliable)',
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
    console.error('❌ Error getting models:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get models'
    });
  }
};