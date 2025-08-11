import axios, { AxiosRequestConfig } from 'axios';
import { Order, ShippingAddress } from '../types/Order';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const orderAPI = {
  createOrder: async (data: {
    shippingAddress: ShippingAddress;
    paymentMethod: string;
    doctorName?: string;
  }): Promise<{ success: boolean; data: Order }> => {
    const response = await api.post('/orders/create', data);
    return response.data;
  },

  getMyOrders: async (page: number = 1): Promise<{
    success: boolean;
    data: Order[];
    pagination: any;
  }> => {
    const response = await api.get(`/orders/my-orders?page=${page}`);
    return response.data;
  },

  getOrder: async (orderId: string): Promise<{ success: boolean; data: Order }> => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  // Admin APIs
  getAllOrders: async (page: number = 1, status?: string): Promise<{
    success: boolean;
    data: Order[];
    pagination: any;
  }> => {
    const params = new URLSearchParams({ page: page.toString() });
    if (status) params.append('status', status);
    
    const response = await api.get(`/orders/admin/all?${params}`);
    return response.data;
  },

  updateOrderStatus: async (orderId: string, status: string): Promise<{ success: boolean; data: Order }> => {
    const response = await api.put(`/orders/admin/${orderId}/status`, { status });
    return response.data;
  },


  // Get user's delivered medicines
getMyMedicines: async (page: number = 1): Promise<{
  success: boolean;
  data: any[];
  stats: any;
  pagination: any;
}> => {
  const token = localStorage.getItem('token');
  const response = await api.get(`/orders/my-medicines?page=${page}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // ✅ Add this
      }
    });
  return response.data;
},

// Get medicine usage history
getMedicineHistory: async (medicineId: string): Promise<{
  success: boolean;
  data: any[];
}> => {
  const response = await api.get(`/orders/medicine-history/${medicineId}`);
  
  return response.data;
},

};
