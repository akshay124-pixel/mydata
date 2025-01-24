import React from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import DashBoard from "./components/DashBoard";
import Login from "./Auth/Login";
import SignUp from "./Auth/SignUp";
import Navbar from "./components/Navbar";
function App() {
  return (
    <Router>
      <ConditionalNavbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/dashboard" element={<DashBoard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </Router>
  );
}
// Component to conditionally render the Navbar only on specific routes
const ConditionalNavbar = () => {
  const location = useLocation();

  // Determine if the current path is for authentication pages
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  return !isAuthPage ? <Navbar /> : null;
};

export default App;
