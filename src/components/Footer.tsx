import Container from "./Container";

const Footer = () => {
  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors pt-14 pb-8">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8">
          {/* Brand & Description */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <img
                alt="Tracal Logo"
                className="w-auto h-8 object-contain shrink-0"
                src="/logo.png"
              />
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Tracal</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connecting travelers with local hosts for authentic experiences, beautiful homestays, and affordable prices worldwide.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">About</h4>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">How Tracal works</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Investors</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Careers</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Press</a>
          </div>

          {/* Hosting */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Host</h4>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Host your home</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Host an experience</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Responsible hosting</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Community forum</a>
          </div>

          {/* Connect */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Connect</h4>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Help Center</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Trust & Safety</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Terms of Service</a>
            <a href="#" className="flex text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">Privacy Policy</a>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-left">
            &copy; {new Date().getFullYear()} Tracal, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-200 transition">Facebook</a>
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-200 transition">Twitter</a>
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-200 transition">Instagram</a>
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-200 transition">LinkedIn</a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
