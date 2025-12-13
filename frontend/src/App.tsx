import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import WelcomeOverlay from './components/WelcomeOverlay';
import ProtectedRoute from './components/ProtectedRoute';
import SignInPage from './pages/SignIn';
import SignUpPage from './pages/SignUp';
import Today from './pages/Today';
import WorkoutLog from './pages/WorkoutLog';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isSignedIn } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinks = [
    { to: '/', label: 'Today' },
    { to: '/workout-log', label: 'Workout Log' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/profile', label: 'Profile' },
  ];

  // Don't show navigation on auth pages
  if (location.pathname === '/sign-in' || location.pathname === '/sign-up') {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900">
                SmartFit Flow
              </Link>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`${
                    isActive(link.to)
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isSignedIn ? (
              <>
                {/* Desktop UserButton */}
                <div className="hidden sm:block">
                  <UserButton 
                    afterSignOutUrl="/sign-in"
                    appearance={{
                      elements: {
                        userButtonPopoverCard: "shadow-lg",
                        userButtonPopoverActions: "border-t border-gray-200"
                      }
                    }}
                  />
                </div>
                {/* Mobile menu button */}
                <div className="flex items-center sm:hidden">
                  <UserButton 
                    afterSignOutUrl="/sign-in"
                    appearance={{
                      elements: {
                        userButtonPopoverCard: "shadow-lg",
                        userButtonPopoverActions: "border-t border-gray-200"
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="ml-2 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                    aria-expanded="false"
                  >
                    <span className="sr-only">Open main menu</span>
                    {!mobileMenuOpen ? (
                      <svg
                        className="block h-6 w-6"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="block h-6 w-6"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/sign-in"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 px-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`${
                  isActive(link.to)
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <WelcomeOverlay />
        <Navigation />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            {/* Public routes */}
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Today />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workout-log"
              element={
                <ProtectedRoute>
                  <WorkoutLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            
            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
