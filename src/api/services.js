import axiosClient from './axiosClient';

export const authApi = {
  login: (data) => axiosClient.post('/auth/login', data).then((r) => r.data),
  register: (data) => axiosClient.post('/auth/register', data).then((r) => r.data),
  me: () => axiosClient.get('/auth/me').then((r) => r.data),
};

export const marketplaceApi = {
  getSpecializations: () => axiosClient.get('/marketplace/specializations').then((r) => r.data),
  searchProviders: (params) => axiosClient.get('/marketplace/providers', { params }).then((r) => r.data),
  getProviderDetail: (id) => axiosClient.get(`/marketplace/providers/${id}`).then((r) => r.data),
  getAvailableSlots: (id, date) => axiosClient.get(`/marketplace/providers/${id}/slots`, { params: { date } }).then((r) => r.data),
};

export const citizenApi = {
  getProfile: () => axiosClient.get('/citizens/profile').then((r) => r.data),
  updateProfile: (data) => axiosClient.put('/citizens/profile', data).then((r) => r.data),
};

export const providerApi = {
  getMe: () => axiosClient.get('/providers/me').then((r) => r.data),
  updateProfile: (data) => axiosClient.put('/providers/profile', data).then((r) => r.data),
  uploadCredential: (formData) =>
    axiosClient.post('/providers/credentials', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  submitVerification: () => axiosClient.post('/providers/submit-verification').then((r) => r.data),
  createService: (data) => axiosClient.post('/providers/services', data).then((r) => r.data),
  deleteService: (id) => axiosClient.delete(`/providers/services/${id}`),
  saveAvailability: (items) => axiosClient.put('/providers/availability', items).then((r) => r.data),
};

export const workflowApi = {
  bookAppointment: (data) => axiosClient.post('/appointments', data).then((r) => r.data),
  getMyAppointments: (params) => axiosClient.get('/appointments/my', { params }).then((r) => r.data),
  updateAppointmentStatus: (id, data) => axiosClient.patch(`/appointments/${id}/status`, data).then((r) => r.data),

  createCaseRequest: (data) => axiosClient.post('/requests', data).then((r) => r.data),
  getCaseRequests: () => axiosClient.get('/requests').then((r) => r.data),
  updateCaseStatus: (id, data) => axiosClient.patch(`/requests/${id}/status`, data).then((r) => r.data),

  uploadDocument: (formData) =>
    axiosClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  getDocuments: () => axiosClient.get('/documents').then((r) => r.data),
  downloadDocumentBlob: (id) => axiosClient.get(`/documents/${id}/download`, { responseType: 'blob' }),

  createPaymentOrder: (data) => axiosClient.post('/payments/create-order', data).then((r) => r.data),
  verifyPayment: (data) => axiosClient.post('/payments/verify', data).then((r) => r.data),
  getPaymentHistory: () => axiosClient.get('/payments/history').then((r) => r.data),

  createReview: (data) => axiosClient.post('/reviews', data).then((r) => r.data),
  getNotifications: () => axiosClient.get('/notifications').then((r) => r.data),
  markNotificationRead: (id) => axiosClient.patch(`/notifications/${id}/read`).then((r) => r.data),
};

export const adminApi = {
  getAnalytics: () => axiosClient.get('/admin/analytics').then((r) => r.data),
  getPendingProviders: () => axiosClient.get('/admin/providers/pending').then((r) => r.data),
  verifyProvider: (id, data) => axiosClient.patch(`/admin/providers/${id}/verify`, data).then((r) => r.data),
  getUsers: () => axiosClient.get('/admin/users').then((r) => r.data),
  updateUserStatus: (id, data) => axiosClient.patch(`/admin/users/${id}/status`, data),
  getAuditLogs: () => axiosClient.get('/admin/audit-logs').then((r) => r.data),
};
