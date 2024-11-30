const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors"); // Import CORS library

const app = express();
const PORT = 3000;

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Allow all CORS requests
app.use(cors());

// File path for storing drivers
const driversFilePath = path.join(__dirname, "drivers.json");

// Ensure the drivers file exists
if (!fs.existsSync(driversFilePath)) {
  fs.writeFileSync(driversFilePath, "[]", "utf8"); // Create empty JSON array
}

// Route to get all drivers
app.get("/drivers", (req, res) => {
  fs.readFile(driversFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading drivers file:", err);
      return res.status(500).send("Error reading drivers file");
    }
    res.json(JSON.parse(data || "[]")); // Send an empty array if the file is empty
  });
});

// Route to add a new driver
app.post("/drivers", (req, res) => {
  const newDriver = req.body;

  // Read existing drivers
  fs.readFile(driversFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading drivers file:", err);
      return res.status(500).send("Error reading drivers file");
    }

    const drivers = JSON.parse(data || "[]");
    drivers.push(newDriver); // Add the new driver

    // Write updated drivers back to the file
    fs.writeFile(driversFilePath, JSON.stringify(drivers, null, 2), (err) => {
      if (err) {
        console.error("Error writing drivers file:", err);
        return res.status(500).send("Error writing drivers file");
      }
      res.status(201).send("Driver added successfully");
    });
  });
});


// File path for storing clients
const clientsFilePath = path.join(__dirname, "clients.json");

// Ensure the file exists
if (!fs.existsSync(clientsFilePath)) {
  fs.writeFileSync(clientsFilePath, JSON.stringify({}));
}

// Add or update client route
app.post("/clients", (req, res) => {
  const { clientName, driverName, payment, paymentDate, paymentStatus, currency } = req.body;

  if (!clientName || !driverName || !payment || !paymentDate || !paymentStatus || !currency) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Read existing data
  const clientsData = JSON.parse(fs.readFileSync(clientsFilePath, "utf-8"));

  // Add or update client data
  if (!clientsData[clientName]) {
    clientsData[clientName] = {};
  }

  // Generate bookingId based on the number of existing bookings
  const bookingId = Object.keys(clientsData[clientName]).length + 1;

  clientsData[clientName][bookingId] = {
    driverName,
    payment,
    paymentDate,
    paymentStatus,
    currency,
  };

  // Write updated data back to the file
  fs.writeFileSync(clientsFilePath, JSON.stringify(clientsData, null, 2));

  res.status(200).json({ message: "Client data added/updated successfully." });
});

app.get("/clients", (req, res) => {
    // Ensure the file exists
    if (!fs.existsSync(clientsFilePath)) {
      fs.writeFileSync(clientsFilePath, JSON.stringify({}));
    }
  
    // Read clients data from file
    const clientsData = JSON.parse(fs.readFileSync(clientsFilePath, "utf-8"));
  
    // Send client names only
    res.status(200).json(clientsData);
  });
  

  app.get("/driver-details", (req, res) => {
    const driverName = req.query.driverName?.toLowerCase();
  
    if (!driverName) {
      return res.status(400).json({ error: "Driver name is required" });
    }
  
    // Read clients.json file
    const clientsData = JSON.parse(fs.readFileSync(clientsFilePath, "utf-8"));
  
    // Read drivers.json file to get all drivers
    const driversData = JSON.parse(fs.readFileSync(driversFilePath, "utf-8"));
  
    // Find driver(s) with a partial name match
    const matchedDrivers = driversData.filter((driver) => {
      const fullName = `${driver.firstName.toLowerCase()} ${driver.lastName.toLowerCase()}`;
      return fullName.includes(driverName);
    });
  
    if (matchedDrivers.length === 0) {
      return res.status(404).json({ error: "No drivers found matching the search query." });
    }
  
    const driverDetails = [];
  
    // Find all bookings for matched drivers
    for (const clientName in clientsData) {
      for (const bookingId in clientsData[clientName]) {
        const booking = clientsData[clientName][bookingId];
        // Check if the driver name matches any matched driver
        const isDriverMatch = matchedDrivers.some(
          (driver) =>
            booking.driverName.toLowerCase() ===
            `${driver.firstName.toLowerCase()} ${driver.lastName.toLowerCase()}`
        );
  
        if (isDriverMatch) {
          driverDetails.push({
            ...booking,
            clientName,
          });
        }
      }
    }
  
    res.json({ driverDetails });
  });
  
  
// Route to update payment
app.post("/update-payment", (req, res) => {
    const { clientName, bookingId, payment, paymentStatus } = req.body;
  
    if (!clientName || !bookingId || payment === undefined || !paymentStatus) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    // Read clients data
    const clientsData = JSON.parse(fs.readFileSync(clientsFilePath, "utf-8"));
  
    // Update payment record
    if (
      clientsData[clientName] &&
      clientsData[clientName][bookingId]
    ) {
      clientsData[clientName][bookingId].payment = payment;
      clientsData[clientName][bookingId].paymentStatus = paymentStatus;
  
      // Save updated data
      fs.writeFileSync(clientsFilePath, JSON.stringify(clientsData, null, 2));
      res.json({ message: "Payment updated successfully" });
    } else {
      res.status(404).json({ error: "Record not found" });
    }
  });


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
