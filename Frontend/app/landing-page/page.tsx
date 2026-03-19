"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Users, Zap, Lock, Activity, Shield, FileText, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight">MediAI <span className="text-blue-600">CAD</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </a>
                        <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Benefits
                        </a>
                        <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            How It Works
                        </a>
                        <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Testimonials
                        </a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/login">Log In</Link>
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                            <Link href="/signup">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center space-y-6 mb-16">
                    <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-1.5 text-sm text-blue-700 dark:text-blue-300 font-medium">
                        <Activity className="h-4 w-4" />
                        AI-Powered Medical Imaging Analysis
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                        Intelligent Diagnostic Support<br className="hidden md:block" />
                        <span className="text-blue-600"> for Medical Professionals</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Transform lung disease detection with our advanced AI system. Designed for radiologists and
                        physicians to improve diagnostic accuracy and streamline clinical workflows.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8" asChild>
                            <Link href="/signup">
                                Get Started Now
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/login">Sign In to Platform</Link>
                        </Button>
                    </div>
                </div>

                {/* Stats Banner */}
                <div className="grid grid-cols-3 gap-6 rounded-2xl border border-border bg-card p-8 mb-4">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-1">99%</div>
                        <p className="text-sm text-muted-foreground">Diagnostic Accuracy</p>
                    </div>
                    <div className="text-center border-x border-border">
                        <div className="text-4xl font-bold text-blue-600 mb-1">10K+</div>
                        <p className="text-sm text-muted-foreground">Cases Analyzed</p>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-1">500+</div>
                        <p className="text-sm text-muted-foreground">Healthcare Institutions</p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="bg-card py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-bold mb-3">Powerful Clinical Features</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Everything you need for comprehensive medical image analysis and diagnosis support
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="p-6 hover:shadow-md transition-shadow border-border">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center mb-4">
                                <Activity className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Advanced AI Detection</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Trained neural networks detect pneumonia, tuberculosis, tumors, and other lung conditions with clinical-grade accuracy.
                            </p>
                        </Card>

                        <Card className="p-6 hover:shadow-md transition-shadow border-border">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center mb-4">
                                <Activity className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Annotated Imaging</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Automatic bounding boxes and color-coded regions highlight detected abnormalities for quick, precise visualization.
                            </p>
                        </Card>

                        <Card className="p-6 hover:shadow-md transition-shadow border-border">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center mb-4">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Multi-Level Review Workflow</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Radiologists validate AI findings, doctors review assessments, and both provide detailed clinical notes seamlessly.
                            </p>
                        </Card>

                        <Card className="p-6 hover:shadow-md transition-shadow border-border">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center mb-4">
                                <Lock className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">HIPAA Compliant & Secure</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Enterprise-grade security with full data encryption, role-based access controls, and complete audit trails.
                            </p>
                        </Card>

                        <Card className="p-6 hover:shadow-md transition-shadow border-border">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Real-Time Analysis</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Get instant AI predictions on uploaded scans with confidence scores, severity assessment, and priority flagging.
                            </p>
                        </Card>

                        <Card className="p-6 hover:shadow-md transition-shadow border-border">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center mb-4">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Digital Reporting</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Generate professional medical reports with digital signatures, automated formatting, and PDF export options.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold mb-4">Built for Medical Professionals</h2>
                        <p className="text-muted-foreground mb-8 leading-relaxed">
                            Designed in collaboration with clinical teams to fit naturally into hospital workflows — not replace them.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "Reduce diagnostic errors and improve patient outcomes",
                                "Accelerate case review with AI-assisted analysis",
                                "Maintain complete audit trails for regulatory compliance",
                                "Collaborate seamlessly between radiologists and physicians",
                                "Access full case history and patient records in one place",
                                "Export professional medical reports instantly",
                            ].map((benefit, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="mt-0.5 w-5 h-5 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                                    </div>
                                    <span className="text-sm leading-relaxed">{benefit}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                                <Link href="/signup">
                                    Request Access
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-6 text-center border-border">
                            <div className="text-3xl font-bold text-blue-600 mb-1">3x</div>
                            <p className="text-sm text-muted-foreground">Faster case review</p>
                        </Card>
                        <Card className="p-6 text-center border-border">
                            <div className="text-3xl font-bold text-blue-600 mb-1">40%</div>
                            <p className="text-sm text-muted-foreground">Fewer missed findings</p>
                        </Card>
                        <Card className="p-6 text-center border-border">
                            <div className="text-3xl font-bold text-blue-600 mb-1">24/7</div>
                            <p className="text-sm text-muted-foreground">AI availability</p>
                        </Card>
                        <Card className="p-6 text-center border-border">
                            <div className="w-8 h-8 mx-auto mb-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center">
                                <Shield className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-sm font-medium">HIPAA Compliant</p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="bg-card py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-bold mb-3">How It Works</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            A simple three-step process for comprehensive diagnostic support
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                step: "01",
                                title: "Upload & Analyze",
                                description:
                                    "Upload chest X-rays or CT scans. Our AI instantly analyzes the images and generates predictions with confidence scores.",
                            },
                            {
                                step: "02",
                                title: "Radiologist Review",
                                description:
                                    "Radiologists review AI predictions, validate findings, add annotations, adjust confidence thresholds, and provide expert assessment.",
                            },
                            {
                                step: "03",
                                title: "Doctor Diagnosis",
                                description:
                                    "Physicians review all findings and radiologist notes, then submit the final diagnosis and recommended treatment plan.",
                            },
                        ].map((item) => (
                            <div key={item.step} className="relative">
                                <div className="text-6xl font-bold text-blue-100 dark:text-blue-950 mb-4 leading-none">
                                    {item.step}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center mb-14">
                    <h2 className="text-3xl font-bold mb-3">Trusted by Healthcare Leaders</h2>
                    <p className="text-lg text-muted-foreground">What medical professionals say about MediAI CAD</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            name: "Dr. Sarah Johnson",
                            role: "Chief Radiologist",
                            quote:
                                "This system has dramatically improved our diagnostic efficiency while maintaining the highest accuracy standards.",
                        },
                        {
                            name: "Dr. Michael Chen",
                            role: "Hospital Director",
                            quote:
                                "The collaboration between radiologists and physicians has never been smoother. Patient care has improved significantly.",
                        },
                        {
                            name: "Dr. Lisa Martinez",
                            role: "Medical Director",
                            quote:
                                "The digital reporting and compliance features save us hours each week. Highly recommended for any institution.",
                        },
                    ].map((testimonial, i) => (
                        <Card key={i} className="p-6 border-border">
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, s) => (
                                    <div key={s} className="w-4 h-4 bg-yellow-400 rounded-sm" />
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground mb-6 leading-relaxed italic">
                                &quot;{testimonial.quote}&quot;
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                    {testimonial.name.charAt(3)}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{testimonial.name}</p>
                                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-blue-600 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                    <h2 className="text-3xl font-bold text-white">Ready to Transform Your Diagnostic Workflow?</h2>
                    <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                        Join healthcare institutions worldwide using MediAI CAD for improved patient outcomes and operational efficiency.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold" asChild>
                            <Link href="/signup">Create Free Account</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-12 bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="font-bold">MediAI <span className="text-blue-600">CAD</span></span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Advanced lung disease detection powered by AI for clinical professionals.
                            </p>
                        </div>
                        <div>
                            <p className="font-semibold mb-4 text-sm">Platform</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
                                <li><a href="#benefits" className="hover:text-foreground transition-colors">Benefits</a></li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold mb-4 text-sm">Access</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                                <li><Link href="/signup" className="hover:text-foreground transition-colors">Request Access</Link></li>
                                <li><Link href="/forgot-password" className="hover:text-foreground transition-colors">Reset Password</Link></li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold mb-4 text-sm">Legal</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><span className="cursor-default">Privacy Policy</span></li>
                                <li><span className="cursor-default">Terms of Service</span></li>
                                <li><span className="cursor-default">HIPAA Compliance</span></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
                        <p>&copy; 2025 MediAI CAD. All rights reserved.</p>
                        <p>Built for clinical excellence.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
