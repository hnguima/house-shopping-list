import React, { useState, useEffect } from "react";
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
import { Close as CloseIcon, Edit as EditIcon } from "@mui/icons-material";
import type { Home } from "../../types/home";

interface EditHomeDialogProps {
  open: boolean;
  onClose: () => void;
  onEdit: (name: string, description?: string) => Promise<boolean>;
  home?: Home;
  loading?: boolean;
}

const EditHomeDialog: React.FC<EditHomeDialogProps> = ({
  open,
  onClose,
  onEdit,
  home,
  loading = false,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens with home data
  useEffect(() => {
    if (open && home) {
      setName(home.name || "");
      setDescription(home.description || "");
      setErrors({});
    }
  }, [open, home]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; description?: string } = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Home name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Home name must be at least 2 characters";
    } else if (name.trim().length > 50) {
      newErrors.name = "Home name must be 50 characters or less";
    }

    // Validate description length
    if (description.length > 200) {
      newErrors.description = "Description must be 200 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const success = await onEdit(
        name.trim(),
        description.trim() || undefined
      );
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Error editing home:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName("");
      setDescription("");
      setErrors({});
      onClose();
    }
  };

  const isFormValid =
    name.trim().length >= 2 && Object.keys(errors).length === 0;
  const hasChanges =
    home &&
    (name.trim() !== home.name ||
      description.trim() !== (home.description || ""));

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
          <EditIcon color="primary" />
          <Typography variant="h6" component="span">
            Edit Home
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
        <TextField
          fullWidth
          label="Home Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) {
              setErrors((prev) => ({ ...prev, name: undefined }));
            }
          }}
          error={!!errors.name}
          helperText={errors.name || `${name.length}/50 characters`}
          disabled={isSubmitting}
          sx={{ mb: 2 }}
          autoFocus
        />

        <TextField
          fullWidth
          label="Description (Optional)"
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
          disabled={isSubmitting}
          multiline
          rows={3}
          placeholder="Describe what this home is for..."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || !hasChanges || isSubmitting || loading}
          variant="contained"
          sx={{
            minWidth: 120,
          }}
        >
          {isSubmitting || loading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditHomeDialog;
