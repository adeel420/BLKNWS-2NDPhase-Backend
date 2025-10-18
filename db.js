const mongoose = require("mongoose");
const mongoURL =
  "mongodb+srv://adeelimran467:admin1122@cluster0.8s48f.mongodb.net/";
mongoose.connect(mongoURL);
const db = mongoose.connection;
db.on("connected", () => {
  console.log("Connected to MongoDB");
});
db.on("disconnected", () => {
  console.log("Disconnected to MongoDB");
});
db.on("error", (err) => {
  console.log("Error to connected the MongoDB");
});
module.exports = db;
