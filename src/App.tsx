// ============================================
// App Root — auth gate matching selection-tool login design
// ============================================

import { useState, useEffect } from 'react';
import { useAuth } from './services/auth';
import { DataProvider } from './contexts/DataContext';
import AppShell from './components/AppShell';
import { RefreshCw } from 'lucide-react';

function AuthGate() {
  const { isAuthenticated, isLoading, error, signIn } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [floatingShapes, setFloatingShapes] = useState<Array<{ x: number; y: number; size: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    setIsLoaded(true);
    const shapes = Array.from({ length: 8 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 200 + 100,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
    }));
    setFloatingShapes(shapes);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-sm text-slate-500">Authenticating…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {floatingShapes.map((shape, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-30 animate-float"
              style={{
                left: `${shape.x}%`,
                top: `${shape.y}%`,
                width: shape.size,
                height: shape.size,
                background: i % 3 === 0
                  ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                  : i % 3 === 1
                    ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                    : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                animationDuration: `${shape.duration}s`,
                animationDelay: `${shape.delay}s`,
                filter: 'blur(40px)',
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div className={`relative z-10 max-w-md w-full transition-all duration-1000 ease-out ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Logo Section */}
          <div className="text-center mb-10">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-indigo-400/40 blur-3xl rounded-full animate-pulse" />
              <img
                src="/elevate-logo.png"
                alt="Elevate Logo"
                className="relative h-40 w-auto object-contain mx-auto mb-6 drop-shadow-lg animate-fade-in-up"
                style={{ animationDelay: '0.2s' }}
              />
            </div>
            <p
              className="text-xl font-semibold text-indigo-600 tracking-tight animate-fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              Advisor Pipeline
            </p>
          </div>

          {/* Login Card */}
          <div
            className="relative bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-white/50 shadow-2xl animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-3xl" />

            <div className="relative">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Welcome Back</h2>
                <p className="text-sm text-slate-600">Sign in with your Gaza Sky Geeks account</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Google Sign-In Button */}
              <div className="flex justify-center mb-6">
                <button
                  onClick={signIn}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02]"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>

              {/* Features */}
              <div className="space-y-3">
                {[
                  { icon: '🔒', title: 'Secure Access', desc: 'Authorized team members only' },
                  { icon: '📊', title: 'Real-Time Sync', desc: 'Live Google Sheets integration' },
                  { icon: '🤝', title: 'Advisor Management', desc: 'Pipeline, scoring & follow-ups' },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors duration-300"
                  >
                    <span className="text-xl">{feature.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{feature.title}</p>
                      <p className="text-xs text-slate-500">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Access Notice */}
              <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-800 font-medium">
                  Access is restricted to authorized @gazaskygeeks.com team members
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 animate-fade-in-up" style={{ animationDelay: '1s' }}>
            <p className="text-xs text-slate-500">
              Gaza Sky Geeks © 2026 • Elevate Program
            </p>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.05); }
            66% { transform: translate(-20px, 20px) scale(0.95); }
          }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-float { animation: float ease-in-out infinite; }
          .animate-fade-in-up { animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}

export default function App() {
  return <AuthGate />;
}
