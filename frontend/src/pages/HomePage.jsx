import React from "react";
import HeroSection from "../components/HeroSection";
import CategorySection from "../components/CategorySection";
import AboutSection from "../components/AboutSection";
import ProductCarousel from "../components/ProductCarousel";
import GiftSection from "../components/GiftSection";
import StoreSection from "../components/StoreSection";
import BlogSection from "../components/BlogSection";
import InstagramSection from "../components/InstagramSection";
import TrustBadges from "../components/TrustBadges";

const HomePage = () => {
    return (
        <>
            <HeroSection />
            <CategorySection />
            <AboutSection />
            <ProductCarousel />
            <GiftSection />
            <StoreSection />
            <BlogSection />
            <InstagramSection />
            <TrustBadges />
        </>
    );
};

export default HomePage;
