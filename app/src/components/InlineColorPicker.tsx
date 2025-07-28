import React from "react";
import { Box, IconButton } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { predefinedColors } from "../utils/colorUtils";

interface InlineColorPickerProps {
  currentColor: string;
  onColorSelect: (color: string) => void;
}

const InlineColorPicker: React.FC<InlineColorPickerProps> = ({
  currentColor,
  onColorSelect,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
        justifyContent: "flex-start",
      }}
    >
      {predefinedColors.map((colorOption) => (
        <IconButton
          key={colorOption.value}
          onClick={() => onColorSelect(colorOption.value)}
          sx={{
            width: 36,
            height: 36,
            backgroundColor: colorOption.value,
            border:
              currentColor === colorOption.value
                ? `2px solid ${colorOption.value}`
                : "2px solid transparent",
            borderRadius: "50%",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "scale(1.1)",
              boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
            },
          }}
        >
          {currentColor === colorOption.value && (
            <CheckIcon
              sx={{
                color: "white",
                fontSize: 18,
                fontWeight: "bold",
                filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))",
              }}
            />
          )}
        </IconButton>
      ))}
    </Box>
  );
};

export default InlineColorPicker;
