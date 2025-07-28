import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { predefinedColors } from "../utils/colorUtils";

interface ColorPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  currentColor: string;
  title?: string;
}

const ColorPickerDialog: React.FC<ColorPickerDialogProps> = ({
  open,
  onClose,
  onColorSelect,
  currentColor,
}) => {
  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent>
        <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {predefinedColors.map((colorOption) => (
              <IconButton
                key={colorOption.value}
                onClick={() => handleColorSelect(colorOption.value)}
                sx={{
                  width: 48,
                  height: 48,
                  backgroundColor: colorOption.value,
                  border:
                    currentColor === colorOption.value
                      ? `3px solid ${colorOption.value}`
                      : "3px solid transparent",
                  borderRadius: "50%",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "scale(1.1)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  },
                }}
              >
                {currentColor === colorOption.value && (
                  <CheckIcon
                    sx={{
                      color: "white",
                      fontSize: 24,
                      fontWeight: "bold",
                      filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))",
                    }}
                  />
                )}
              </IconButton>
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColorPickerDialog;
