import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const OwnerContext = createContext();

export const useOwner = () => {
    const context = useContext(OwnerContext);
    if (!context) {
        throw new Error('useOwner must be used within an OwnerProvider');
    }
    return context;
};

export const OwnerProvider = ({ children }) => {
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8006';

    useEffect(() => {
        checkOwnerStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkOwnerStatus = async () => {
        const token = localStorage.getItem('ownerToken');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            await axios.get(`${backendUrl}/api/owner/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsOwner(true);
        } catch (error) {
            localStorage.removeItem('ownerToken');
            setIsOwner(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await axios.post(`${backendUrl}/api/owner/login`, {
                email: username,  // Backend expects 'email' field
                password
            });

            localStorage.setItem('ownerToken', response.data.access_token);
            setIsOwner(true);
            return { success: true };
        } catch (error) {
            console.error('Login error:', error.response?.data);
            // Handle validation errors (arrays) or string errors
            let errorMessage = 'Login failed';
            if (error.response?.data?.detail) {
                const detail = error.response.data.detail;
                if (Array.isArray(detail) && detail.length > 0) {
                    // Validation error array
                    errorMessage = detail.map(err => err.msg).join(', ');
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }
            }
            return {
                success: false,
                error: errorMessage
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('ownerToken');
        setIsOwner(false);
    };

    const getAuthHeader = () => {
        const token = localStorage.getItem('ownerToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    return (
        <OwnerContext.Provider value={{
            isOwner,
            loading,
            login,
            logout,
            getAuthHeader,
            backendUrl
        }}>
            {children}
        </OwnerContext.Provider>
    );
};

export default OwnerContext;
