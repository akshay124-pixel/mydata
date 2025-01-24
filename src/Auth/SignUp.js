import React, { useState } from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

function Signup() {
  const navigate = useNavigate();
  const [form, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "Admin",
  });
  const [error, setError] = useState(null);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form data
    if (!form.username || !form.email || !form.password || !form.role) {
      toast.error("All fields are required", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:4000/user/signup",
        form
      );

      if (response.status === 201) {
        console.log("Signup successful", response.data);
        toast.success("Signup successful! Redirecting to login...", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
        });
        navigate("/login"); // Navigate to login on successful signup
      } else {
        console.log("Unexpected response status", response.status);
        toast.error("Unexpected response. Please try again.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
        });
      }
    } catch (error) {
      console.error("Error during signup", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setError(error.response.data.message); // Display API error message
        toast.error(error.response.data.message, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
        });
      } else {
        setError("Something went wrong. Please try again."); // Fallback error message
        toast.error("Something went wrong. Please try again.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
        });
      }
    }
  };

  return (
    <div
      className="container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <div className="form-box">
        <form className="form" onSubmit={handleSubmit}>
          <span className="title">Sign Up</span>
          <span className="subtitle">
            Create a free account with your email.
          </span>
          {error && <p style={{ color: "red" }}>{error}</p>}{" "}
          {/* Display error message */}
          <div className="form-box">
            <input
              type="text"
              style={{ backgroundColor: "white" }}
              className="input"
              placeholder="Full Name"
              name="username"
              value={form.username}
              onChange={handleInput}
              required
            />
            <input
              type="email"
              style={{ backgroundColor: "white" }}
              className="input"
              placeholder="Email"
              name="email"
              value={form.email}
              onChange={handleInput}
              required
            />
            <input
              type="password"
              style={{ backgroundColor: "white" }}
              className="input"
              placeholder="Password"
              name="password"
              value={form.password}
              onChange={handleInput}
              required
            />
            <select
              name="role"
              style={{ backgroundColor: "white" }}
              value={form.role}
              onChange={handleInput}
              className="input"
              required
            >
              <option value="Admin">Admin</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <button
            type="submit"
            style={{ background: "linear-gradient(90deg, #6a11cb, #2575fc)" }}
          >
            Sign Up
          </button>
        </form>
        <div className="form-section">
          <p>
            Have an account? <Link to="/login">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
