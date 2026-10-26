// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ReportLostPage from "./pages/ReportLostPage.jsx";
import ReportFoundPage from "./pages/ReportFoundPage.jsx";
import ItemDetailsPage from "./pages/ItemDetailsPage.jsx";
import MyActivityPage from "./pages/MyActivityPage.jsx";
import EnquiryDetailsPage from "./pages/EnquiryDetailsPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AIAssistant from "./components/AIAssistant.jsx";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Navbar />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Public item details */}
            <Route path="/item/:id" element={<ItemDetailsPage />} />

            {/* Student / User Protected routes */}
            <Route
              path="/report/lost"
              element={
                <ProtectedRoute>
                  <ReportLostPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report/found"
              element={
                <ProtectedRoute>
                  <ReportFoundPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <MyActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/enquiry/:id"
              element={
                <ProtectedRoute>
                  <EnquiryDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inquiry/:id"
              element={
                <ProtectedRoute>
                  <EnquiryDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:enquiryId"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Dashboard */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <AIAssistant />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
