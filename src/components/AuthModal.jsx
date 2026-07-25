import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  hasFirebaseCredentials,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup
} from '../utils/firebase';
import { hasSupabaseCredentials } from '../utils/supabase';

export default function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!hasFirebaseCredentials) {
      setError("Firebase Authentication is not configured. Add credentials to your .env file.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').replace('auth/', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    if (!hasFirebaseCredentials) {
      setError("Firebase Authentication is not configured. Add credentials to your .env file.");
      return;
    }

    setLoading(true);
    try {
      // Try popup authentication first (prevents full window redirects which lose port bindings on mobile)
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      console.warn("signInWithPopup failed, attempting redirect fallback...", err);
      // Fallback to redirect if popup fails or is blocked
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.error(redirectErr);
        setError(redirectErr.message.replace('Firebase:', '').replace('auth/', ''));
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl glass-panel-3 border border-white/10 shadow-2xl p-8 relative flex flex-col gap-6">
        
        {/* Floating gradient orb in background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/15 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Header */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl font-black">hdr_auto</span>
            <h2 className="text-xl font-black tracking-tight text-white">Vibe Deck Space</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/15 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Credentials Status Indicators */}
        <div className="flex gap-2.5 z-10">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
            hasFirebaseCredentials ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasFirebaseCredentials ? 'bg-green-400' : 'bg-amber-400'}`} />
            Firebase Auth: {hasFirebaseCredentials ? 'Active' : 'Offline'}
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
            hasSupabaseCredentials ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasSupabaseCredentials ? 'bg-green-400' : 'bg-amber-400'}`} />
            Supabase DB: {hasSupabaseCredentials ? 'Active' : 'Offline'}
          </span>
        </div>

        {/* Main Content Area */}
        {(!hasFirebaseCredentials || !hasSupabaseCredentials || showDocs) ? (
          <div className="space-y-4 z-10 max-h-[400px] overflow-y-auto pr-1">
            <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-xs text-amber-400/90 leading-relaxed">
              <div className="flex items-center gap-2 mb-2 font-bold">
                <span className="material-symbols-outlined text-base">warning</span>
                <span>Offline-First Mode Activated</span>
              </div>
              Vibe Deck will continue running perfectly in local mode using browser storage. If you want cross-device syncing, follow these quick setup steps to enable cloud databases!
            </div>
            
            <div className="space-y-3.5">
              <h4 className="text-xs font-black uppercase text-primary tracking-wider">🛠️ Credential Setup Guide:</h4>
              <div className="space-y-2.5 text-xs text-on-surface-variant leading-relaxed">
                <div>
                  <strong className="text-white">1. Firebase Console:</strong> Create a project at <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-secondary underline hover:text-white">firebase.google.com</a>, add a Web App, and enable Email/Password and Google sign-in.
                </div>
                <div>
                  <strong className="text-white">2. Supabase Console:</strong> Create a database at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-secondary underline hover:text-white">supabase.com</a>. Copy the URL and Anon Key.
                </div>
                <div>
                  <strong className="text-white">3. Configure .env:</strong> Add these keys to the `.env` file in your project root folder:
                  <pre className="mt-1.5 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-primary/80 overflow-x-auto select-all">
{`VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key`}
                  </pre>
                </div>
              </div>
            </div>

            {hasFirebaseCredentials && hasSupabaseCredentials && (
              <button 
                onClick={() => setShowDocs(false)}
                className="w-full mt-4 bg-white/5 border border-white/10 text-white font-bold py-3 rounded-full text-xs hover:bg-white/10 transition-all active:scale-98"
              >
                Back to Auth Form
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4 z-10">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{error}</span>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white/10 transition-all"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white/10 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white/10 transition-all"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-on-primary font-bold py-3 rounded-full text-xs hover:scale-103 transition-all active:scale-97 shadow-lg shadow-primary/25 disabled:opacity-50 select-none cursor-pointer mt-2"
            >
              {loading ? 'Authenticating...' : isSignUp ? 'Create Cloud Profile' : 'Access Space Profile'}
            </button>

            <div className="relative my-6 text-center">
              <div className="absolute inset-y-1/2 left-0 right-0 h-[1px] bg-white/10" />
              <span className="relative bg-[#161724] px-4 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Or Continue With</span>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 text-white font-bold py-3 rounded-full text-xs flex items-center justify-center gap-2.5 hover:bg-white/10 hover:border-white/20 transition-all active:scale-98 cursor-pointer select-none"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Auth Account
            </button>

            <div className="flex items-center justify-between text-[11px] pt-4 border-t border-white/5 font-bold">
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
              <button 
                type="button"
                onClick={() => setShowDocs(true)}
                className="text-primary hover:text-white transition-colors cursor-pointer"
              >
                View Setup Guide
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
