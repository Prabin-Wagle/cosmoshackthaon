import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/UsersPage';
import VideoPlaylistManager from './pages/VideoPlaylistManager';
import VideoManager from './pages/VideoManager';
import BooksManager from './pages/BooksManager';
import ResourcesManager from './pages/ResourceManager';
import ClassManager from './pages/ClassManager';
import NoticesManager from './pages/NoticesManager';
import TestSeriesCollectionManager from './pages/TestSeriesCollectionManager';
import TestSeriesManager from './pages/TestSeriesManager';
import TestSeriesEditor from './pages/TestSeriesEditor';
import TicketManager from './pages/TicketManager';
import PaymentManager from './pages/PaymentManager';
import QuestionBankManager from './pages/QuestionBankManager';
import PartnersManager from './pages/PartnersManager';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video-playlists"
            element={
              <ProtectedRoute>
                <VideoPlaylistManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notices"
            element={
              <ProtectedRoute>
                <NoticesManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/videos"
            element={
              <ProtectedRoute>
                <VideoManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classmanager"
            element={
              <ProtectedRoute>
                <ClassManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/books"
            element={
              <ProtectedRoute>
                <BooksManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <ResourcesManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-series-collections"
            element={
              <ProtectedRoute>
                <TestSeriesCollectionManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-series"
            element={
              <ProtectedRoute>
                <TestSeriesManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-series/create"
            element={
              <ProtectedRoute>
                <TestSeriesEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-series/edit/:id"
            element={
              <ProtectedRoute>
                <TestSeriesEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <TicketManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <PaymentManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/question-bank"
            element={
              <ProtectedRoute>
                <QuestionBankManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partners"
            element={
              <ProtectedRoute>
                <PartnersManager />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
