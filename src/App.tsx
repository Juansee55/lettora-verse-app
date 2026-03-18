import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LoadingScreen from "@/components/LoadingScreen";
import PageLoader from "@/components/PageLoader";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAutoCleanup } from "@/hooks/useAutoCleanup";

const Onboarding = lazy(() => import("./pages/Onboarding"));
const Auth = lazy(() => import("./pages/Auth"));
const HomePage = lazy(() => import("./pages/Home"));
const ExplorePage = lazy(() => import("./pages/Explore"));
const LibraryPage = lazy(() => import("./pages/Library"));
const ChatsPage = lazy(() => import("./pages/Chats"));
const ChatConversationPage = lazy(() => import("./pages/ChatConversation"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const BookDetailPage = lazy(() => import("./pages/BookDetail"));
const WritePage = lazy(() => import("./pages/Write"));
const AdvancedWritePage = lazy(() => import("./pages/AdvancedWrite"));
const MicrostoriesPage = lazy(() => import("./pages/Microstories"));
const UserProfilePage = lazy(() => import("./pages/UserProfile"));
const EditProfilePage = lazy(() => import("./pages/EditProfile"));
const AdminPage = lazy(() => import("./pages/Admin"));
const ChapterReaderPage = lazy(() => import("./pages/ChapterReader"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const AdminsPage = lazy(() => import("./pages/Admins"));
const InventoryPage = lazy(() => import("./pages/Inventory"));
const HashtagPage = lazy(() => import("./pages/Hashtag"));
const TrendingHashtagsPage = lazy(() => import("./pages/TrendingHashtags"));
const PremiumThemesPage = lazy(() => import("./pages/PremiumThemes"));
const LevelsPage = lazy(() => import("./pages/Levels"));
const StaffBdayPage = lazy(() => import("./pages/StaffBday"));
const StaffContractsPage = lazy(() => import("./pages/StaffContracts"));
const NewsPage = lazy(() => import("./pages/News"));
const AdminChatPage = lazy(() => import("./pages/AdminChat"));
const EventRoomPage = lazy(() => import("./pages/EventRoom"));
const GangWarsPage = lazy(() => import("./pages/GangWars"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppContent = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useAutoCleanup();

  useEffect(() => {
    const seen = localStorage.getItem("lettora_onboarding_seen");
    setHasSeenOnboarding(seen === "true");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (loading) {
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={!hasSeenOnboarding ? <Onboarding onComplete={markOnboardingSeen} /> : user ? <Navigate to="/home" replace /> : <Navigate to="/auth" replace />} />
      <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <Auth />} />
      <Route path="/home" element={user ? <HomePage /> : <Navigate to="/auth" replace />} />
      <Route path="/explore" element={user ? <ExplorePage /> : <Navigate to="/auth" replace />} />
      <Route path="/library" element={user ? <LibraryPage /> : <Navigate to="/auth" replace />} />
      <Route path="/chats" element={user ? <ChatsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/chat/:conversationId" element={user ? <ChatConversationPage /> : <Navigate to="/auth" replace />} />
      <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/auth" replace />} />
      <Route path="/book/:id" element={user ? <BookDetailPage /> : <Navigate to="/auth" replace />} />
      <Route path="/book/:bookId/chapter/:chapterNumber" element={user ? <ChapterReaderPage /> : <Navigate to="/auth" replace />} />
      <Route path="/write" element={user ? <WritePage /> : <Navigate to="/auth" replace />} />
      <Route path="/write/advanced" element={user ? <AdvancedWritePage /> : <Navigate to="/auth" replace />} />
      <Route path="/write/advanced/:bookId" element={user ? <AdvancedWritePage /> : <Navigate to="/auth" replace />} />
      <Route path="/microstories" element={user ? <MicrostoriesPage /> : <Navigate to="/auth" replace />} />
      
      <Route path="/user/:userId" element={user ? <UserProfilePage /> : <Navigate to="/auth" replace />} />
      <Route path="/edit-profile" element={user ? <EditProfilePage /> : <Navigate to="/auth" replace />} />
      <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/admin" element={user ? <AdminPage /> : <Navigate to="/auth" replace />} />
      <Route path="/notifications" element={user ? <NotificationsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/admins" element={user ? <AdminsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/inventory" element={user ? <InventoryPage /> : <Navigate to="/auth" replace />} />
      <Route path="/hashtag/:tag" element={user ? <HashtagPage /> : <Navigate to="/auth" replace />} />
      <Route path="/trending" element={user ? <TrendingHashtagsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/premium-themes" element={user ? <PremiumThemesPage /> : <Navigate to="/auth" replace />} />
      <Route path="/levels" element={user ? <LevelsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/staff-bday" element={user ? <StaffBdayPage /> : <Navigate to="/auth" replace />} />
      <Route path="/staff-contracts" element={user ? <StaffContractsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/news" element={user ? <NewsPage /> : <Navigate to="/auth" replace />} />
      <Route path="/admin-chat" element={user ? <AdminChatPage /> : <Navigate to="/auth" replace />} />
      <Route path="/event/:eventId" element={user ? <EventRoomPage /> : <Navigate to="/auth" replace />} />
      <Route path="/gang-wars" element={user ? <GangWarsPage /> : <Navigate to="/auth" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
