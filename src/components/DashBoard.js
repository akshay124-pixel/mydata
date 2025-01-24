import React, { useState, useEffect, useCallback } from "react";
import { Button, Table, Modal, Row, Col, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css"; // Import custom CSS for advanced styling
import { FaEye } from "react-icons/fa";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

function DashBoard() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    customerName: "",
    mobileNumber: "",
    address: "",
    state: "",
    city: "",
    organization: "",
    category: "",
  });
  const [selectedState, setSelectedState] = useState(formData.state || "");
  const [selectedCity, setSelectedCity] = useState(formData.city || "");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [selectedStateA, setSelectedStateA] = useState("");
  const [selectedCityA, setSelectedCityA] = useState("");
  const handleCloseEditModal = () => setShowEditModal(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const handleClosed = () => setShowDetails(false);

  // Seraching Logic
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleStateChangeA = (e) => {
    const state = e.target.value;
    setSelectedStateA(state);
    setSelectedCityA("");
  };

  const handleCityChangeA = (e) => {
    setSelectedCityA(e.target.value);
  };

  const filteredData = entries.filter((row) => {
    return (
      (searchTerm
        ? row.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.mobileNumber.toLowerCase().includes(searchTerm.toLowerCase())
        : true) &&
      (selectedCategory ? row.category === selectedCategory : true) &&
      (selectedStateA ? row.state === selectedStateA : true) &&
      (selectedCityA ? row.city === selectedCityA : true)
    );
  });
  const handleReset = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedStateA("");
    setSelectedCityA("");
  };

  // Searching Logic Ends

  // Update handleShowDetails to accept the selected entry's ID
  const handleShowDetails = (id) => {
    const selectedEntry = entries.find((entry) => entry._id === id);
    setSelectedEntry(selectedEntry); // Set the selected entry details
    setShowDetails(true); // Show the modal
  };

  const handleInput = (e) => {
    const { name, value } = e.target;

    // Validation for mobile number (only digits allowed, max length 10)
    if (name === "mobileNumber") {
      const isValid = /^[0-9]*$/.test(value); // Allow only digits
      if (isValid && value.length <= 10) {
        setFormData((prevForm) => ({ ...prevForm, [name]: value }));
      }
    } else {
      setFormData((prevForm) => ({ ...prevForm, [name]: value }));
    }
  };
  // Edit
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
  };
  // Fetch data from the server
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "https://dmserver.onrender.com/api/fetch-entry"
      );
      setEntries(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error.message);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet);

        // Define Mongoose schema fields
        const entrySchemaFields = {
          customerName: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 100,
          },
          mobileNumber: {
            type: String,
            trim: true,
            minlength: 10,
            maxlength: 15,
            match: /^[0-9]+$/,
          },
          address: { type: String, trim: true, minlength: 5, maxlength: 200 },
          organization: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 100,
          },
          category: { type: String, trim: true, minlength: 1, maxlength: 50 },
          state: { type: String, trim: true, minlength: 1, maxlength: 50 },
          city: { type: String, trim: true, minlength: 1, maxlength: 50 },
          createdAt: { type: Date, default: Date.now },
        };

        // Map and validate data
        const newEntries = parsedData.map((item) => {
          return {
            customerName: item.customerName?.trim(),
            mobileNumber: item.mobileNumber?.trim(),
            address: item.address?.trim(),
            organization: item.organization?.trim(),
            category: item.category?.trim(),
            state: item.state?.trim(),
            city: item.city?.trim(),
            createdAt: new Date(),
          };
        });

        // Validate against Mongoose schema fields
        const validEntries = newEntries.filter((entry) => {
          return (
            entry.customerName &&
            entry.mobileNumber &&
            entry.address &&
            entry.organization &&
            entry.category &&
            entry.state &&
            entry.city
          );
        });

        if (validEntries.length === 0) {
          toast.error("All records are invalid or incomplete.");
          return;
        }

        // Send valid entries to the backend
        const response = await axios.post(
          "https://dmserver.onrender.com/api/entries",
          validEntries,
          {
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
          }
        );

        if (response.status === 200 || response.status === 201) {
          toast.success("Entries uploaded successfully!");
          setEntries((prevEntries) => [...prevEntries, ...validEntries]);
        } else {
          toast.error(`Unexpected response: ${response.statusText}`);
        }
      } catch (error) {
        console.error("Error uploading entries:", error.message);
        toast.error("Failed to upload entries to the database.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Bulk Upload Ends
  // Export
  const handleExport = async () => {
    try {
      // Send request using Axios to export stock data
      const response = await axios.get(
        "https://dmserver.onrender.com/api/export",
        {
          responseType: "arraybuffer", // Receive the response as a binary array
        }
      );

      // Create a Blob from the received array buffer
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create a temporary download link and trigger the download
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = "entries.xlsx"; // Set the default filename
      link.click();

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting stock data:", error);
      alert("An error occurred while exporting stock data.");
    }
  };
  //Exports Ends

  // Edit Entry
  const handleEditClick = useCallback(
    (id) => {
      const selected = entries.find((entry) => entry._id === id);
      if (selected) {
        setEditData(selected);
        setShowEditModal(true);
      }
    },
    [entries]
  );

  const handleSubmitted = async () => {
    try {
      const response = await axios.put(
        `https://dmserver.onrender.com/api/editentry/${editData._id}`,
        editData
      );

      toast.success("Entry updated successfully!");

      setEntries((prevEntries) =>
        prevEntries.map((entry) =>
          entry._id === editData._id ? { ...entry, ...response.data } : entry
        )
      );

      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating entry:", error.message);
      toast.error("Failed to update entry.");
    }
  };
  // End Edit Submit

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "https://dmserver.onrender.com/api/entry",
        formData
      );
      console.log(response.data);

      // Show success toast
      toast.success("Entry added successfully!", {
        position: "top-right",
        style: {
          backgroundColor: "#4caf50",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        },
        icon: "✅", // Add custom icon
      });

      // Reset form fields
      setFormData({
        createdAt: "",
        customerName: "",
        mobileNumber: "",
        address: "",
        state: "",
        city: "",
        organization: "",
        category: "",
      });
      setSelectedState(""); // Reset state
      setSelectedCity(""); // Reset city
      // Fetch updated entries
      await fetchEntries();

      handleClose(); // Close the modal
    } catch (error) {
      console.error(
        "Error adding entry:",
        error.response ? error.response.data : error.message
      );

      toast.error("Something went wrong!", {
        position: "bottom-right",
        style: {
          backgroundColor: "#f44336",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        },
        icon: "❌", // Add custom icon
      });
    }
  };

  // Copy Logic

  const handleCopy = () => {
    const textToCopy = `
      Date: ${
        selectedEntry.createdAt
          ? new Date(selectedEntry.createdAt).toLocaleDateString()
          : "N/A"
      }
      Customer Name: ${selectedEntry.customerName || "N/A"}
      Mobile Number: ${selectedEntry.mobileNumber || "N/A"}
      Address: ${selectedEntry.address || "N/A"}
      Organization: ${selectedEntry.organization || "N/A"}
      Category: ${selectedEntry.category || "N/A"}
    `;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
    });
  };
  // Delete Api
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this entry?"
    );
    if (confirmDelete) {
      try {
        const response = await axios.delete(
          `https://dmserver.onrender.com/api/entry/${id}`
        );
        if (response.status === 200) {
          // Successfully deleted
          setEntries(entries.filter((entry) => entry._id !== id));
          toast.success("Entry deleted successfully!");
        }
      } catch (error) {
        console.error("Error deleting entry:", error.message);
        toast.error("Failed to delete entry.");
      }
    }
  };
  // Filtering

  // Handle state selection
  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity(""); // Reset city when state changes
    setFormData((prev) => ({
      ...prev,
      state,
      city: "", // Clear the city when state changes
    }));
  };

  // Handle city selection
  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setFormData((prev) => ({
      ...prev,
      city,
    }));
  };

  // Cites And State
  const statesAndCities = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Ziro", "Pasighat"],
    Assam: ["Guwahati", "Dibrugarh", "Jorhat", "Silchar"],
    Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
    Chhattisgarh: ["Raipur", "Bilaspur", "Durg", "Korba"],
    Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
    Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    Haryana: ["Gurgaon", "Faridabad", "Panipat", "Ambala"],
    "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Mandi"],
    Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
    Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
    Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kannur"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
    Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
    Manipur: ["Imphal", "Churachandpur", "Thoubal", "Bishnupur"],
    Meghalaya: ["Shillong", "Tura", "Nongpoh", "Cherrapunjee"],
    Mizoram: ["Aizawl", "Lunglei", "Champhai", "Serchhip"],
    Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Tuensang"],
    Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
    Punjab: ["Amritsar", "Mohali", "Ludhiana", "Patiala", "Jalandhar"],
    Rajasthan: ["Jaipur", "Udaipur", "Jodhpur", "Kota"],
    Sikkim: ["Gangtok", "Namchi", "Pelling", "Geyzing"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
    Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
    Tripura: ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar"],
    "Uttar Pradesh": [
      "Lucknow",
      "Kanpur",
      "Varanasi",
      "Agra",
      "Allahabad",
      "Ghaziabad",
      "Noida",
      "Meerut",
      "Aligarh",
      "Bareilly",
      "Badaun",
    ],
    Uttarakhand: ["Dehradun", "Haridwar", "Nainital", "Rishikesh"],
    "West Bengal": ["Kolkata", "Darjeeling", "Siliguri", "Howrah"],
    "Andaman and Nicobar Islands": [
      "Port Blair",
      "Havelock Island",
      "Diglipur",
    ],
    Chandigarh: ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
    Delhi: ["New Delhi"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
    Ladakh: ["Leh", "Kargil"],
    Lakshadweep: ["Kavaratti", "Agatti", "Minicoy"],
    Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  };

  // Cites and State Ends
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <>
          <>
            <div className="loading-wave">
              <div className="loading-bar" />
              <div className="loading-bar" />
              <div className="loading-bar" />
              <div className="loading-bar" />
            </div>
          </>
        </>
      </div>
    );
  }

  // Ends Here
  return (
    <>
      {/* Search */}
      <div className="enhanced-search-bar-container">
        <input
          style={{ width: "30%" }}
          type="text"
          className="enhanced-search-bar"
          placeholder="🔍 Search..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <select
          className="enhanced-filter-dropdown"
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <option value="">-- Select Category --</option>
          <option value="Private">Private</option>
          <option value="Government">Government</option>
        </select>

        <select
          className="enhanced-filter-dropdown"
          value={selectedStateA}
          onChange={handleStateChangeA}
        >
          <option value="">-- Select State --</option>
          {Object.keys(statesAndCities).map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        <select
          className="enhanced-filter-dropdown"
          value={selectedCityA}
          onChange={handleCityChangeA}
          disabled={!selectedStateA}
        >
          <option value="">-- Select City --</option>
          {selectedStateA &&
            statesAndCities[selectedStateA].map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
        </select>
        <button
          className="reset-button"
          onClick={handleReset}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 16px",
            borderRadius: "20px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            transition: "all 0.3s ease",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Reset</span>
          <span
            className="rounded-arrow"
            style={{
              marginLeft: "8px",
              display: "inline-flex",
              alignItems: "center",
              transition: "transform 0.3s ease",
            }}
          >
            →
          </span>
        </button>
      </div>
      {/* Search Ends */}
      <div
        className="dashboard-container"
        style={{ width: "90%", margin: "auto" }}
      >
        {/* Bulk Upload */}
        <div
          style={{
            textAlign: "center",
          }}
        >
          <label
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              borderRadius: "12px",
              marginLeft: "5%",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            Bulk Upload via Excel
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              style={{ display: "none" }}
            />
          </label>{" "}
          <button
            className="button mx-3"
            onClick={handleShow}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            Add New Entry
          </button>
          <button
            className="button mx-1"
            onClick={handleExport}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              border: "none",
              fontSize: "1rem",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0px 6px 12px rgba(0, 0, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            Export To Excel
          </button>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#6c757d",
              marginTop: "10px",
            }}
          >
            Upload a valid Excel file with columns:{" "}
            <strong>
              Customer Name, Mobile Number, Address, Organization, Category
            </strong>
          </p>
        </div>{" "}
        <div
          style={{
            marginBottom: "10px",
            fontWeight: "600",
            fontSize: "1rem",
            color: "#fff",
            background: "linear-gradient(90deg, #6a11cb, #2575fc)",
            padding: "5px 15px",
            borderRadius: "20px",
            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
            display: "inline-block",
            textAlign: "center",
            width: "auto",
            textTransform: "capitalize",
          }}
        >
          Total Results: {filteredData.length}
        </div>
        <div
          className="table-responsive"
          style={{
            width: "100%", // Set width to 100% for responsiveness
            margin: "0 auto", // Center the table container
            overflowX: "hidden", // Disable horizontal scrolling
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.1)", // Optional: Keep shadow for aesthetics
            borderRadius: "15px", // Adjusted for consistent border radius
            marginTop: "20px", // Add margin for spacing from top
            display: "block", // Ensures the table body scrolls
            overflowY: "auto", // Adds vertical scroll
            maxHeight: "75vh", // Set a fixed height for scrolling
            maxWidth: "100%", // Make sure it fits within the container
            height: "auto", // Adjusts based on content but doesn't exceed maxHeight
          }}
        >
          <Table
            bordered
            hover
            variant="light"
            className="custom-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
            }}
          >
            <thead
              style={{
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                color: "white",
                fontSize: "1.1rem",
                padding: "15px 20px",
                textAlign: "center",
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              <tr
                style={{
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  #
                </th>
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  Date
                </th>
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  Customer Name
                </th>
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  Mobile Number
                </th>
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  Address
                </th>
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  City
                </th>
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  State
                </th>
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  Organization
                </th>
                <th style={{ backgroundColor: "transparent", color: "white" }}>
                  Category
                </th>
                <th
                  style={{
                    backgroundColor: "transparent",
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>{row.customerName}</td>
                    <td style={{ width: "160px" }}>{row.mobileNumber}</td>
                    <td>{row.address}</td>
                    <td>{row.city}</td> {/* Adding city */}
                    <td>{row.state}</td> {/* Adding state */}
                    <td>{row.organization}</td>
                    <td>{row.category}</td>
                    <td style={{ width: "150px" }}>
                      <Row>
                        <Col className="d-flex justify-content-center">
                          {/* View Button */}
                          <Button
                            variant="primary"
                            className="mx-2"
                            onClick={() => handleShowDetails(row._id)}
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "22px",
                            }}
                          >
                            <FaEye style={{ marginBottom: "3px" }} />
                          </Button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(row._id)}
                            className="editBtn"
                          >
                            <svg height="1em" viewBox="0 0 512 512">
                              <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            className="bin-button mx-2"
                            onClick={() => handleDelete(row._id)}
                          >
                            <svg
                              class="bin-top"
                              viewBox="0 0 39 7"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <line
                                y1="5"
                                x2="39"
                                y2="5"
                                stroke="white"
                                stroke-width="4"
                              ></line>
                              <line
                                x1="12"
                                y1="1.5"
                                x2="26.0357"
                                y2="1.5"
                                stroke="white"
                                stroke-width="3"
                              ></line>
                            </svg>
                            <svg
                              class="bin-bottom"
                              viewBox="0 0 33 39"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <mask id="path-1-inside-1_8_19" fill="white">
                                <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"></path>
                              </mask>
                              <path
                                d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
                                fill="white"
                                mask="url(#path-1-inside-1_8_19)"
                              ></path>
                              <path
                                d="M12 6L12 29"
                                stroke="white"
                                stroke-width="4"
                              ></path>
                              <path
                                d="M21 6V29"
                                stroke="white"
                                stroke-width="4"
                              ></path>
                            </svg>
                          </button>
                        </Col>
                      </Row>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center">
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
        {/* Modal for Adding New Entry */}
        <Modal show={show} onHide={handleClose} centered>
          <Modal.Header
            closeButton
            style={{
              background: "linear-gradient(to right, #6a11cb, #2575fc)",
              color: "#fff",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Modal.Title style={{ fontWeight: "bold", fontSize: "1.5rem" }}>
              <span role="img" aria-label="add-entry">
                ✨
              </span>{" "}
              Add New Entry
            </Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ padding: "2rem" }}>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="formCustomerName">
                <Form.Label>Customer Name</Form.Label>
                <Form.Control
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInput}
                  required
                  placeholder="Enter customer name"
                  style={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>

              <Form.Group controlId="mobileNumber">
                <Form.Label>Mobile Number</Form.Label>
                <Form.Control
                  type="text"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInput}
                  required
                  placeholder="Enter mobile number"
                  maxLength={10} // Restrict input length to 10
                  style={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                />
                {formData.mobileNumber && formData.mobileNumber.length < 10 && (
                  <small style={{ color: "red" }}>
                    Mobile number must be 10 digits.
                  </small>
                )}
              </Form.Group>

              <Form.Group controlId="formAddress" style={{ marginTop: "1rem" }}>
                <Form.Label>Address</Form.Label>
                <Form.Control
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInput}
                  required
                  placeholder="Enter address"
                  style={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>
              <Form.Group controlId="formState" style={{ marginTop: "1rem" }}>
                <Form.Label>State</Form.Label>
                <Form.Control
                  as="select"
                  name="state"
                  value={selectedState}
                  onChange={handleStateChange}
                  required
                  style={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <option value="">-- Select State --</option>
                  {/* Assuming `states` is an array of state names */}
                  {Object.keys(statesAndCities).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
              <Form.Group controlId="formCity" style={{ marginTop: "1rem" }}>
                <Form.Label>City</Form.Label>
                <Form.Control
                  as="select"
                  name="city"
                  value={selectedCity}
                  onChange={handleCityChange}
                  disabled={!selectedState}
                  required
                  style={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <option value="">-- Select City --</option>
                  {selectedState &&
                    statesAndCities[selectedState].map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                </Form.Control>
              </Form.Group>

              <Form.Group
                controlId="formOrganization"
                style={{ marginTop: "1rem" }}
              >
                <Form.Label>Organization</Form.Label>
                <Form.Control
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInput}
                  required
                  placeholder="Enter organization"
                  style={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>

              <Form.Group
                controlId="formCategory"
                style={{ marginTop: "1rem" }}
              >
                <Form.Label>Category</Form.Label>
                <Form.Control
                  as="select"
                  name="category"
                  value={formData.category}
                  onChange={handleInput}
                  required
                  style={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <option value="">-- Select Category --</option>
                  <option value="Private">Private</option>
                  <option value="Government">Government</option>
                </Form.Control>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                style={{
                  width: "100%",
                  marginTop: "1rem",
                  backgroundColor: "#2575fc",
                  border: "none",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
              >
                Save
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
        {/* Details Modal */}
        {selectedEntry ? (
          <Modal show={showDetails} onHide={handleClosed} centered>
            <Modal.Header
              closeButton
              style={{
                background: "linear-gradient(to right, #6a11cb, #2575fc)",
                color: "#fff",
                borderBottom: "none",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                position: "relative",
              }}
            >
              <Modal.Title style={{ fontWeight: "bold", fontSize: "1.5rem" }}>
                <span role="img" aria-label="entry-details">
                  📝
                </span>{" "}
                Entry Details
              </Modal.Title>
            </Modal.Header>
            <Modal.Body
              style={{
                padding: "2rem",
                backgroundColor: "#f9f9f9",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  lineHeight: "1.6",
                  color: "#333",
                }}
              >
                <p>
                  <strong style={{ color: "#6a11cb" }}>Date:</strong>{" "}
                  {selectedEntry.createdAt
                    ? new Date(selectedEntry.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <strong style={{ color: "#6a11cb" }}>Customer Name:</strong>{" "}
                  {selectedEntry.customerName || "N/A"}
                </p>
                <p>
                  <strong style={{ color: "#6a11cb" }}>Mobile Number:</strong>{" "}
                  {selectedEntry.mobileNumber || "N/A"}
                </p>
                <p>
                  <strong style={{ color: "#6a11cb" }}>Address:</strong>{" "}
                  {selectedEntry.address || "N/A"}
                </p>
                <p>
                  <strong style={{ color: "#6a11cb" }}>State:</strong>{" "}
                  {selectedEntry.state || "N/A"}
                </p>
                <p>
                  <strong style={{ color: "#6a11cb" }}>City:</strong>{" "}
                  {selectedEntry.city || "N/A"}
                </p>
                <p>
                  <strong style={{ color: "#6a11cb" }}>Organization:</strong>{" "}
                  {selectedEntry.organization || "N/A"}
                </p>
                <p>
                  <strong style={{ color: "#6a11cb" }}>Category:</strong>{" "}
                  {selectedEntry.category || "N/A"}
                </p>
              </div>

              <Button
                variant="secondary"
                style={{
                  marginTop: "1rem",
                  backgroundColor: "#6a11cb",
                  color: "#fff",
                  width: "100%",
                  borderRadius: "22px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
                onClick={handleCopy}
              >
                {copied ? (
                  <span role="img" aria-label="check">
                    ✅
                  </span>
                ) : (
                  <span role="img" aria-label="copy">
                    📋
                  </span>
                )}{" "}
                {copied ? "Copied!" : "Copy Details"}
              </Button>

              {copied && (
                <div
                  style={{
                    position: "absolute",
                    top: "-30px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "#6a11cb",
                    color: "#fff",
                    padding: "5px 10px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                    opacity: 1,
                    transition: "opacity 0.3s ease-out",
                  }}
                >
                  Copied!
                </div>
              )}
            </Modal.Body>
          </Modal>
        ) : (
          <></>
        )}
        {/* Details Ends */}
      </div>
      {/* Edit Modal */}
      {/* {showEditModal ? ( */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "white",
            fontSize: "1.1rem",
          }}
        >
          <Modal.Title
            className="text-center w-100"
            style={{ fontWeight: "bold" }}
          >
            Edit Entry Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form style={{ fontFamily: "'Poppins', sans-serif", color: "#444" }}>
            <div
              className="modal-info"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "20px",
                padding: "10px",
              }}
            >
              {/* Customer Name Field */}
              <Form.Group
                controlId="formCustomerName"
                style={{ position: "relative" }}
              >
                <Form.Label
                  style={{
                    fontWeight: "bold",
                    color: "#2575fc",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span role="img" aria-label="customer">
                    👤
                  </span>{" "}
                  Customer Name
                </Form.Label>
                <Form.Control
                  type="text"
                  name="customerName"
                  value={editData.customerName || ""}
                  onChange={handleInputChange}
                  required
                  minLength={1}
                  maxLength={100}
                  style={{
                    background: "#f7f8fa",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    fontSize: "1rem",
                    color: "#333",
                    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>

              {/* Mobile Number Field */}
              <Form.Group
                controlId="formMobileNumber"
                style={{ position: "relative" }}
              >
                <Form.Label
                  style={{
                    fontWeight: "bold",
                    color: "#2575fc",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span role="img" aria-label="mobile">
                    📱
                  </span>{" "}
                  Mobile Number
                </Form.Label>
                <Form.Control
                  type="text"
                  name="mobileNumber"
                  value={editData.mobileNumber || ""}
                  onChange={handleInputChange}
                  required
                  pattern="^[0-9]+$"
                  minLength={10}
                  maxLength={15}
                  style={{
                    background: "#f7f8fa",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    fontSize: "1rem",
                    color: "#333",
                    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>

              {/* Address Field */}
              <Form.Group
                controlId="formAddress"
                style={{ position: "relative" }}
              >
                <Form.Label
                  style={{
                    fontWeight: "bold",
                    color: "#2575fc",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span role="img" aria-label="address">
                    🏠
                  </span>{" "}
                  Address
                </Form.Label>
                <Form.Control
                  type="text"
                  name="address"
                  value={editData.address || ""}
                  onChange={handleInputChange}
                  required
                  minLength={5}
                  maxLength={200}
                  style={{
                    background: "#f7f8fa",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    fontSize: "1rem",
                    color: "#333",
                    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>

              {/* State Field */}
              <Form.Group
                controlId="formState"
                style={{ position: "relative" }}
              >
                <Form.Label
                  style={{
                    fontWeight: "bold",
                    color: "#2575fc",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span role="img" aria-label="state">
                    🗺️
                  </span>{" "}
                  State
                </Form.Label>
                <Form.Control
                  type="text"
                  name="state"
                  value={editData.state || ""}
                  onChange={handleInputChange}
                  required
                  style={{
                    background: "#f7f8fa",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    fontSize: "1rem",
                    color: "#333",
                    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>

              {/* City Field */}
              <Form.Group controlId="formCity" style={{ position: "relative" }}>
                <Form.Label
                  style={{
                    fontWeight: "bold",
                    color: "#2575fc",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span role="img" aria-label="city">
                    🌆
                  </span>{" "}
                  City
                </Form.Label>
                <Form.Control
                  type="text"
                  name="city"
                  value={editData.city || ""}
                  onChange={handleInputChange}
                  required
                  style={{
                    background: "#f7f8fa",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    fontSize: "1rem",
                    color: "#333",
                    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>

              {/* Organization Field */}
              <Form.Group
                controlId="formOrganization"
                style={{ position: "relative" }}
              >
                <Form.Label
                  style={{
                    fontWeight: "bold",
                    color: "#2575fc",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span role="img" aria-label="organization">
                    🏢
                  </span>{" "}
                  Organization
                </Form.Label>
                <Form.Control
                  type="text"
                  name="organization"
                  value={editData.organization || ""}
                  onChange={handleInputChange}
                  required
                  minLength={1}
                  maxLength={100}
                  style={{
                    background: "#f7f8fa",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    fontSize: "1rem",
                    color: "#333",
                    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>

              {/* Category Field */}
              <Form.Group
                controlId="formCategory"
                style={{ position: "relative" }}
              >
                <Form.Label
                  style={{
                    fontWeight: "bold",
                    color: "#2575fc",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span role="img" aria-label="category">
                    📁
                  </span>{" "}
                  Category
                </Form.Label>
                <Form.Control
                  type="text"
                  name="category"
                  value={editData.category || ""}
                  onChange={handleInputChange}
                  required
                  minLength={1}
                  maxLength={50}
                  style={{
                    background: "#f7f8fa",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "10px 15px",
                    fontSize: "1rem",
                    color: "#333",
                    boxShadow: "inset 0px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </Form.Group>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer
          style={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "white",
            fontSize: "1.1rem",
          }}
        >
          <Button
            variant="danger"
            onClick={handleCloseEditModal}
            style={{
              background: "linear-gradient(135deg, #FF5252, #D50000)",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "25px",
              border: "none",
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            onMouseDown={(e) =>
              (e.target.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)")
            }
            onMouseUp={(e) =>
              (e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)")
            }
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitted}
            style={{
              background: "linear-gradient(135deg, #4CAF50, #2E7D32)",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "25px",
              border: "none",
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            onMouseDown={(e) =>
              (e.target.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)")
            }
            onMouseUp={(e) =>
              (e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)")
            }
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
      {/* ) : (
        <p>No data available</p>
      )} */}
      {/* Dist Modal end */}

      {/* Footer  */}
      <footer className="footer-container">
        {/* Footer Bottom */}

        <p style={{ marginTop: "15px" }}>
          &copy; 2025 DataManagement. All rights reserved.
        </p>
      </footer>
      {/* Footer End */}
    </>
  );
}

export default DashBoard;
