// src/services/huggingface.js

const axios = require('axios');

class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseURL = 'https://api-inference.huggingface.co/models';
    
    if (!this.apiKey) {
      console.error('❌ HUGGINGFACE_API_KEY not found in .env!');
    }
  }

  async generateReport(prompt, model = 'Qwen/Qwen2.5-72B-Instruct') {
    try {
      console.log(`🤖 Using model: ${model}`);
      console.log('📝 Prompt length:', prompt.length);

      const response = await axios.post(
        `${this.baseURL}/${model}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,    // Shorter, cleaner responses
            temperature: 0.4,        // More focused
            top_p: 0.9,
            return_full_text: false,
            do_sample: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000, // 90 seconds for larger model
        }
      );

      console.log('✅ Response received');

      let text = '';
      
      if (Array.isArray(response.data)) {
        text = response.data[0]?.generated_text || '';
      } else if (response.data.generated_text) {
        text = response.data.generated_text;
      } else if (typeof response.data === 'string') {
        text = response.data;
      }

      if (!text || text.trim().length < 10) {
        throw new Error('Empty response from AI');
      }

      console.log('📄 AI output:', text.substring(0, 200) + '...');
      
      return text;
      
    } catch (error) {
      console.error('❌ AI Error:', error.message);
      throw error;
    }
  }
}

module.exports = new HuggingFaceService();