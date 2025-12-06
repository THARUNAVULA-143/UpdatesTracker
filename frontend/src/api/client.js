import axios from 'axios'

const BASE_URL = 'http://localhost:5000/api'

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const apiClient = {
  // Create a new report
  createReport: async (data) => {
    try {
      const response = await axiosInstance.post('/reports', data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }
  },

  // Get all reports
  getAllReports: async () => {
    try {
      const response = await axiosInstance.get('/reports')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }
  },

  // Get single report
  getReportById: async (id) => {
    try {
      const response = await axiosInstance.get(`/reports/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }
  },

  // Get reports by date range
  getReportsByDateRange: async (startDate, endDate) => {
    try {
      const response = await axiosInstance.get('/reports/range', {
        params: { startDate, endDate },
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }
  },

  // Update report
  updateReport: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/reports/${id}`, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }
  },

  // Delete report
  deleteReport: async (id) => {
    try {
      const response = await axiosInstance.delete(`/reports/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }
  },

  // Get available AI models
  getAvailableModels: async () => {
    try {
      const response = await axiosInstance.get('/reports/models')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }
  },
}
