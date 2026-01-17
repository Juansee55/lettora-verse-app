import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import LoadingScreen from "@/components/LoadingScreen";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import HomePage from "./pages/Home";
import ExplorePage from "./pages/Explore";
import LibraryPage from "./pages/Library";
import ChatsPage from "./pages/Chats";
import ChatConversationPage from "./pages/ChatConversation";
import ProfilePage from "./pages/Profile";
import BookDetailPage from "./pages/BookDetail";
import WritePage from "./pages/Write";
import AdvancedWritePage from "./pages/AdvancedWrite";
import MicrostoriesPage from "./pages/Microstories";
import UserProfilePage from "./pages/UserProfile";
import EditProfilePage from "./pages/EditProfile";
import AdminPage from "./pages/Admin";
import ChapterReaderPage from "./pages/ChapterReader";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem("lettora_onboarding_seen");
    setHasSeenOnboarding(seen === "true");

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Keep loading for a bit for smooth transition
        if (loading) {
          setTimeout(() => setLoading(false), 1500);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Minimum loading time for animation
      setTimeout(() => setLoading(false), 1500);
    });

    return () => subscription.unsubscribe();
  }, []);

  const markOnboardingSeen = () => {
    localStorage.setItem("lettora_onboarding_seen", "true");
    setHasSeenOnboarding(true);
  };

  if (loading || hasSeenOnboarding === null) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          !hasSeenOnboarding ? (
            <Onboarding onComplete={markOnboardingSeen} />
          ) : user ? (
            <Navigate to="/home" replace />
          ) : (
            <Navigate to="/auth" replace />
          )
        } 
      />
      <Route 
        path="/auth" 
        element={user ? <Navigate to="/home" replace /> : <Auth />} 
      />
      <Route 
        path="/home" 
        element={user ? <HomePage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/explore" 
        element={user ? <ExplorePage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/library" 
        element={user ? <LibraryPage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/chats" 
        element={user ? <ChatsPage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/chat/:conversationId" 
        element={user ? <ChatConversationPage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/profile" 
        element={user ? <ProfilePage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/book/:id" 
        element={user ? <BookDetailPage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/book/:bookId/chapter/:chapterNumber" 
        element={user ? <ChapterReaderPage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/write" 
        element={user ? <WritePage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/write/advanced" 
        element={user ? <AdvancedWritePage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/write/advanced/:bookId" 
        element={user ? <AdvancedWritePage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/microstories" 
        element={user ? <MicrostoriesPage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/user/:userId" 
        element={user ? <UserProfilePage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/edit-profile" 
        element={user ? <EditProfilePage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/settings" 
        element={user ? <SettingsPage /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/admin" 
        element={user ? <AdminPage /> : <Navigate to="/auth" replace />} 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
