const configData = require("./config");

function checkNodeEnv() {
  var env = process.env.NODE_ENV || "development";
  var config = null;
  if (env.trim() == "development") {
    console.log("Starting Local/Development Env");
    config = configData.development;
  } else if (env.trim() == "production") {
    console.log("Starting Dev/Production Env");
    config = configData.production;
  } else if (env.trim() == "colo") {
    console.log("Starting Colo Env");
    config = configData.colo;
  } else {
    config = configData.uat;
    console.log("Starting UAT Env");
  }
  return config;
}
module.exports = checkNodeEnv;
