import axiosClient from "../api/axiosClient"; 

export const authService = {
  signIn: async (credentials) => {
    const response = await axiosClient.post('/users/signin', credentials);
    
    if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  },

  register: async (userInfo) => {
    const response = await axiosClient.post('/users', userInfo);
    return response.data;
  },

  logout: async () => {
    const response = await axiosClient.post('/users/signout');
    localStorage.removeItem('token'); 
    
    return response.data;
  },

  getProfile: async () => {
    const response = await axiosClient.get('/users/me'); 
    return response.data;
  },
};