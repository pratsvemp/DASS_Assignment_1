import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach JWT token to every request automatically
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auth
export const authAPI = {
    signup: (data) => API.post('/auth/signup', data),
    login: (data) => API.post('/auth/login', data),
    getMe: () => API.get('/auth/me'),
};

// Participant
export const participantAPI = {
    getProfile: () => API.get('/participant/profile'),
    updateProfile: (data) => API.patch('/participant/profile', data),
    onboarding: (data) => API.post('/participant/onboarding', data),
    followOrganizer: (id) => API.post(`/participant/follow/${id}`),
    unfollowOrganizer: (id) => API.delete(`/participant/follow/${id}`),
    changePassword: (data) => API.patch('/participant/change-password', data),
    getMyEvents: () => API.get('/participant/my-events'),
};

// Organizer
export const organizerAPI = {
    getProfile: () => API.get('/organizer/profile'),
    updateProfile: (data) => API.patch('/organizer/profile', data),
    getDashboard: () => API.get('/organizer/dashboard'),
    listPublic: () => API.get('/organizer/public'),
    getPublicDetail: (id) => API.get(`/organizer/${id}/public`),
    requestPasswordReset: (data) => API.post('/organizer/password-reset-requests', data),
    getMyPasswordResetRequests: () => API.get('/organizer/password-reset-requests'),
};

// Events
export const eventsAPI = {
    getEvents: (params) => API.get('/events', { params }),
    getEventById: (id) => API.get(`/events/${id}`),
    getOrganizerEventById: (id) => API.get(`/events/organizer/${id}`),
    getMyEvents: () => API.get('/events/organizer/my-events'),
    createEvent: (data) => API.post('/events', data),
    updateEvent: (id, data) => API.patch(`/events/${id}`, data),
    publishEvent: (id) => API.patch(`/events/${id}/publish`),
    register: (id, data) => API.post(`/events/${id}/register`, data),
    purchase: (id, data) => API.post(`/events/${id}/purchase`, data),
    uploadPayment: (id, regId, data) => API.patch(`/events/${id}/registrations/${regId}/upload-payment`, data),
    getRegistrations: (id) => API.get(`/events/${id}/registrations`),
    markAttendance: (id, regId, data) => API.patch(`/events/${id}/registrations/${regId}/attendance`, data),
    approvePayment: (id, regId, data) => API.patch(`/events/${id}/registrations/${regId}/approve-payment`, data),
    scanTicket: (id, ticketId) => API.get(`/events/${id}/registrations/scan/${ticketId}`),
    manualMarkAttendance: (id, regId, data) => API.patch(`/events/${id}/registrations/${regId}/manual-attend`, data),
};

// Admin
export const adminAPI = {
    createOrganizer: (data) => API.post('/admin/organizers', data),
    listOrganizers: () => API.get('/admin/organizers'),
    removeOrganizer: (id) => API.delete(`/admin/organizers/${id}`),
    enableOrganizer: (id) => API.patch(`/admin/organizers/${id}/enable`),
    deleteOrganizer: (id) => API.delete(`/admin/organizers/${id}/delete`),
    resetOrganizerPassword: (id) => API.post(`/admin/organizers/${id}/reset-password`),
    getPasswordResetRequests: () => API.get('/admin/password-reset-requests'),
    resolvePasswordResetRequest: (id, data) => API.patch(`/admin/password-reset-requests/${id}`, data),
};

export default API;
