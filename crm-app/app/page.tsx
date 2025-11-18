import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>
                Sterling Wealth Management
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#services" className="text-muted-foreground hover:text-primary transition-colors" style={{ fontFamily: 'Crimson Text, serif' }}>Services</a>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-colors" style={{ fontFamily: 'Crimson Text, serif' }}>About Us</a>
              <a href="#team" className="text-muted-foreground hover:text-primary transition-colors" style={{ fontFamily: 'Crimson Text, serif' }}>Our Team</a>
              <a href="#insights" className="text-muted-foreground hover:text-primary transition-colors" style={{ fontFamily: 'Crimson Text, serif' }}>Insights</a>
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors" style={{ fontFamily: 'Crimson Text, serif' }}>Contact</a>
            </nav>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-primary hover:bg-secondary" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Client Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-b from-white to-secondary/30 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-5xl md:text-6xl font-bold text-primary mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              Building Wealth.<br />Preserving Legacy.
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed" style={{ fontFamily: 'Crimson Text, serif' }}>
              For over four decades, Sterling Wealth Management has been the trusted advisor to Australia&apos;s most successful families and institutions. We combine time-honoured investment principles with modern portfolio strategies.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-6 text-lg" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Schedule Consultation
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white px-8 py-6 text-lg" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Download Brochure
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-center text-primary mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Our Services
          </h3>
          <p className="text-center text-muted-foreground mb-12 text-lg" style={{ fontFamily: 'Crimson Text, serif' }}>
            Comprehensive wealth management solutions tailored to your unique circumstances
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow">
              <h4 className="text-2xl font-bold mb-4 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>Private Wealth Management</h4>
              <p className="text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: 'Crimson Text, serif' }}>
                Bespoke portfolio construction and management for high-net-worth individuals and families. Our approach combines institutional-grade research with personalised service.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground" style={{ fontFamily: 'Roboto, sans-serif' }}>
                <li>• Asset allocation strategies</li>
                <li>• Risk management</li>
                <li>• Tax-effective investing</li>
                <li>• Regular portfolio reviews</li>
              </ul>
            </div>
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow">
              <h4 className="text-2xl font-bold mb-4 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>Estate Planning</h4>
              <p className="text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: 'Crimson Text, serif' }}>
                Protect and preserve your wealth for future generations with comprehensive estate planning services designed to minimise tax and maximise legacy.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground" style={{ fontFamily: 'Roboto, sans-serif' }}>
                <li>• Succession planning</li>
                <li>• Trust structures</li>
                <li>• Philanthropic strategies</li>
                <li>• Family governance</li>
              </ul>
            </div>
            <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow">
              <h4 className="text-2xl font-bold mb-4 text-primary" style={{ fontFamily: 'Playfair Display, serif' }}>Corporate Advisory</h4>
              <p className="text-muted-foreground leading-relaxed mb-4" style={{ fontFamily: 'Crimson Text, serif' }}>
                Strategic financial advice for business owners and executives, including business succession, employee benefits, and corporate investment strategies.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground" style={{ fontFamily: 'Roboto, sans-serif' }}>
                <li>• Executive compensation</li>
                <li>• Business valuation</li>
                <li>• Merger & acquisition support</li>
                <li>• Key person insurance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <h4 className="text-4xl font-bold text-primary mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>$4.2B</h4>
              <p className="text-muted-foreground" style={{ fontFamily: 'Crimson Text, serif' }}>Assets Under Management</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold text-primary mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>45+</h4>
              <p className="text-muted-foreground" style={{ fontFamily: 'Crimson Text, serif' }}>Years of Excellence</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold text-primary mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>1,200</h4>
              <p className="text-muted-foreground" style={{ fontFamily: 'Crimson Text, serif' }}>Client Families</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold text-primary mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>98%</h4>
              <p className="text-muted-foreground" style={{ fontFamily: 'Crimson Text, serif' }}>Client Retention</p>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-center text-primary mb-12" style={{ fontFamily: 'Playfair Display, serif' }}>
            Client Testimonials
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card p-8 rounded-lg border border-border">
              <p className="text-muted-foreground italic text-lg leading-relaxed mb-6" style={{ fontFamily: 'Crimson Text, serif' }}>
                "Sterling Wealth Management has been instrumental in securing our family&apos;s financial future. Their expertise and personalised approach have exceeded our expectations for over 15 years."
              </p>
              <div className="border-t border-border pt-4">
                <p className="font-semibold text-primary" style={{ fontFamily: 'Roboto, sans-serif' }}>Margaret Thompson</p>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Roboto, sans-serif' }}>CEO, Thompson Industries</p>
              </div>
            </div>
            <div className="bg-card p-8 rounded-lg border border-border">
              <p className="text-muted-foreground italic text-lg leading-relaxed mb-6" style={{ fontFamily: 'Crimson Text, serif' }}>
                "The team&apos;s deep understanding of both local and global markets has been invaluable. They&apos;ve helped us navigate complex financial decisions with confidence and clarity."
              </p>
              <div className="border-t border-border pt-4">
                <p className="font-semibold text-primary" style={{ fontFamily: 'Roboto, sans-serif' }}>Dr. James Mitchell</p>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Roboto, sans-serif' }}>Medical Specialist</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <h4 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Sterling Wealth Management</h4>
              <p className="text-primary-foreground/80 mb-4" style={{ fontFamily: 'Crimson Text, serif' }}>
                Trusted advisors to Australia&apos;s most successful families since 1978.
              </p>
              <p className="text-sm text-primary-foreground/60" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Sterling Wealth Management Pty Ltd | ABN 12 345 678 901<br />
                Australian Financial Services License No. 234567
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>Quick Links</h5>
              <ul className="space-y-2 text-primary-foreground/80" style={{ fontFamily: 'Roboto, sans-serif' }}>
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Financial Services Guide</a></li>
                <li><a href="#" className="hover:text-primary-foreground transition-colors">Complaints Procedure</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>Contact</h5>
              <p className="text-primary-foreground/80" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Level 42, 101 Collins Street<br />
                Melbourne VIC 3000<br />
                Phone: (03) 9000 0000<br />
                Email: enquiries@sterlingwealth.com.au
              </p>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/60" style={{ fontFamily: 'Roboto, sans-serif' }}>
            <p>© 2024 Sterling Wealth Management. All rights reserved.</p>
            <p className="mt-2">General Advice Warning: The information provided on this website is general in nature and does not take into account your personal objectives, financial situation or needs.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}