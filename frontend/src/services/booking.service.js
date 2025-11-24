import axiosClient from "../api/axiosClient";

export const bookingService = {
  createPublicBooking: async (organizerId, bookingData) => {
    const response = await axiosClient.post(
      `/public-booking/organizers/${organizerId}/bookings`,
      bookingData
    );
    return response.data;
  },

 getAvailability: async (organizerId) => {
    const response = await axiosClient.get(`/public-booking/organizers/${organizerId}/availability`);
    return response.data;
  },

 getPublicBooking: async (filterString) => {
    const params = {};
    if (filterString) {
      params.search = filterString;
    }
    const response = await axiosClient.get('/public-booking/list', { params });
    return response.data;
  },

  publicCancelBooking: async (bookingId, cancelData = {}) => {
    const response = await axiosClient.delete(`/public-booking/${bookingId}/cancel`, {
      data: cancelData
    });
    return response.data;
  },


  getPublicBookingDetail: async (bookingId) => {
    const response = await axiosClient.get(`/public-booking/bookings/${bookingId}`);
    return response.data;
  },

  publicReschedulBookingDetail: async (bookingId, payload) => {
      const response = await axiosClient.put(
        `/public-booking/${bookingId}/reschedule`,
        payload
      );
      return response.data;
  },

  createManualBooking: async (bookingData) => {
    const response = await axiosClient.post('/booking', bookingData);
    return response.data;
  },

  getListBooking: async (filterData) => {
    const response = await axiosClient.get('/booking/list-booking', {
      data: filterData 
    });
    return response.data;
  },

  getBookingDetail: async (bookingId) => {
    const response = await axiosClient.get(`/booking/${bookingId}`);
    return response.data;
  },

  cancelBooking: async (bookingId, cancelData = {}) => {
    const response = await axiosClient.delete(`/booking/${bookingId}`, {
      data: cancelData
    });
    return response.data;
  },

  rescheduleBooking: async (bookingId, newStartTime) => {
    const response = await axiosClient.put(`/booking/${bookingId}/reschedule`, {
      new_start_time: newStartTime
    });
    return response.data;
  }
};