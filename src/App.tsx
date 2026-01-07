import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import HomePage from "./pages/Home";
import ExplorePage from "./pages/Explore";
import LibraryPage from "./pages/Library";
import ChatsPage from "./pages/Chats";
import ProfilePage from "./pages/Profile";
import BookDetailPage from "./pages/BookDetail";
import WritePage from "./pages/Write";
import AdvancedWritePage from "./pages/AdvancedWrite";
import MicrostoriesPage from "./pages/Microstories";
import UserProfilePage from "./pages/UserProfile";
import EditProfilePage from "./pages/EditProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/book/:id" element={<BookDetailPage />} />
          <Route path="/write" element={<WritePage />} />
          <Route path="/write/advanced" element={<AdvancedWritePage />} />
          <Route path="/write/advanced/:bookId" element={<AdvancedWritePage />} />
          <Route path="/microstories" element={<MicrostoriesPage />} />
          <Route path="/user/:userId" element={<UserProfilePage />} />
          <Route path="/edit-profile" element={<EditProfilePage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
