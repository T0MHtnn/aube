import { supabaseConfigured } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage, SetupMissing } from './pages/LoginPage';

export default function App() {
  const { theme, toggle } = useTheme();
  const { session, loading } = useAuth();

  if (!supabaseConfigured) return <SetupMissing />;
  if (loading) return null;
  if (!session) return <LoginPage />;
  return <DashboardPage key={session.user.id} userId={session.user.id} email={session.user.email ?? ''} theme={theme} onToggleTheme={toggle} />;
}
