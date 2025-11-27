import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { AuthContainer, VerifyEmail } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { BoardView } from './components/Board';
import { Layout } from './components/Layout';
import { Profile, ProfileView } from './components/Profile';
import { ThemeProvider } from './components/ThemeProvider';
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <AuthContainer /> : <Navigate to="/" />} 
          />
          
          <Route 
            path="/" 
            element={
              user ? (
                user.emailVerified ? (
                  <Layout userEmail={user.email} userId={user.uid}>
                    <Dashboard userId={user.uid} />
                  </Layout>
                ) : (
                  <VerifyEmail user={user} />
                )
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          <Route 
            path="/board/:boardId" 
            element={
              user ? (
                user.emailVerified ? (
                  <Layout userEmail={user.email} userId={user.uid}>
                    <BoardView userId={user.uid} />
                  </Layout>
                ) : (
                  <VerifyEmail user={user} />
                )
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          <Route 
            path="/profile/:userId?" 
            element={
              user ? (
                user.emailVerified ? (
                  <Layout userEmail={user.email} userId={user.uid}>
                    <Profile userId={user.uid} isOwnProfile={true} />
                  </Layout>
                ) : (
                  <VerifyEmail user={user} />
                )
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;