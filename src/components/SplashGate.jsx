import { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  hasFirebaseCredentials,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect 
} from '../utils/firebase';
import Logo from './Logo';

export default function SplashGate() {
  const [gateState, setGateState] = useState('intro'); // 'intro' | 'zoom' | 'auth'
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Play a beautiful 2.0-second intro pulsing, then trigger 0.8s zoom-in, then show auth
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setGateState('zoom');
      
      const timer2 = setTimeout(() => {
        setGateState('auth');
      }, 800);
      
      return () => clearTimeout(timer2);
    }, 2000);
    
    return () => clearTimeout(timer1);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!hasFirebaseCredentials) {
      setError("Authentication credentials missing in .env file.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
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
      setError("Authentication credentials missing in .env file.");
      return;
    }

    setLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').replace('auth/', ''));
      setLoading(false);
    }
  };

  // Render Starting Splash Loader & Epic Zoom Transition
  if (gateState === 'intro' || gateState === 'zoom') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden select-none transition-all duration-700">
        
        {/* Dynamic spinning cosmic background orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] border border-white/5 rounded-full animate-orbitSpin pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-dashed border-primary/10 rounded-full animate-orbitSpin pointer-events-none" style={{ animationDirection: 'reverse' }} />
        
        <div className="flex flex-col items-center gap-6 relative z-10">
          <Logo 
            size="xl"
            className={`transition-all duration-300 ${
              gateState === 'zoom' ? 'animate-zoomIn' : 'animate-pulseGlow'
            }`}
          />
          
          {gateState === 'intro' && (
            <div className="flex flex-col items-center gap-4 transition-all duration-500">
              <div className="text-center space-y-1 animate-fadeInGate">
                <h1 className="font-display text-4xl font-black tracking-wider text-white">
                  Vibe Deck
                </h1>
                <p className="text-[10px] text-primary/80 font-bold uppercase tracking-[0.25em]">Premium Music System</p>
              </div>
              
              {/* Futuristic linear glow loading loader */}
              <div className="w-48 h-1 rounded-full bg-white/5 border border-white/5 overflow-hidden mt-2 relative">
                <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-primary rounded-full animate-loadingShimmer" style={{ width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Interactive Login Panel
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black overflow-hidden select-none">
      
      {/* Visual Ambient Atmosphere Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Main Form Box with Smooth cinematic Fade-In */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[#121212] border border-white/5 shadow-2xl p-8 flex flex-col gap-6 z-10 animate-fadeInGate">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center gap-3">
          <Logo size="lg" className="hover:scale-[1.05] transition-all duration-300 animate-bounce" />
          <div className="text-center">
            <h2 className="font-display text-2xl font-black text-white">Vibe Deck</h2>
            <p className="text-[10px] text-on-surface-variant/60 font-semibold uppercase tracking-widest mt-1">Unlock Cloud Synchronization</p>
          </div>
        </div>

        {/* Auth Credentials Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Display Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white/10 transition-all placeholder:text-white/20"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white/10 transition-all placeholder:text-white/20"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white/10 transition-all placeholder:text-white/20"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary font-bold py-3 rounded-full text-xs hover:scale-102 transition-all active:scale-97 shadow-lg shadow-primary/25 disabled:opacity-50 select-none cursor-pointer mt-2"
          >
            {loading ? 'Entering Space...' : isSignUp ? 'Create Cloud Profile' : 'Access Space Profile'}
          </button>
        </form>

        {/* Separator */}
        <div className="relative my-2 text-center">
          <div className="absolute inset-y-1/2 left-0 right-0 h-[1px] bg-white/5" />
          <span className="relative bg-[#121319] px-4 text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-widest">Or Authenticate With</span>
        </div>

        {/* Google OAuth Login */}
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
          Google Authentication
        </button>

        {/* Footer Actions */}
        <div className="flex flex-col items-center gap-3 pt-3 border-t border-white/5 font-bold">
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[10px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>

      </div>
    </div>
  );
}
