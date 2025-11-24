import axiosClient from "../api/axiosClient";   

export const organizerService = {
  getPublicOrganizers: async (filterString) => {
    const params = {};
    if (filterString) {
      params.search = filterString;
    }
    const response = await axiosClient.get('/public-organizer', { params });
    return response.data;
  },

  getPublicOrganizerDetail: async (organizerId) => {
    const response = await axiosClient.get(`/public-organizer/${organizerId}`);
    return response.data;
  },

  createBooking: async (organizerId, bookingData) => {
    const response = await axiosClient.post(
      `/public-booking/organizers/${organizerId}/bookings`, 
      bookingData
    );
    return response.data;
  },

  getOrganizerByUserId: async (userId) => {
    const response = await axiosClient.get(`/organizers/users/${userId}`);
    return response.data;
  },

  updateOrganizerProfile: async (organizerId, data) => {
    const response = await axiosClient.put(`/organizers/${organizerId}`, data);
    return response.data;
  },

  getSettings: async (organizerId) => {
    const response = await axiosClient.get(`/organizer-settings/${organizerId}`);
    return response.data;
  },

  updateSettings: async (organizerId, settingsData) => {
    const response = await axiosClient.put(`/organizer-settings/${organizerId}`, settingsData);
    return response.data;
  },

  createSettings: async (organizerId, settingsData) => {
    const response = await axiosClient.post(`/organizer-settings/${organizerId}`, settingsData);
    return response.data;
  },

    getOrganizer: async () => {
        const res = await axiosClient.get("/organizers"); 
        return res.data; 
    }
};