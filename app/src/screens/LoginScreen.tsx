import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Link,
  styled,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LoginIcon from "@mui/icons-material/Login";
import apiClient from "../utils/apiClient";
import { SessionManager } from "../utils/sessionManager";
import { handleOAuthLogin } from "../utils/authUtils";

const LoginContainer = styled(Box)(({ theme }: any) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(2),
}));

const LoginPaper = styled(Paper)(({ theme }: any) => ({
  padding: theme.spacing(4),
  maxWidth: 400,
  width: "100%",
  textAlign: "center",
}));

const Form = styled("form")(({ theme }: any) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

const GoogleButton = styled(Button)(() => ({
  backgroundColor: "#4285f4",
  color: "white",
  "&:hover": {
    backgroundColor: "#357ae8",
  },
}));

interface LoginScreenProps {
  onLogin: (user: any) => void;
  onError: (message: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onError }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    name: "",
  });
  const [error, setError] = useState("");

  const getButtonIcon = () => {
    if (loading) return <CircularProgress size={20} />;
    return isLogin ? <LoginIcon /> : <PersonAddIcon />;
  };

  const getButtonText = () => {
    if (loading) return "Processing...";
    return isLogin ? "Sign In" : "Create Account";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let response;

      if (isLogin) {
        response = await apiClient.login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        response = await apiClient.register({
          email: formData.email,
          password: formData.password,
          username: formData.username,
          name: formData.name,
        });
      }

      // Store JWT tokens using new session management
      const loginSuccess = await SessionManager.handleLoginResponse(response.data);
      if (!loginSuccess) {
        throw new Error("Failed to store authentication tokens");
      }

      // Call onLogin with user data
      onLogin(response.data.user);
    } catch (err: any) {
      let errorMessage = "Authentication failed";

      // More specific error messages based on the error
      if (err.message) {
        if (err.message.includes("Invalid email or password")) {
          errorMessage = isLogin
            ? "Invalid email or password. Please check your credentials."
            : "Registration failed. Please try again.";
        } else if (
          err.message.includes("User with this email already exists")
        ) {
          errorMessage =
            "An account with this email already exists. Please try logging in instead.";
        } else if (err.message.includes("Invalid email format")) {
          errorMessage = "Please enter a valid email address.";
        } else if (err.message.includes("Password must be")) {
          errorMessage = err.message; // Use the specific password validation message
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      console.log("[LoginScreen] Starting Google OAuth");

      const result = await handleOAuthLogin();

      if (result.success && result.user) {
        console.log("[LoginScreen] OAuth success:", result.user);
        onLogin(result.user);
      } else {
        console.error("[LoginScreen] OAuth failed:", result.error);
        setError(result.error || "Google authentication failed");
        onError(result.error || "Google authentication failed");
      }
    } catch (error) {
      console.error("[LoginScreen] Google Auth error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Google authentication failed. Please try again.";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setFormData({ email: "", password: "", username: "", name: "" });
  };

  return (
    <LoginContainer>
      <LoginPaper elevation={3}>
        <Typography variant="h4" gutterBottom color="primary">
          {t("title")}
        </Typography>

        <Typography variant="h6" gutterBottom>
          {isLogin ? "Sign In" : "Create Account"}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <TextField
                name="username"
                label="Username"
                value={formData.username}
                onChange={handleInputChange}
                required
                disabled={loading}
                fullWidth
              />
              <TextField
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={loading}
                fullWidth
              />
            </>
          )}

          <TextField
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={loading}
            fullWidth
          />

          <TextField
            name="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={loading}
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={getButtonIcon()}
          >
            {getButtonText()}
          </Button>
        </Form>

        <Box sx={{ my: 2 }}>
          <Divider>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>
        </Box>

        <GoogleButton
          variant="contained"
          size="large"
          onClick={handleGoogleLogin}
          disabled={loading}
          startIcon={<GoogleIcon />}
          fullWidth
        >
          Continue with Google
        </GoogleButton>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link
              component="button"
              type="button"
              onClick={toggleMode}
              disabled={loading}
            >
              {isLogin ? "Create one" : "Sign in"}
            </Link>
          </Typography>
        </Box>
      </LoginPaper>
    </LoginContainer>
  );
};

export default LoginScreen;
