import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Setup from '@/pages/Setup';
import Dashboard from '@/pages/Dashboard';
import Processes from '@/pages/Processes';
import Apps from '@/pages/Apps';
import AppDetails from '@/pages/AppDetails';
import DeployWizard from '@/pages/DeployWizard';
import DNS from '@/pages/DNS';
import Sessions from '@/pages/Sessions';
import SessionChat from '@/pages/SessionChat';
import Settings from '@/pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, authenticated, needsSetup } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { loading, needsSetup, authenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        authenticated ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/setup" element={
        !needsSetup ? <Navigate to="/" replace /> : <Setup />
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="processes" element={<Processes />} />
        <Route path="apps" element={<Apps />} />
        <Route path="apps/new" element={<DeployWizard />} />
        <Route path="apps/:id" element={<AppDetails />} />
        <Route path="dns" element={<DNS />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="sessions/:id" element={<SessionChat />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
