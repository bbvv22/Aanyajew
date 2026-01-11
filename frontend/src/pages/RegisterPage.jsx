import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const RegisterPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    // Countdown for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs[index + 1].current.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs[index - 1].current.focus();
        }
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
            const response = await fetch(`${backendUrl}/api/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                }),
            });

            if (!response.ok) {
                // Specific handling for 400 Bad Request (Duplicate Email)
                // We handle this by status code because something in the environment 
                // seems to consume the response body for errors, causing 'body stream already read'
                if (response.status === 400) {
                    throw new Error("Email already registered");
                }

                let errorMessage = "Failed to send OTP";
                if (!response.bodyUsed) {
                    try {
                        const text = await response.text();
                        const data = JSON.parse(text);
                        errorMessage = data.detail || data.message || "Failed to send OTP";
                    } catch (e) {
                        errorMessage = response.statusText || "Failed to send OTP";
                    }
                }
                throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
            }

            // For successful responses, we can safely read JSON
            const data = await response.json();

            setStep(2);
            setCountdown(60);
        } catch (err) {
            console.error("Registration caught error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const otpCode = otp.join("");
        if (otpCode.length !== 6) {
            setError("Please enter the complete 6-digit code");
            setLoading(false);
            return;
        }

        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
            const response = await fetch(`${backendUrl}/api/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    otp: otpCode,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "OTP verification failed");
            }

            // Store token and redirect
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("user", JSON.stringify(data.user));
            navigate("/");
            window.location.reload();
        } catch (err) {
            setError(err.message);
            setOtp(["", "", "", "", "", ""]);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (countdown > 0) return;
        setLoading(true);
        setError("");

        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8006";
            const response = await fetch(`${backendUrl}/api/auth/resend-otp?email=${encodeURIComponent(formData.email)}`, {
                method: "POST",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Failed to resend OTP");
            }

            setCountdown(60);
            setOtp(["", "", "", "", "", ""]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: OTP Verification
    if (step === 2) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center mb-8">
                            <Link to="/" className="inline-block">
                                <h1 className="text-3xl font-serif text-[#c4ad94]">ANNYA</h1>
                                <p className="text-xs text-gray-500 tracking-widest">JEWELLERS</p>
                            </Link>
                            <div className="w-16 h-16 bg-[#c4ad94]/10 rounded-full flex items-center justify-center mx-auto mt-6">
                                <Mail className="h-8 w-8 text-[#c4ad94]" />
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-800 mt-4">Verify Your Email</h2>
                            <p className="text-gray-500 mt-2">
                                Enter the 6-digit code sent to<br />
                                <strong className="text-gray-700">{formData.email}</strong>
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={otpRefs[index]}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ""))}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-[#c4ad94] focus:outline-none"
                                    />
                                ))}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 bg-[#c4ad94] hover:bg-[#b39d84] text-white text-lg"
                            >
                                {loading ? "Verifying..." : "Verify & Create Account"}
                            </Button>
                        </form>

                        <div className="text-center mt-6">
                            {countdown > 0 ? (
                                <p className="text-gray-500">
                                    Resend code in <span className="text-[#c4ad94] font-semibold">{countdown}s</span>
                                </p>
                            ) : (
                                <button
                                    onClick={handleResendOtp}
                                    disabled={loading}
                                    className="text-[#c4ad94] hover:underline"
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setStep(1)}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mt-6 mx-auto"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to form
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 1: Registration Form
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-block">
                            <h1 className="text-3xl font-serif text-[#c4ad94]">ANNYA</h1>
                            <p className="text-xs text-gray-500 tracking-widest">JEWELLERS</p>
                        </Link>
                        <h2 className="text-2xl font-semibold text-gray-800 mt-6">Create Account</h2>
                        <p className="text-gray-600 mt-2">Join us and discover exquisite jewellery</p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmitForm} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="pl-10"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 flex items-center justify-center">📞</span>
                                <Input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="pl-10"
                                    placeholder="+91 99999 99999"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <input type="checkbox" className="rounded text-[#c4ad94] mt-1" required />
                            <span className="text-sm text-gray-600">
                                I agree to the{" "}
                                <Link to="/terms" className="text-[#c4ad94] hover:underline">
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link to="/privacy" className="text-[#c4ad94] hover:underline">
                                    Privacy Policy
                                </Link>
                            </span>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-6 bg-[#c4ad94] hover:bg-[#b39d84] text-white text-lg"
                        >
                            {loading ? "Sending verification..." : "Continue"}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500">Already have an account?</span>
                        </div>
                    </div>

                    {/* Login Link */}
                    <Link to="/login">
                        <Button variant="outline" className="w-full py-6 text-lg">
                            Sign In
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
