"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, Activity, Shield, FileText, ChevronRight, Play, Stethoscope, Upload, Brain, Users, ArrowUpRight, Zap, Lock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-premium-gradient text-foreground">
            {/* ─── Frosted Glass Navbar ─── */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/40 border-b border-white/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-[#4BA0A2] w-9 h-9 rounded-xl flex items-center justify-center shadow-md">
                            <img src="/image.png" alt="Logo" className="w-full h-full object-cover rounded-xl" />
                        </div>
                        <span className="text-xl font-black tracking-tight text-[#1C2222]">MediAI</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-bold text-[#1C2222]/70 hover:text-[#1C2222] transition-colors">
                            Product
                        </a>
                        <a href="#how-it-works" className="text-sm font-bold text-[#1C2222]/70 hover:text-[#1C2222] transition-colors">
                            Service
                        </a>
                        <a href="#benefits" className="text-sm font-bold text-[#1C2222]/70 hover:text-[#1C2222] transition-colors">
                            Activity
                        </a>
                        <a href="#testimonials" className="text-sm font-bold text-[#1C2222]/70 hover:text-[#1C2222] transition-colors">
                            Support
                        </a>
                    </div>
                    <Button
                        size="sm"
                        className="bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-full px-6 font-bold shadow-lg"
                        asChild
                    >
                        <Link href="/signup">Get Started</Link>
                    </Button>
                </div>
            </nav>

            {/* ─── Hero Section ─── */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 text-center">
                <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] lg:text-[4rem] font-black leading-[1.1] tracking-tight text-[#1C2222]">
                    Transform{" "}
                    <span className="text-[#4BA0A2]">Lung Disease Detection</span>
                    <br className="hidden sm:block" />
                    {" "}with Cutting-Edge AI
                </h1>
                <p className="mt-6 text-base sm:text-lg text-[#1C2222]/60 max-w-2xl mx-auto leading-relaxed font-medium">
                    Detect pneumonia, tuberculosis, and tumors with clinical-grade accuracy.
                    Streamline radiology workflows with our comprehensive, AI-powered diagnostic platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                    <Button
                        size="lg"
                        className="bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-full px-8 font-bold shadow-lg group"
                        asChild
                    >
                        <Link href="/signup">
                            Get Started
                            <ArrowUpRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="rounded-full px-8 font-bold border-[#1C2222]/20 bg-white/60 hover:bg-white text-[#1C2222] backdrop-blur-sm"
                        asChild
                    >
                        <Link href="/login">
                            Watch a Demo
                            <Play className="ml-2 h-4 w-4 fill-current" />
                        </Link>
                    </Button>
                </div>
            </section>

            {/* ─── Dashboard Preview ─── */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <div className="relative rounded-[1.5rem] overflow-hidden shadow-2xl shadow-black/10 border border-white/40 bg-white/30 backdrop-blur-sm p-2">
                    <div className="rounded-[1.25rem] overflow-hidden bg-[#D9E1E1]">
                        <Image
                            src="/dashboard-preview.png"
                            alt="MediAI Dashboard Preview"
                            width={1200}
                            height={700}
                            className="w-full h-auto object-cover"
                            priority
                        />
                    </div>
                </div>
            </section>

            {/* ─── Stats Banner ─── */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { value: "99%", label: "Diagnostic Accuracy", icon: Activity },
                        { value: "10K+", label: "Cases Analyzed", icon: FileText },
                        { value: "500+", label: "Healthcare Institutions", icon: Users },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="card-premium-pocket p-6 sm:p-8 relative group"
                        >
                            <div className="absolute top-4 right-8 w-10 h-10 rounded-full bg-[#A8D4D6]/60 flex items-center justify-center">
                                <ArrowUpRight className="w-4 h-4 text-[#1C2222]/60" />
                            </div>
                            <div className="sub-card-white !rounded-2xl mt-2">
                                <div className="flex items-center gap-3">
                                    <stat.icon className="w-5 h-5 text-[#4BA0A2]" />
                                    <span className="text-sm font-bold text-[#1C2222]/50">{stat.label}</span>
                                </div>
                                <div className="text-3xl font-black text-[#1C2222] mt-2">{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Features Section ─── */}
            <section id="features" className="pb-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-black text-[#1C2222] mb-3">Powerful Clinical Features</h2>
                        <p className="text-base text-[#1C2222]/50 max-w-2xl mx-auto font-medium">
                            Everything you need for comprehensive medical image analysis and diagnosis support
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {[
                            {
                                icon: Brain,
                                title: "Advanced AI Detection",
                                desc: "Trained neural networks detect pneumonia, tuberculosis, tumors, and other lung conditions with clinical-grade accuracy.",
                            },
                            {
                                icon: Activity,
                                title: "Annotated Imaging",
                                desc: "Automatic bounding boxes and color-coded regions highlight detected abnormalities for quick, precise visualization.",
                            },
                            {
                                icon: Users,
                                title: "Multi-Level Review",
                                desc: "Radiologists validate AI findings, doctors review assessments, and both provide detailed clinical notes seamlessly.",
                            },
                            {
                                icon: Lock,
                                title: "HIPAA Compliant & Secure",
                                desc: "Enterprise-grade security with full data encryption, role-based access controls, and complete audit trails.",
                            },
                            {
                                icon: Zap,
                                title: "Real-Time Analysis",
                                desc: "Get instant AI predictions on uploaded scans with confidence scores, severity assessment, and priority flagging.",
                            },
                            {
                                icon: FileText,
                                title: "Digital Reporting",
                                desc: "Generate professional medical reports with digital signatures, automated formatting, and PDF export options.",
                            },
                        ].map((feature) => (
                            <div
                                key={feature.title}
                                className="card-premium-pocket p-6 sm:p-8 group hover:scale-[1.02] transition-transform duration-300"
                            >
                                <div className="w-11 h-11 rounded-2xl bg-[#4BA0A2]/15 flex items-center justify-center mb-4">
                                    <feature.icon className="h-5 w-5 text-[#4BA0A2]" />
                                </div>
                                <h3 className="text-lg font-extrabold text-[#1C2222] mb-2">{feature.title}</h3>
                                <p className="text-sm text-[#1C2222]/50 leading-relaxed font-medium">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Benefits Section ─── */}
            <section id="benefits" className="pb-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-black text-[#1C2222] mb-4">Built for Medical Professionals</h2>
                            <p className="text-[#1C2222]/50 mb-8 leading-relaxed font-medium">
                                Designed in collaboration with clinical teams to fit naturally into hospital workflows — not replace them.
                            </p>
                            <ul className="space-y-3">
                                {[
                                    "Reduce diagnostic errors and improve patient outcomes",
                                    "Accelerate case review with AI-assisted analysis",
                                    "Maintain complete audit trails for regulatory compliance",
                                    "Collaborate seamlessly between radiologists and physicians",
                                    "Access full case history and patient records in one place",
                                    "Export professional medical reports instantly",
                                ].map((benefit, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-0.5 w-5 h-5 bg-[#4BA0A2]/20 rounded-full flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-[#4BA0A2]" />
                                        </div>
                                        <span className="text-sm leading-relaxed font-medium text-[#1C2222]/70">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-8">
                                <Button
                                    className="bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-full px-8 font-bold"
                                    asChild
                                >
                                    <Link href="/signup">
                                        Request Access
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { value: "3x", label: "Faster case review" },
                                { value: "40%", label: "Fewer missed findings" },
                                { value: "24/7", label: "AI availability" },
                                { value: "99%", label: "Detection accuracy" },
                            ].map((stat) => (
                                <div key={stat.label} className="card-premium-pocket p-6 text-center">
                                    <div className="text-3xl font-black text-[#4BA0A2] mb-1">{stat.value}</div>
                                    <p className="text-sm text-[#1C2222]/50 font-bold">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── How It Works ─── */}
            <section id="how-it-works" className="pb-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-black text-[#1C2222] mb-3">How It Works</h2>
                        <p className="text-base text-[#1C2222]/50 max-w-2xl mx-auto font-medium">
                            A simple three-step process for comprehensive diagnostic support
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                step: "01",
                                icon: Upload,
                                title: "Upload & Analyze",
                                description:
                                    "Upload chest X-rays or CT scans. Our AI instantly analyzes the images and generates predictions with confidence scores.",
                            },
                            {
                                step: "02",
                                icon: Stethoscope,
                                title: "Radiologist Review",
                                description:
                                    "Radiologists review AI predictions, validate findings, add annotations, adjust confidence thresholds, and provide expert assessment.",
                            },
                            {
                                step: "03",
                                icon: Shield,
                                title: "Doctor Diagnosis",
                                description:
                                    "Physicians review all findings and radiologist notes, then submit the final diagnosis and recommended treatment plan.",
                            },
                        ].map((item) => (
                            <div key={item.step} className="card-premium-pocket p-6 sm:p-8 relative overflow-hidden">
                                <div className="absolute -top-2 -right-2 text-6xl font-black text-[#1C2222]/[0.04] leading-none select-none">
                                    {item.step}
                                </div>
                                <div className="w-11 h-11 rounded-2xl bg-[#4BA0A2]/15 flex items-center justify-center mb-4">
                                    <item.icon className="h-5 w-5 text-[#4BA0A2]" />
                                </div>
                                <h3 className="text-lg font-extrabold text-[#1C2222] mb-2">{item.title}</h3>
                                <p className="text-sm text-[#1C2222]/50 leading-relaxed font-medium">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Testimonials ─── */}
            <section id="testimonials" className="pb-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-black text-[#1C2222] mb-3">Trusted by Healthcare Leaders</h2>
                        <p className="text-base text-[#1C2222]/50 font-medium">What medical professionals say about MediAI</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                        {[
                            {
                                name: "Dr. Sarah Johnson",
                                role: "Chief Radiologist",
                                quote: "This system has dramatically improved our diagnostic efficiency while maintaining the highest accuracy standards.",
                            },
                            {
                                name: "Dr. Michael Chen",
                                role: "Hospital Director",
                                quote: "The collaboration between radiologists and physicians has never been smoother. Patient care has improved significantly.",
                            },
                            {
                                name: "Dr. Lisa Martinez",
                                role: "Medical Director",
                                quote: "The digital reporting and compliance features save us hours each week. Highly recommended for any institution.",
                            },
                        ].map((testimonial, i) => (
                            <div key={i} className="card-premium-pocket p-6 sm:p-8">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, s) => (
                                        <div key={s} className="w-4 h-4 bg-amber-400 rounded-sm" />
                                    ))}
                                </div>
                                <p className="text-sm text-[#1C2222]/60 mb-6 leading-relaxed italic font-medium">
                                    &quot;{testimonial.quote}&quot;
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#4BA0A2]/20 rounded-full flex items-center justify-center text-[#4BA0A2] font-black text-sm">
                                        {testimonial.name.charAt(4)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-extrabold text-[#1C2222]">{testimonial.name}</p>
                                        <p className="text-xs text-[#1C2222]/40 font-bold">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA Section ─── */}
            <section className="pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-[#1C2222] rounded-[2rem] p-10 sm:p-16 text-center relative overflow-hidden">
                        <div className="absolute top-6 right-6 w-24 h-24 rounded-full bg-[#4BA0A2]/20 blur-2xl" />
                        <div className="absolute bottom-6 left-6 w-32 h-32 rounded-full bg-[#4BA0A2]/10 blur-3xl" />
                        <h2 className="text-2xl sm:text-3xl font-black text-white relative z-10">Ready to Transform Your Diagnostic Workflow?</h2>
                        <p className="text-base text-white/50 max-w-xl mx-auto mt-4 font-medium relative z-10">
                            Join healthcare institutions worldwide using MediAI for improved patient outcomes and operational efficiency.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 relative z-10">
                            <Button
                                size="lg"
                                className="bg-white text-[#1C2222] hover:bg-gray-100 rounded-full px-8 font-bold"
                                asChild
                            >
                                <Link href="/signup">Create Free Account</Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 font-bold bg-transparent"
                                asChild
                            >
                                <Link href="/login">Sign In</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="border-t border-[#1C2222]/10 py-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="bg-[#4BA0A2] w-8 h-8 rounded-xl flex items-center justify-center">
                                    <img src="/image.png" alt="Logo" className="w-full h-full object-cover rounded-xl" />
                                </div>
                                <span className="font-black text-[#1C2222]">MediAI</span>
                            </div>
                            <p className="text-sm text-[#1C2222]/40 leading-relaxed font-medium">
                                Advanced lung disease detection powered by AI for clinical professionals.
                            </p>
                        </div>
                        <div>
                            <p className="font-extrabold mb-4 text-sm text-[#1C2222]">Platform</p>
                            <ul className="space-y-2 text-sm text-[#1C2222]/40 font-medium">
                                <li><a href="#features" className="hover:text-[#1C2222] transition-colors">Features</a></li>
                                <li><a href="#how-it-works" className="hover:text-[#1C2222] transition-colors">How It Works</a></li>
                                <li><a href="#benefits" className="hover:text-[#1C2222] transition-colors">Benefits</a></li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-extrabold mb-4 text-sm text-[#1C2222]">Access</p>
                            <ul className="space-y-2 text-sm text-[#1C2222]/40 font-medium">
                                <li><Link href="/login" className="hover:text-[#1C2222] transition-colors">Sign In</Link></li>
                                <li><Link href="/signup" className="hover:text-[#1C2222] transition-colors">Request Access</Link></li>
                                <li><Link href="/forgot-password" className="hover:text-[#1C2222] transition-colors">Reset Password</Link></li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-extrabold mb-4 text-sm text-[#1C2222]">Legal</p>
                            <ul className="space-y-2 text-sm text-[#1C2222]/40 font-medium">
                                <li><span className="cursor-default">Privacy Policy</span></li>
                                <li><span className="cursor-default">Terms of Service</span></li>
                                <li><span className="cursor-default">HIPAA Compliance</span></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-[#1C2222]/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[#1C2222]/40 font-medium">
                        <p>&copy; 2025 MediAI. All rights reserved.</p>
                        <p>Built for clinical excellence.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
