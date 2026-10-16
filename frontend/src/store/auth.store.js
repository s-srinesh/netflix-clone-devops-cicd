import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

// Set axios to send cookies with requests.
axios.defaults.withCredentials = true;

// Initialize token from localStorage if available
const storedToken = typeof window !== 'undefined' ? localStorage.getItem('netflix_token') : null;
if (storedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

export const useAuthStore = create((set) => ({
  user: null,
  error: null,
  isLoading: false,
  isSigningUp: false,
  isLoggingIn: false,
  isLoggingOut: false,
  isCheckingAuth: true,
  setError: () => set({ error: null }),
  /**
   * Signs up a new user with the provided username, email, and password.
   */
  signup: async (credentials) => {
    set({ user: null, isSigningUp: true, error: null });
    try {
      const res = await axios.post('/api/v1/account/signup', credentials);
      const user = res.data.user;
      if (user?.accessToken) {
        localStorage.setItem('netflix_token', user.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${user.accessToken}`;
      }
      set({ user, isSigningUp: false });
    } catch (error) {
      set({ isSigningUp: false, error: error.response?.data?.message || 'Signup failed' });
      throw error;
    }
  },

  /**
   * Logs in the user with the provided credentials.
   */
  login: async (credentials) => {
    set({ user: null, isLoggingIn: true, error: null });
    try {
      const res = await axios.post('/api/v1/account/login', credentials);
      const user = res.data.user;
      if (user?.accessToken) {
        localStorage.setItem('netflix_token', user.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${user.accessToken}`;
      }
      set({ user, isLoggingIn: false });
    } catch (error) {
      set({ isLoggingIn: false, error: error.response?.data?.message || 'Login failed' });
      throw error;
    }
  },

  /**
   * Logs out the current user.
   *
   * This function sends a request to the server to log out the user.
   * It clears the user data from the store and sets the authentication status to false.
   */
  logout: async () => {
    set({ isLoggingOut: true });
    try {
      await axios.post('/api/v1/account/logout');
    } catch (error) {
      console.warn('Logout API call error:', error.message);
    } finally {
      localStorage.removeItem('netflix_token');
      delete axios.defaults.headers.common['Authorization'];
      set({ user: null, isLoggingOut: false });
      toast.success('Logged out successfully');
    }
  },

  /**
   * Checks the user's authentication status by making a request to the server.
   *
   * If the user is authenticated, it updates the store with the user's data and sets the authentication status to true.
   * If the user is not authenticated, it clears the user data from the store and sets the authentication status to false.
   */
  checkAuth: async () => {
    set({ user: null, isCheckingAuth: true });
    try {
      const token = localStorage.getItem('netflix_token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const res = await axios.get('/api/v1/account/auth');
      set({ user: res.data.user, isCheckingAuth: false });
    } catch (error) {
      set({ isCheckingAuth: false });
    }
  },

  /**
   * Verifies the user's email using the provided verification code.
   * code - The verification code sent to the user's email.
   */
  verifyEmail: async (code) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post('/api/v1/account/verify/email', { code });
      set({ user: res.data.user, isLoading: false });
      return res.data;
    } catch (error) {
      set({ error: error.response.data.message || 'Error verifying email', isLoading: false });
      throw error;
    }
  },

  /**
   * Sends a password reset email to the provided email address.
   *
   * This function makes a POST request to the server's forgot password endpoint.
   * If the email address is valid, the server sends a password reset email to the user.
   */
  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post('/api/v1/account/forgot/password', { email });
      set({ isLoading: false });
    } catch (error) {
      set({ error: error.response.data.message || 'Error in sending password reset email', isLoading: false });
      throw error;
    }
  },

  /**
   * Resets the user's password using the provided reset token and new password.
   *
   * This function makes a POST request to the server's reset password endpoint.
   * If the reset token is valid and the new password is provided, the server resets the user's password.
   */
  resetPassword: async (resetToken, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/v1/account/reset/password/${resetToken}`, { password: newPassword });
      set({ isLoading: false, error: null });
    } catch (error) {
      set({ error: error.response.data.message || 'Error resetting password', isLoading: false });
      throw error;
    }
  },
}));
