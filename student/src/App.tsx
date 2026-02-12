import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/auth/ForgotPassword';
import SubjectResources from './pages/SubjectResources';
import SubjectDetails from './pages/SubjectDetails';
import CompetitiveSubjectPage from './pages/CompetitiveSubjectPage';
import BooksPage from './pages/BooksPage';
import NoticesPage from './pages/NoticesPage';
import NoticeDetailPage from './pages/NoticeDetailPage';
import ResourceView from './pages/ResourceView';
import ResourceEmbed from './pages/ResourceEmbed';
import PdfReader from './pages/PdfReader';
import TestSeriesPage from './pages/TestSeriesPage';
import CollectionContentPage from './pages/CollectionContentPage';
import QuizPlayerPage from './pages/QuizPlayerPage';
import QuizHistoryPage from './pages/QuizHistoryPage';
import QuizResultPage from './pages/QuizResultPage';
import MistakePracticePage from './pages/MistakePracticePage';
import SmartPracticeBuilderPage from './pages/SmartPracticeBuilderPage';
import ProfilePage from './pages/ProfilePage';
import ContactPage from './pages/ContactPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import SupportTicketDetailsPage from './pages/SupportTicketDetailsPage';
import GlobalMusicPlayer from './components/GlobalMusicPlayer';


function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-center" reverseOrder={false} />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SubjectResources />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/:subjectName"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SubjectDetails />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitive/:subjectName"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CompetitiveSubjectPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-series"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <TestSeriesPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/books"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BooksPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notices"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <NoticesPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notices/:slug"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <NoticeDetailPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-series"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <TestSeriesPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-series/:collectionId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CollectionContentPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-series/quiz/:quizId"
              element={
                <ProtectedRoute>
                  <QuizPlayerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-series/history/:quizId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <QuizHistoryPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-series/result/:attemptId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <QuizResultPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/mistake-mastery"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <MistakePracticePage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/smart-practice"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SmartPracticeBuilderPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/subjects/:subjectName/:resourceType"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ResourceView />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resource/embed"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ResourceEmbed />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resource/pdf"
              element={
                <ProtectedRoute>
                  <PdfReader />
                </ProtectedRoute>
              }
            />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProfilePage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contact"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ContactPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/support-tickets"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SupportTicketsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/support-tickets/:ticketId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SupportTicketDetailsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <GlobalMusicPlayer />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter >
  );
}

export default App;
