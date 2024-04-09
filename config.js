require("dotenv").config();
var config = {
  development: {
    app: {
      port: 51524,
    },
    mongodb: {
      url: "devadmin:hau2Opeef7Hoos8eeNgo@151.106.38.94:32030/cds?authSource=admin&",
    },
  },
  production: {
    app: {
      port: process.env.DEV_PORT,
    },
    mongodb: {
      url:
        process.env.DEV_MONGO_USERNAME +
        ":" +
        process.env.DEV_MONGO_PASSWORD +
        "@" +
        process.env.DEV_MONGO_HOST +
        ":" +
        process.env.DEV_MONGO_PORT +
        "/" +
        process.env.DEV_MONGO_NAME +
        "?authSource=admin&",
    },
  },
  colo: {
    app: {
      port: process.env.COLO_PORT,
    },
    mongodb: {
      url:
        process.env.COLO_MONGO_USERNAME +
        ":" +
        process.env.COLO_MONGO_PASSWORD +
        "@" +
        process.env.COLO_MONGO_HOST +
        ":" +
        process.env.COLO_MONGO_PORT +
        "/" +
        process.env.COLO_MONGO_NAME +
        "?authSource=admin&",
    },
  },
  uat: {
    app: {
      port: process.env.UAT_PORT,
    },
    mongodb: {
      url:
        process.env.UAT_MONGO_USERNAME +
        ":" +
        process.env.UAT_MONGO_PASSWORD +
        "@" +
        process.env.UAT_MONGO_HOST +
        ":" +
        process.env.UAT_MONGO_PORT +
        "/" +
        process.env.UAT_MONGO_NAME +
        "?authSource=admin&",
    },
  },
};

module.exports = config;
