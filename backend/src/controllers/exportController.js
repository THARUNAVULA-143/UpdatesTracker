// src/controllers/exportController.js
const Report = require('../models/Report');
const { startOfDay, endOfDay, subMonths } = require('date-fns');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

//GET REPORTS BY DATE RANGE
const getReportsByDateRange = async (startDate, endDate) => {
  const start = startOfDay(new Date(startDate));
  const end = endOfDay(new Date(endDate));
  
  const reports = await Report.find({ 
    createdAt: { $gte: start, $lte: end } 
  }).sort({ createdAt: -1 });
  
  return reports; 
};

//EXPORT AS CSV
exports.exportCSV = async (req, res) => {
  try {
    const { months, startDate, endDate } = req.query;
    let reports;

    if (months) {
      const end = new Date();
      const start = subMonths(end, parseInt(months));
      reports = await getReportsByDateRange(start, end);
    } else if (startDate && endDate) {
      reports = await getReportsByDateRange(startDate, endDate);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide months or date range' 
      });
    }

    if (reports.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No reports found for the selected period' 
      });
    }

    // Transform data for CSV
    const data = reports.map((report, index) => ({
      'S.No': reports.length - index,
      'Date': new Date(report.createdAt).toLocaleDateString(),
      'Time': new Date(report.createdAt).toLocaleTimeString(),
      'Completed': report.completed || 'None',
      'In Progress': report.inProgress || 'None',
      'Support': report.support || 'None',
    }));

    // Convert to CSV
    const parser = new Parser();
    const csv = parser.parse(data);

    // Set headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=standup-reports-${new Date().toISOString().split('T')[0]}.csv`);
    
    return res.status(200).send(csv);

  } catch (error) {
    console.error('❌ Error exporting CSV:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to export CSV',
      error: error.message 
    });
  }
};

//EXPORT AS PDF
exports.exportPDF = async (req, res) => {
  try {
    const { months, startDate, endDate } = req.query;
    let reports;

    if (months) {
      const end = new Date();
      const start = subMonths(end, parseInt(months));
      reports = await getReportsByDateRange(start, end);
    } else if (startDate && endDate) {
      reports = await getReportsByDateRange(startDate, endDate);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide months or date range' 
      });
    }

    if (reports.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No reports found for the selected period' 
      });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=standup-reports-${new Date().toISOString().split('T')[0]}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Daily Standup Reports', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' }); // ✅ Fixed: Proper template literal
    doc.moveDown(2);

    // Add each report
    reports.forEach((report, index) => {
      const serialNumber = reports.length - index;
      
      doc.fontSize(14).text(`Report #${serialNumber}`, { underline: true }); // ✅ Fixed: Proper template literal
      doc.fontSize(10).text(`Date: ${new Date(report.createdAt).toLocaleString()}`); // ✅ Fixed: Proper template literal
      doc.moveDown(0.5);

      doc.fontSize(11).text('Completed:', { underline: true });
      doc.fontSize(9).text(report.completed || 'None');
      doc.moveDown(0.5);

      doc.fontSize(11).text('In Progress:', { underline: true });
      doc.fontSize(9).text(report.inProgress || 'None');
      doc.moveDown(0.5);

      doc.fontSize(11).text('Support:', { underline: true });
      doc.fontSize(9).text(report.support || 'None');
      doc.moveDown(1.5);

      // Add page break if needed
      if (index < reports.length - 1 && doc.y > 650) {
        doc.addPage();
      }
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('❌ Error exporting PDF:', error);
    
    // If headers already sent (PDF started streaming), we can't send JSON
    if (!res.headersSent) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to export PDF',
        error: error.message 
      });
    }
  }
};

//EXPORT AS EXCEL
exports.exportExcel = async (req, res) => {
  try {
    const { months, startDate, endDate } = req.query;
    let reports;

    if (months) {
      const end = new Date();
      const start = subMonths(end, parseInt(months));
      reports = await getReportsByDateRange(start, end);
    } else if (startDate && endDate) {
      reports = await getReportsByDateRange(startDate, endDate);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide months or date range' 
      });
    }

    if (reports.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No reports found for the selected period' 
      });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Standup Reports');

    // Define columns
    worksheet.columns = [
      { header: 'S.No', key: 'serialNumber', width: 10 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 12 },
      { header: 'Completed', key: 'completed', width: 40 },
      { header: 'In Progress', key: 'inProgress', width: 40 },
      { header: 'Support', key: 'support', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    reports.forEach((report, index) => {
      const serialNumber = reports.length - index;
      worksheet.addRow({
        serialNumber,
        date: new Date(report.createdAt).toLocaleDateString(),
        time: new Date(report.createdAt).toLocaleTimeString(),
        completed: report.completed || 'None',
        inProgress: report.inProgress || 'None',
        support: report.support || 'None',
      });
    });

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'top', wrapText: true };
        row.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    });

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=standup-reports-${new Date().toISOString().split('T')[0]}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting Excel:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to export Excel',
        error: error.message 
      });
    }
  }
};