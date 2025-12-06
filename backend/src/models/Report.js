// src/models/Report.js

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: function() {
        return `Daily Report - ${new Date().toLocaleDateString()}`;
      },
      trim: true,
    },

    date: {
      type: Date,
      required: [true, 'Report date is required'],
      default: Date.now,
    },

    rawInputs: {
      accomplishments: {
        type: String,
        default: '',
        trim: true,
      },
      inProgress: {
        type: String,
        default: '',
        trim: true,
      },
      blockers: {
        type: String,
        default: '',
        trim: true,
      },
      notes: {
        type: String,
        default: '',
        trim: true,
      },
    },

    formattedReport: {
      type: String,
      required: [true, 'Formatted report is required'],
      trim: true,
    },

    llmModel: {
      type: String,
      default: 'meta-llama/Llama-3.2-3B-Instruct',
      trim: true,
    },

    status: {
      type: String,
      enum: ['draft', 'completed', 'archived'],
      default: 'completed',
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'Daily_Status',
  }
);

reportSchema.index({ date: -1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ date: -1, status: 1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;