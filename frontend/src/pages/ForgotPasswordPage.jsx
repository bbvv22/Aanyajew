import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8006';
            await axios.post(`${backendUrl}/api/auth/forgot-password`, { email });
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Check Your Email</h2>
                    <p className="text-gray-600 mb-6">
                        If an account exists with <strong>{email}</strong>, we've sent a password reset link.
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                        The link will expire in 1 hour for security reasons.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-[#c4ad94] hover:text-[#b39d84] font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block">
                        <h1 className="text-3xl font-serif tracking-widest text-[#c4ad94]">ANNYA</h1>
                        <p className="text-xs text-gray-500 tracking-wider">JEWELLERS</p>
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-[#fdfbf7] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="h-7 w-7 text-[#c4ad94]" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-800">Forgot Password?</h2>
                        <p className="text-gray-500 mt-2">
                            Enter your email and we'll send you a reset link.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c4ad94] focus:border-transparent"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#c4ad94] hover:bg-[#b39d84] text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="text-center mt-6">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#c4ad94] text-sm"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
