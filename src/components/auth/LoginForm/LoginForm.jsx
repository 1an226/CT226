import React, { useState } from "react";
import authService from "@services/authService";
import "./LoginForm.css";

const LoginForm = ({ onLoginSuccess }) => {
  // Load configuration from environment variables
  const LOGIN_CONFIG = {
    TITLE: import.meta.env.VITE_LOGIN_TITLE || "CT226",
    SUBTITLE: import.meta.env.VITE_LOGIN_SUBTITLE || "DDS Integration System",
    MAX_USERNAME_LENGTH:
      parseInt(import.meta.env.VITE_MAX_USERNAME_LENGTH) || 10,
    AUTO_ADD_LEADING_ZERO:
      import.meta.env.VITE_AUTO_ADD_LEADING_ZERO === "true",
    SHOW_PASSWORD_TOGGLE: import.meta.env.VITE_SHOW_PASSWORD_TOGGLE === "true",
    ENABLE_USERNAME_AUTO_FORMAT:
      import.meta.env.VITE_ENABLE_USERNAME_AUTO_FORMAT === "true",
  };

  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Please enter username and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Logging in:", credentials.username);

      // Format the username based on configuration
      let formattedUsername = credentials.username.trim();

      if (
        LOGIN_CONFIG.ENABLE_USERNAME_AUTO_FORMAT &&
        LOGIN_CONFIG.AUTO_ADD_LEADING_ZERO &&
        formattedUsername.length === 9 &&
        !formattedUsername.startsWith("0")
      ) {
        formattedUsername = "0" + formattedUsername;
        console.log("Added leading 0 to username:", formattedUsername);
      }

      console.log("Sending formatted username:", formattedUsername);
      const userData = await authService.login({
        username: formattedUsername,
        password: credentials.password,
      });

      console.log("Login successful, calling onLoginSuccess");
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "username") {
      // Allow configurable max digits for username
      const numericValue = value
        .replace(/\D/g, "")
        .slice(0, LOGIN_CONFIG.MAX_USERNAME_LENGTH);
      setCredentials((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setCredentials((prev) => ({ ...prev, [name]: value }));
    }

    if (error) setError("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-form">
      <div className="login-header">
        <h1>{LOGIN_CONFIG.TITLE}</h1>
        <div className="login-subtitle">{LOGIN_CONFIG.SUBTITLE}</div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">!</span>
          <span className="error-text">{error}</span>
          <button className="error-close" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={credentials.username}
            onChange={handleChange}
            placeholder=""
            required
            disabled={loading}
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={LOGIN_CONFIG.MAX_USERNAME_LENGTH}
            autoComplete="username"
            className="clean-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              placeholder=""
              required
              disabled={loading}
              autoComplete="current-password"
              className="clean-input"
            />
            {LOGIN_CONFIG.SHOW_PASSWORD_TOGGLE && (
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={loading}
                tabIndex="-1"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !credentials.username || !credentials.password}
          className="login-button"
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Logging in...
            </>
          ) : (
            "LOG IN"
          )}
        </button>
      </form>

      <div className="login-footer">
        <div className="system-info">
          {/* CT226 v1.0 has been removed from here */}
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
