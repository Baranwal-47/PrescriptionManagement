import axios from 'axios';
import { MedicineResponse, MedicineDetailResponse } from '../types/Medicine';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const medicineAPI = {
  // Get medicines with search and pagination
  getMedicines: async (
    page: number = 1,
    limit: number = 12,
    search: string = '',
    letter: string = '',
    prescriptionRequired: string = '' // 🆕 Add prescription filter parameter
  ): Promise<MedicineResponse> => {
    // Build params object dynamically to avoid empty params
    const params: any = { page, limit };
    
    if (search.trim()) params.search = search;
    if (letter.trim()) params.letter = letter;
    if (prescriptionRequired.trim()) params.prescriptionRequired = prescriptionRequired; // 🆕 Add prescription filter
    
    const response = await api.get('/medicines', { params });
    return response.data;
  },

  // Get single medicine
  getMedicineById: async (id: string): Promise<MedicineDetailResponse> => {
    const response = await api.get(`/medicines/${id}`);
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await api.get('/medicines/stats');
    return response.data;
  }
};
