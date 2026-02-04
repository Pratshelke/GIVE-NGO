import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/axios';

type User = {
    _id: string;
    name: string;
    email: string;
    role: 'Donor' | 'NGO';
    phoneNumber?: string;
    address?: string;
};

type LocationData = {
    type: 'Point';
    coordinates: [number, number];
};

type AuthContextType = {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (
        name: string,
        email: string,
        password: string,
        role: 'Donor' | 'NGO',
        phoneNumber: string,
        address?: string,
        location?: LocationData
    ) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user on mount
    useEffect(() => {
        const loadUser = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                setToken(storedToken);
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data.user);
                } catch (error) {
                    // Token invalid, clear it
                    localStorage.removeItem('token');
                    setToken(null);
                }
            }
            setLoading(false);
        };

        loadUser();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { token: newToken, user: newUser } = response.data;

        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const register = async (
        name: string,
        email: string,
        password: string,
        role: 'Donor' | 'NGO',
        phoneNumber: string,
        address?: string,
        location?: LocationData
    ) => {
        const payload: any = {
            name,
            email,
            password,
            role,
            phoneNumber
        };

        // Add NGO-specific fields
        if (role === 'NGO') {
            payload.address = address;
            payload.location = location;
        }

        const response = await api.post('/auth/register', payload);
        const { token: newToken, user: newUser } = response.data;

        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data.user);
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
