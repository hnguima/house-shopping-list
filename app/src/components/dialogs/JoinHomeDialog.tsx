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
import { Close as CloseIcon, Home as HomeIcon } from "@mui/icons-material";

interface JoinHomeDialogProps {
  open: boolean;
  onClose: () => void;
  onJoin: (homeId: string, message?: string) => Promise<boolean>;
  loading?: boolean;
}

const JoinHomeDialog: React.FC<JoinHomeDialogProps> = ({
  open,
  onClose,
  onJoin,
  loading = false,
}) => {
  const [homeId, setHomeId] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ homeId?: string; message?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { homeId?: string; message?: string } = {};

    // Validate home ID
    if (!homeId.trim()) {
      newErrors.homeId = "Home ID is required";
    } else if (homeId.trim().length < 8) {
      newErrors.homeId = "Home ID must be at least 8 characters";
    }

    // Validate message length
    if (message.length > 500) {
      newErrors.message = "Message must be 500 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const success = await onJoin(homeId.trim(), message.trim() || undefined);
      if (success) {
        // Reset form
        setHomeId("");
        setMessage("");
        setErrors({});
        onClose();
      }
    } catch (error) {
      console.error("Error joining home:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setHomeId("");
      setMessage("");
      setErrors({});
      onClose();
    }
  };

  const isFormValid =
    homeId.trim().length >= 8 && Object.keys(errors).length === 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            mx: 2,
          },
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HomeIcon color="primary" />
          <Typography variant="h6" component="span">
            Join Home
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={isSubmitting}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Enter the Home ID provided by the home owner. They will need to
          approve your request.
        </Alert>

        <TextField
          fullWidth
          label="Home ID"
          value={homeId}
          onChange={(e) => {
            setHomeId(e.target.value);
            if (errors.homeId) {
              setErrors((prev) => ({ ...prev, homeId: undefined }));
            }
          }}
          error={!!errors.homeId}
          helperText={errors.homeId || "Ask the home owner for the Home ID"}
          disabled={isSubmitting}
          sx={{ mb: 2 }}
          placeholder="e.g., 60a8b2c3d4e5f6789012345"
        />

        <TextField
          fullWidth
          label="Message (Optional)"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (errors.message) {
              setErrors((prev) => ({ ...prev, message: undefined }));
            }
          }}
          error={!!errors.message}
          helperText={errors.message || `${message.length}/500 characters`}
          disabled={isSubmitting}
          multiline
          rows={3}
          placeholder="Introduce yourself or explain why you'd like to join this home..."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting || loading}
          variant="contained"
          sx={{
            minWidth: 120,
          }}
        >
          {isSubmitting || loading ? "Sending..." : "Send Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JoinHomeDialog;
