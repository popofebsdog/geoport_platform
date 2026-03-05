import axios from 'axios';

// 創建 axios 實例
const api = axios.create({
  baseURL: '/api', // 使用相對路徑，讓 Vite 代理處理
  timeout: 10000
  // 移除默認的 Content-Type，讓 axios 根據數據類型自動設置
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 添加認證令牌
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    console.log('API 響應攔截器 - 原始響應:', response);
    console.log('API 響應攔截器 - 返回數據:', response.data);
    return response.data;
  },
  (error) => {
    console.error('API 響應攔截器 - 錯誤:', error);
    if (error.response?.status === 401) {
      // 清除過期的令牌
      localStorage.removeItem('authToken');
      // 重定向到登入頁面
      window.location.href = '/login';
    }
    // 保持完整的錯誤對象，包含 response 信息
    return Promise.reject(error);
  }
);

// API 方法
export const projectAPI = {
  // 獲取所有項目
  getAll: (params = {}) => api.get('/projects', { params }),
  
  // 獲取單個項目
  getById: (id) => api.get(`/projects/${id}`),
  
  // 創建項目
  create: (data) => api.post('/projects', data),
  
  // 更新項目
  update: (id, data) => api.put(`/projects/${id}`, data),
  
  // 刪除項目
  delete: (id) => api.delete(`/projects/${id}`),
  
  // 切換書籤
  toggleBookmark: (id) => api.patch(`/projects/${id}/bookmark`),
  
  // 獲取已刪除項目
  getDeleted: () => api.get('/projects/deleted'),
  
  // 還原項目
  restore: (id) => api.patch(`/projects/${id}/restore`)
};

export const dataAPI = {
  // 獲取所有數據
  getAll: (params = {}) => api.get('/data', { params }),
  
  // 獲取單個數據
  getById: (id) => api.get(`/data/${id}`),
  
  // 上傳數據
  upload: (formData) => api.post('/data', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  
  // 更新數據
  update: (id, data) => api.put(`/data/${id}`, data),
  
  // 刪除數據
  delete: (id) => api.delete(`/data/${id}`)
};

export const dataFileAPI = {
  // 獲取所有資料檔案
  getAll: (params = {}) => api.get('/data-files', { params }),
  
  // 獲取單個資料檔案
  getById: (id) => api.get(`/data-files/${id}`),
  
  // 上傳資料檔案
  upload: (formData) => api.post('/data/upload', formData),
  
  // 創建資料檔案
  create: (data) => api.post('/data-files', data),
  
  // 更新資料檔案
  update: (id, data) => api.put(`/data-files/${id}`, data),
  
  // 刪除資料檔案 (軟刪除)
  delete: (id) => api.delete(`/data-files/${id}`),
  
  // 永久刪除資料檔案
  permanentDelete: (id) => api.delete(`/data-files/${id}/permanent`),
  
  // 獲取已刪除資料檔案
  getDeleted: () => api.get('/data-files/deleted'),
  
  // 還原資料檔案
  restore: (id) => api.patch(`/data-files/${id}/restore`)
};

export const reportAPI = {
  // 獲取所有報告
  getAll: (params = {}) => api.get('/reports', { params }),
  
  // 獲取單個報告
  getById: (id) => api.get(`/reports/${id}`),
  
  // 創建報告
  create: (data) => api.post('/reports', data),
  
  // 更新報告
  update: (id, data) => api.put(`/reports/${id}`, data),
  
  // 刪除報告 (軟刪除)
  delete: (id) => api.delete(`/reports/${id}`),
  
  // 切換書籤
  toggleBookmark: (id) => api.patch(`/reports/${id}/bookmark`),
  
  // 獲取已刪除報告
  getDeleted: () => api.get('/reports/deleted'),
  
  // 還原報告
  restore: (id) => api.patch(`/reports/${id}/restore`)
};

export const authAPI = {
  // 登入
  login: (credentials) => api.post('/auth/login', credentials),
  
  // 註冊
  register: (userData) => api.post('/auth/register', userData),
  
  // 登出
  logout: () => api.post('/auth/logout'),
  
  // 獲取用戶資料
  getProfile: () => api.get('/auth/profile'),
  
  // 更新用戶資料
  updateProfile: (data) => api.put('/auth/profile', data)
};

export default api;
