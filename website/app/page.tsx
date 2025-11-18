export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary font-serif">
                Sterling Wealth Management
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#services" className="text-muted hover:text-primary transition-colors font-body">Services</a>
              <a href="#about" className="text-muted hover:text-primary transition-colors font-body">About Us</a>
              <a href="#team" className="text-muted hover:text-primary transition-colors font-body">Our Team</a>
              <a href="#insights" className="text-muted hover:text-primary transition-colors font-body">Insights</a>
              <a href="#contact" className="text-muted hover:text-primary transition-colors font-body">Contact</a>
            </nav>
            <div className="flex items-center space-x-4">
              <button className="text-primary hover:bg-secondary px-4 py-2 rounded-md transition-colors font-sans">
                Client Login
              </button>
              <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-sans">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-b from-white to-secondary/50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-5xl md:text-6xl font-bold text-primary mb-6 font-serif">
              Your Future.<br />Our Focus.
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto mb-8 leading-relaxed font-body">
              Sterling Wealth Management brings fresh perspectives to wealth creation and preservation. We combine innovative strategies with proven investment principles to help Australian families and businesses build lasting prosperity.
            </p>
            <div className="flex gap-4 justify-center">
              <button className="bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-md text-lg font-sans">
                Schedule Consultation
              </button>
              <button className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-4 rounded-md text-lg font-sans transition-colors">
                Download Brochure
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-center text-primary mb-4 font-serif">
            Our Services
          </h3>
          <p className="text-center text-muted mb-12 text-lg font-body">
            Comprehensive wealth management solutions tailored to your unique circumstances
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg hover:shadow-lg transition-shadow">
              <h4 className="text-2xl font-bold mb-4 text-primary font-serif">Private Wealth Management</h4>
              <p className="text-muted leading-relaxed mb-4 font-body">
                Bespoke portfolio construction and management for high-net-worth individuals and families. Our approach combines institutional-grade research with personalised service.
              </p>
              <ul className="space-y-2 text-sm text-muted font-sans">
                <li>• Asset allocation strategies</li>
                <li>• Risk management</li>
                <li>• Tax-effective investing</li>
                <li>• Regular portfolio reviews</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg hover:shadow-lg transition-shadow">
              <h4 className="text-2xl font-bold mb-4 text-primary font-serif">Estate Planning</h4>
              <p className="text-muted leading-relaxed mb-4 font-body">
                Protect and preserve your wealth for future generations with comprehensive estate planning services designed to minimise tax and maximise legacy.
              </p>
              <ul className="space-y-2 text-sm text-muted font-sans">
                <li>• Succession planning</li>
                <li>• Trust structures</li>
                <li>• Philanthropic strategies</li>
                <li>• Family governance</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg hover:shadow-lg transition-shadow">
              <h4 className="text-2xl font-bold mb-4 text-primary font-serif">Corporate Advisory</h4>
              <p className="text-muted leading-relaxed mb-4 font-body">
                Strategic financial advice for business owners and executives, including business succession, employee benefits, and corporate investment strategies.
              </p>
              <ul className="space-y-2 text-sm text-muted font-sans">
                <li>• Executive compensation</li>
                <li>• Business valuation</li>
                <li>• Merger & acquisition support</li>
                <li>• Key person insurance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <h4 className="text-4xl font-bold text-primary mb-2 font-serif">100%</h4>
              <p className="text-muted font-body">Client Focused</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold text-primary mb-2 font-serif">24/7</h4>
              <p className="text-muted font-body">Available Support</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold text-primary mb-2 font-serif">AFSL</h4>
              <p className="text-muted font-body">Fully Licensed</p>
            </div>
            <div>
              <h4 className="text-4xl font-bold text-primary mb-2 font-serif">2024</h4>
              <p className="text-muted font-body">Founded</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-center text-primary mb-4 font-serif">
            Get in Touch
          </h3>
          <p className="text-center text-muted mb-12 text-lg font-body">
            Start your wealth management journey with Sterling. We&apos;re here to help you achieve your financial goals.
          </p>
          <div className="max-w-2xl mx-auto">
            <form className="bg-gray-50 p-8 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 font-sans">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 font-sans">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="mb-6">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2 font-sans">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2 font-sans">
                  Your Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Please tell us about your financial goals and how we can help you..."
                  required
                ></textarea>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent/90 text-white px-8 py-3 rounded-md text-lg font-sans transition-colors"
                >
                  Send Message
                </button>
              </div>
            </form>
            <div className="mt-8 text-center">
              <p className="text-muted font-body">
                Or call us directly at <span className="font-semibold text-primary">(03) 9000 0000</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <h4 className="text-2xl font-bold mb-4 font-serif">Sterling Wealth Management</h4>
              <p className="text-gray-300 mb-4 font-body">
                A new approach to wealth management for modern Australian families and businesses.
              </p>
              <p className="text-sm text-gray-400 font-sans">
                Sterling Wealth Management Pty Ltd | ABN 12 345 678 901<br />
                Australian Financial Services License No. 234567
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4 font-sans">Quick Links</h5>
              <ul className="space-y-2 text-gray-300 font-sans">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Financial Services Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Complaints Procedure</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4 font-sans">Contact</h5>
              <p className="text-gray-300 font-sans">
                Level 42, 101 Collins Street<br />
                Melbourne VIC 3000<br />
                Phone: (03) 9000 0000<br />
                Email: enquiries@sterlingwealth.com.au
              </p>
            </div>
          </div>
          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-sm text-gray-400 font-sans">
            <p>© 2024 Sterling Wealth Management. All rights reserved.</p>
            <p className="mt-2">General Advice Warning: The information provided on this website is general in nature and does not take into account your personal objectives, financial situation or needs.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}