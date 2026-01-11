import React from "react";
import { Briefcase, MapPin, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

const CareersPage = () => {
    const jobs = [
        {
            title: "Jewellery Consultant",
            type: "Full-time",
            location: "Hyderabad",
            description: "We are looking for an experienced sales consultant with a passion for luxury jewellery."
        },
        {
            title: "Goldsmith / Bench Jeweller",
            type: "Full-time",
            location: "Hyderabad Workshop",
            description: "Experienced bench jeweller needed for repairs, resizing, and custom work."
        },
        {
            title: "Digital Marketing Specialist",
            type: "Part-time",
            location: "Remote / Hybrid",
            description: "Manage our social media presence and online marketing campaigns."
        }
    ];

    return (
        <div className="min-h-screen bg-white py-20">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-serif text-gray-800 mb-4">Join Our Team</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Be a part of Annya Jewellers' 100-year legacy. We are always looking for passionate individuals to join our family.
                    </p>
                </div>

                <div className="space-y-6">
                    {jobs.map((job, index) => (
                        <div key={index} className="bg-gray-50 p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-[#c4ad94]/20">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">{job.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Briefcase className="h-4 w-4" /> {job.type}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" /> {job.location}
                                    </span>
                                </div>
                                <p className="text-gray-600 leading-relaxed max-w-xl">
                                    {job.description}
                                </p>
                            </div>
                            <Button className="shrink-0 bg-white border border-[#c4ad94] text-[#c4ad94] hover:bg-[#c4ad94] hover:text-white group-hover:bg-[#c4ad94] group-hover:text-white transition-colors">
                                Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="mt-16 bg-[#c4ad94]/10 rounded-2xl p-8 text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Don't see a suitable role?</h3>
                    <p className="text-gray-600 mb-6">
                        We are strictly always on the lookout for talent. Send your CV to careers@annyajewellers.com
                    </p>
                    <a href="mailto:careers@annyajewellers.com" className="text-[#c4ad94] font-medium hover:underline">
                        Send spontaneous application
                    </a>
                </div>
            </div>
        </div>
    );
};

export default CareersPage;
