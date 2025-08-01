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
} from "@mui/material";
import { Close as CloseIcon, Home as HomeIcon } from "@mui/icons-material";

interface CreateHomeDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<boolean>;
  loading?: boolean;
}

const CreateHomeDialog: React.FC<CreateHomeDialogProps> = ({
  open,
  onClose,
  onCreate,
  loading = false,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {}
  );

  const handleClose = () => {
    if (!loading) {
      setName("");
      setDescription("");
      setErrors({});
      onClose();
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; description?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Home name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Home name must be at least 2 characters";
    } else if (name.trim().length > 50) {
      newErrors.name = "Home name cannot exceed 50 characters";
    }

    if (description.length > 200) {
      newErrors.description = "Description cannot exceed 200 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const success = await onCreate(
      name.trim(),
      description.trim() || undefined
    );
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
          <HomeIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6">Create New Home</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a new home to share shopping lists with family or friends.
        </Typography>

        <TextField
          autoFocus
          label="Home Name"
          placeholder="e.g., Smith Family, Roommates, Office Team"
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) {
              setErrors((prev) => ({ ...prev, name: undefined }));
            }
          }}
          onKeyPress={handleKeyPress}
          error={!!errors.name}
          helperText={errors.name}
          disabled={loading}
          sx={{ mb: 3 }}
        />

        <TextField
          label="Description (Optional)"
          placeholder="Describe this home group..."
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) {
              setErrors((prev) => ({ ...prev, description: undefined }));
            }
          }}
          error={!!errors.description}
          helperText={
            errors.description || `${description.length}/200 characters`
          }
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
          disabled={loading || !name.trim()}
        >
          {loading ? "Creating..." : "Create Home"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateHomeDialog;
