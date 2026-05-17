import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/Sidebar/AppLayout';
import Login from './pages/Login/Login';

// Lazy load all pages for automatic code splitting
const Dashboard    = lazy(() => import('./pages/Dashboard/Dashboard'));
const Students     = lazy(() => import('./pages/Students/Students'));
const Workouts     = lazy(() => import('./pages/Workouts/Workouts'));
const Tracker      = lazy(() => import('./pages/Tracker/Tracker'));
const Calendar     = lazy(() => import('./pages/Calendar/Calendar'));
const Periodization= lazy(() => import('./pages/Periodization/Periodization'));
const Assessments  = lazy(() => import('./pages/Assessments/Assessments'));
const Biofeedback  = lazy(() => import('./pages/Biofeedback/Biofeedback'));
const Financial    = lazy(() => import('./pages/Financial/Financial'));
const Reports      = lazy(() => import('./pages/Reports/Reports'));
const Exercises    = lazy(() => import('./pages/Exercises/Exercises'));
const Anamnesis    = lazy(() => import('./pages/Anamnesis/Anamnesis'));
const Settings     = lazy(() => import('./pages/Settings/Settings'));

function PageLoader() {
  return (
    <div className="page-loading">
      <div className="spinner" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/form/pre/:studentId" element={<PublicPreForm />} />
        <Route path="/form/post/:sessionId" element={<PublicPostForm />} />
        <Route path="/form/anamnese" element={<PublicAnamneseForm />} />

        {/* Protected routes inside AppLayout */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="alunos" element={<Students />} />
          <Route path="treinos" element={<Workouts />} />
          <Route path="tracker" element={<Tracker />} />
          <Route path="agenda" element={<Calendar />} />
          <Route path="periodizacao" element={<Periodization />} />
          <Route path="avaliacoes" element={<Assessments />} />
          <Route path="biofeedback" element={<Biofeedback />} />
          <Route path="financeiro" element={<Financial />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="exercicios" element={<Exercises />} />
          <Route path="anamnese" element={<Anamnesis />} />
          <Route path="config" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// Inline small public form wrappers (lazy loaded)
const PublicPreForm     = lazy(() => import('./pages/Students/PreForm'));
const PublicPostForm    = lazy(() => import('./pages/Students/PostForm'));
const PublicAnamneseForm= lazy(() => import('./pages/Anamnesis/AnamneseForm'));
