import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Smartphone as SmartphoneIcon,
  Computer as ComputerIcon,
} from "@mui/icons-material";
import { SessionManager, UserSession } from "../utils/sessionManager";

interface SessionManagerComponentProps {
  open: boolean;
  onClose: () => void;
}

const SessionManagerComponent: React.FC<SessionManagerComponentProps> = ({
  open,
  onClose,
}) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const userSessions = await SessionManager.getUserSessions();
      setSessions(userSessions);
    } catch (err) {
      setError("Failed to load sessions");
      console.error("Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSessions();
    }
  }, [open]);

  const handleInvalidateSession = async (sessionId: string) => {
    try {
      const success = await SessionManager.invalidateSession(sessionId);
      if (success) {
        // Remove session from list
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (err) {
      setError("Failed to invalidate session");
      console.error("Error invalidating session:", err);
    }
  };

  const handleInvalidateAllOther = async () => {
    try {
      const result = await SessionManager.invalidateAllOtherSessions();
      if (result.success) {
        // Reload sessions to get updated list
        await loadSessions();
        setConfirmLogoutAll(false);
      }
    } catch (err) {
      setError("Failed to invalidate sessions");
      console.error("Error invalidating all sessions:", err);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.toLowerCase().includes("mobile")) {
      return <SmartphoneIcon />;
    }
    return <ComputerIcon />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLocationInfo = (session: UserSession) => {
    const { device_info } = session;
    const parts = [];

    if (device_info.ip_address) {
      parts.push(device_info.ip_address);
    }

    // Simple browser detection
    const userAgent = device_info.user_agent.toLowerCase();
    if (userAgent.includes("chrome")) parts.push("Chrome");
    else if (userAgent.includes("firefox")) parts.push("Firefox");
    else if (userAgent.includes("safari")) parts.push("Safari");
    else if (userAgent.includes("edge")) parts.push("Edge");

    return parts.join(" • ") || "Unknown";
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SecurityIcon />
          Active Sessions
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" paragraph>
          Manage your active sessions across different devices. You can sign out
          of sessions you don't recognize for security.
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <List>
              {sessions.map((session) => (
                <ListItem key={session.id} divider>
                  <Box display="flex" alignItems="center" mr={2}>
                    {getDeviceIcon(session.device_info.user_agent)}
                  </Box>

                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">
                          {getLocationInfo(session)}
                        </Typography>
                        {session.is_current && (
                          <Chip
                            label="Current"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Created: {formatDate(session.created_at)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last active: {formatDate(session.last_activity)}
                        </Typography>
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    {!session.is_current && (
                      <IconButton
                        edge="end"
                        onClick={() => handleInvalidateSession(session.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            {sessions.filter((s) => !s.is_current).length > 0 && (
              <Box mt={2}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setConfirmLogoutAll(true)}
                  fullWidth
                >
                  Sign Out All Other Sessions
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {/* Confirmation dialog for logging out all sessions */}
      <Dialog
        open={confirmLogoutAll}
        onClose={() => setConfirmLogoutAll(false)}
      >
        <DialogTitle>Sign Out All Other Sessions?</DialogTitle>
        <DialogContent>
          <Typography>
            This will sign you out of all other sessions on all devices. You
            will remain signed in on this device.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmLogoutAll(false)}>Cancel</Button>
          <Button
            onClick={handleInvalidateAllOther}
            color="error"
            variant="contained"
          >
            Sign Out All Others
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default SessionManagerComponent;
