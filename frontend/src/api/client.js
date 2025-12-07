// src/api/client.js

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Error handler
const handleError = (error) => {
  if (error.response) {
    throw new Error(error.response.data.message || 'Server error');
  } else if (error.request) {
    throw new Error('No response from server');
  } else {
    throw new Error(error.message);
  }
};

export const apiClient = {
  /**
   * Format report with AI (PREVIEW ONLY - does not save)
   */
  formatReport: async (reportData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports/format`, reportData);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Create and save report to database
   */
  createReport: async (reportData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reports`, reportData);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Get all reports
   */
  getAllReports: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Get single report by ID
   */
  getReportById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Get reports by date range
   */
  getReportsByDateRange: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/range`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Update report
   */
  updateReport: async (id, updates) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/reports/${id}`, updates);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Delete report
   */
  deleteReport: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/reports/${id}`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  /**
   * Get available AI models
   */
  getModels: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/models`);
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};