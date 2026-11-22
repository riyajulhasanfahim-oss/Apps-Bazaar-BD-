import { useState, useCallback } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';

interface AdminPortalProps {
  onBackToStore: () => void;
}

export function AdminPortal({ onBackToStore }: AdminPortalProps) {
  // Keep admin Bearer session token strictly in React memory (never localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    const currentToken = adminToken;
    setAdminToken(null);
    if (currentToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch {
        // Token already cleared from memory
      }
    }
  }, [adminToken]);

  if (!adminToken) {
    return (
      <AdminLogin
        onAuthenticated={(token) => setAdminToken(token)}
        onBackToStore={onBackToStore}
      />
    );
  }

  return (
    <AdminDashboard
      token={adminToken}
      onLogout={handleLogout}
      onBackToStore={onBackToStore}
    />
  );
}
