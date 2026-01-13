import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [coupon, setCoupon] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [sessionId, setSessionId] = useState("");

    // Load cart from localStorage on mount
    useEffect(() => {
        // Initialize Session ID
        let sid = localStorage.getItem("sessionId");
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem("sessionId", sid);
        }
        setSessionId(sid);

        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Error parsing cart from localStorage:", e);
            }
        }

        const savedCoupon = localStorage.getItem("coupon");
        if (savedCoupon) {
            try {
                setCoupon(JSON.parse(savedCoupon));
            } catch (e) {
                console.error("Error parsing coupon from localStorage:", e);
            }
        }

        setIsLoaded(true);
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("cart", JSON.stringify(cartItems));
        }
    }, [cartItems, isLoaded]);

    // Save coupon to localStorage whenever it changes
    useEffect(() => {
        if (isLoaded) {
            if (coupon) {
                localStorage.setItem("coupon", JSON.stringify(coupon));
            } else {
                localStorage.removeItem("coupon");
            }
        }
    }, [coupon, isLoaded]);

    const addToCart = (product, quantity = 1) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === product.id);
            if (existingItem) {
                return prevItems.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prevItems, { ...product, quantity }];
        });
    };

    const removeFromCart = (productId) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    };

    const updateQuantity = (productId, quantity) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        setCartItems((prevItems) =>
            prevItems.map((item) =>
                item.id === productId ? { ...item, quantity } : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
        setCoupon(null);
        localStorage.removeItem("coupon");
    };

    const applyCoupon = (couponData) => {
        setCoupon(couponData);
    };

    const removeCoupon = () => {
        setCoupon(null);
    };

    const getCartTotal = () => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    };

    const getCartCount = () => {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    };

    const isInCart = (productId) => {
        return cartItems.some((item) => item.id === productId);
    };

    const value = {
        cartItems,
        coupon,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        getCartTotal,
        getCartCount,
        isInCart,
        isLoaded,
        sessionId,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;
