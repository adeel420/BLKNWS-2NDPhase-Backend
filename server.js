const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();
const db = require("./db");
const userRoutes = require("./routes/UserRoutes");
const passport = require("./middleware/auth");
const cors = require("cors");

// Packages
app.use(cors());
const PORT = process.env.PORT || 8080;
app.use(bodyParser.json());
app.use(passport.initialize());
const authMiddleware = passport.authenticate("local", { session: false });

// Routes
app.use("/user", userRoutes);

app.listen(PORT, () => {
  console.log(`Listening the port ${PORT}`);
});
