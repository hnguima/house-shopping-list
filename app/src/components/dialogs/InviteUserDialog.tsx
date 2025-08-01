import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  PersonAdd as InviteIcon,
} from "@mui/icons-material";
import type { Home } from "../../types/home";

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, message?: string) => Promise<boolean>;
  home?: Home;
  loading?: boolean;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  open,
  onClose,
  onInvite,
  home,
  loading = false,
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ email?: string; message?: string }>(
    {}
  );

  const handleClose = () => {
    if (!loading) {
      setEmail("");
      setMessage("");
      setErrors({});
      onClose();
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; message?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (message.length > 500) {
      newErrors.message = "Message cannot exceed 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const success = await onInvite(email.trim(), message.trim() || undefined);
    if (success) {
      handleClose();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <InviteIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">Invite to Home</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {home && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Inviting user to join "<strong>{home.name}</strong>"
            </Typography>
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Send an invitation to someone to join this home and share shopping
          lists.
        </Typography>

        <TextField
          autoFocus
          label="Email Address"
          placeholder="Enter the person's email address"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) {
              setErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          onKeyPress={handleKeyPress}
          error={!!errors.email}
          helperText={errors.email}
          disabled={loading}
          sx={{ mb: 3 }}
        />

        <TextField
          label="Personal Message (Optional)"
          placeholder="Add a personal message to your invitation..."
          fullWidth
          multiline
          rows={3}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (errors.message) {
              setErrors((prev) => ({ ...prev, message: undefined }));
            }
          }}
          error={!!errors.message}
          helperText={errors.message || `${message.length}/500 characters`}
          disabled={loading}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !email.trim()}
        >
          {loading ? "Sending..." : "Send Invitation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteUserDialog;
