import { createSlice } from '@reduxjs/toolkit';

const savedUser = (() => {
  try {
    const raw = localStorage.getItem('lc_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('lc_token') || null,
    user: savedUser,
  },
  reducers: {
    setCredentials(state, action) {
      const payload = action.payload;
      if (payload.token) {
        state.token = payload.token;
        localStorage.setItem('lc_token', payload.token);
      }
      const userObj = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        status: payload.status,
        fullName: payload.fullName,
        profileId: payload.profileId,
        verificationStatus: payload.verificationStatus,
        incentiveTier: payload.incentiveTier,
      };
      state.user = userObj;
      localStorage.setItem('lc_user', JSON.stringify(userObj));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('lc_token');
      localStorage.removeItem('lc_user');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
