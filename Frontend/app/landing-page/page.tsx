"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Brain, CheckCircle2, ImageIcon, Users, Zap, Lock } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="h-8 w-8 text-primary" />
                        <span className="text-xl font-bold">MediAI CAD</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm hover:text-primary transition">
                            Features
                        </a>
                        <a href="#benefits" className="text-sm hover:text-primary transition">
                            Benefits
                        </a>
                        <a href="#how-it-works" className="text-sm hover:text-primary transition">
                            How It Works
                        </a>
                        <a href="#pricing" className="text-sm hover:text-primary transition">
                            Pricing
                        </a>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm">
                            Log In
                        </Button>
                        <Button size="sm">Get Started</Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center space-y-8 mb-16">
                    <div className="inline-block bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm text-primary">
                        AI-Powered Medical Imaging Analysis
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold text-balance">
                        Intelligent Diagnostic Support for Medical Professionals
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
                        Transform medical imaging analysis with our advanced AI system. Designed for radiologists and physicians to
                        improve diagnostic accuracy and streamline workflows.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Button size="lg" className="text-base">
                            Get Started Now
                        </Button>
                    </div>
                </div>

                {/* Hero Image */}
                <div className="rounded-xl border border-border bg-card p-8 overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                            <p className="text-muted-foreground">Medical Imaging Interface</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Key Metrics */}
            <section className="bg-card py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8 text-center">
                    <div>
                        <div className="text-4xl font-bold text-primary mb-2">99%</div>
                        <p className="text-muted-foreground">Diagnostic Accuracy</p>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-primary mb-2">10,000+</div>
                        <p className="text-muted-foreground">Cases Analyzed</p>
                    </div>
                    <div>
                        <div className="text-4xl font-bold text-primary mb-2">500+</div>
                        <p className="text-muted-foreground">Healthcare Institutions</p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Everything you need for comprehensive medical image analysis and diagnosis support
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    {/* Feature 1 */}
                    <Card className="p-8 hover:shadow-lg transition-shadow">
                        <Brain className="h-12 w-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Advanced AI Detection</h3>
                        <p className="text-muted-foreground">
                            Our trained neural networks detect pneumonia, tuberculosis, tumors, and other conditions with
                            clinical-grade accuracy.
                        </p>
                    </Card>

                    {/* Feature 2 */}
                    <Card className="p-8 hover:shadow-lg transition-shadow">
                        <ImageIcon className="h-12 w-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Annotated Imaging</h3>
                        <p className="text-muted-foreground">
                            Automatic bounding boxes and color-coded regions highlight detected abnormalities for quick visualization.
                        </p>
                    </Card>

                    {/* Feature 3 */}
                    <Card className="p-8 hover:shadow-lg transition-shadow">
                        <Users className="h-12 w-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Multi-Level Review Workflow</h3>
                        <p className="text-muted-foreground">
                            Radiologists validate AI findings, doctors review radiologist assessments, and both provide detailed
                            clinical notes.
                        </p>
                    </Card>

                    {/* Feature 4 */}
                    <Card className="p-8 hover:shadow-lg transition-shadow">
                        <Lock className="h-12 w-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">HIPAA Compliant & Secure</h3>
                        <p className="text-muted-foreground">
                            Enterprise-grade security with full data encryption, access controls, and audit trails for complete
                            compliance.
                        </p>
                    </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Feature 5 */}
                    <Card className="p-8 hover:shadow-lg transition-shadow">
                        <Zap className="h-12 w-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Real-Time Analysis</h3>
                        <p className="text-muted-foreground">
                            Get instant AI predictions on uploaded scans with confidence scores and severity assessment.
                        </p>
                    </Card>

                    {/* Feature 6 */}
                    <Card className="p-8 hover:shadow-lg transition-shadow">
                        <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Digital Reporting</h3>
                        <p className="text-muted-foreground">
                            Generate professional medical reports with digital signatures, automated formatting, and export options.
                        </p>
                    </Card>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="bg-card py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-4xl font-bold mb-6">Built for Medical Professionals</h2>
                            <ul className="space-y-4">
                                {[
                                    "Reduce diagnostic errors and improve patient outcomes",
                                    "Accelerate case review process with AI assistance",
                                    "Maintain complete audit trails for compliance",
                                    "Collaborate seamlessly between radiologists and physicians",
                                    "Access detailed case history and patient records",
                                    "Export professional medical reports instantly",
                                ].map((benefit, i) => (
                                    <li key={i} className="flex gap-3">
                                        <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                                        <span className="text-lg">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-8">
                            <div className="aspect-square bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <Users className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                                    <p className="text-muted-foreground">Collaborative Interface</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">How It Works</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Simple three-step process for comprehensive diagnostic support
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            step: "1",
                            title: "Upload & Analyze",
                            description:
                                "Upload medical scans (X-ray, CT, MRI) and our AI instantly analyzes the images with high precision.",
                        },
                        {
                            step: "2",
                            title: "Radiologist Review",
                            description:
                                "Radiologists review AI predictions, validate findings, add annotations, and provide expert assessment.",
                        },
                        {
                            step: "3",
                            title: "Doctor Diagnosis",
                            description:
                                "Physicians review all findings and radiologist notes, then submit final diagnosis and treatment plan.",
                        },
                    ].map((item) => (
                        <div key={item.step} className="text-center">
                            <div className="inline-block bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold mb-4">
                                {item.step}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                            <p className="text-muted-foreground">{item.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials */}
            <section className="bg-card py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Trusted by Healthcare Leaders</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
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
                            <Card key={i} className="p-6">
                                <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                                <div>
                                    <p className="font-bold">{testimonial.name}</p>
                                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="bg-primary text-primary-foreground rounded-2xl p-12 text-center space-y-8">
                    <h2 className="text-4xl font-bold">Ready to Transform Your Diagnostic Workflow?</h2>
                    <p className="text-lg max-w-2xl mx-auto opacity-90">
                        Join healthcare institutions worldwide using MediAI CAD for improved patient outcomes and operational
                        efficiency.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" variant="secondary" className="text-base">
                            Contact Us
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="text-base bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20"
                        >
                            Sign Up Now!
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
                                <Brain className="h-6 w-6 text-primary" />
                                <span className="font-bold">MediAI CAD</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Advanced diagnostic support powered by AI</p>
                        </div>
                        <div>
                            <p className="font-bold mb-4 text-sm">Product</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Features
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Pricing
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Security
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold mb-4 text-sm">Company</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        About
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Blog
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Careers
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold mb-4 text-sm">Legal</p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Privacy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Terms
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="hover:text-foreground">
                                        Compliance
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
                        <p>&copy; 2025 MediAI CAD. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
