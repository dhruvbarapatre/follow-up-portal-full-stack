import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../slices/authSlice';

const rootReducer = combineReducers({
    auth: authReducer,   // <--- MUST be nested here
});

export default rootReducer;
