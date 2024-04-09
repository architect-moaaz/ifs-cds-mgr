//#region imports and defaults
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
var cors = require("cors");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const app = express();
const zlib = require("zlib");
const checkNodeEnv = require("./configService");

var config = checkNodeEnv();

const {
  mongodb: { url },
  app: { port }
} = config;

app.use(cors());
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
const mongoURI = "mongodb://" + url;
console.log("DB URI:: : ", mongoURI);
const conn = mongoose.createConnection(mongoURI);
let gfs;
conn.once("open", () => {
  console.log("Connected to DB at : ", url);
  gfs = Grid(conn.db, mongoose.mongo);
});
//#endregion
//#region Storage
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        var filename = buf.toString("hex") + path.extname(file.originalname);
        if (req.params.collection == "IFprofilePicture") {
          var re = /(?:\.([^.]+))?$/;
          filename = req.headers["userid"];
        }
        if(req.params.collection == "template"){
          filename =file.originalname;
        }
        console.log("req.params.collection", req.params.collection);
        //console.log("req.headers", req);

        if (req.params.collection == "appLogo") {
          filename = req.headers["logoname"];
        }
        if (req.body.filecompressed && req.body.filecompressed == "true") {
          var filecompressed = true;
        } else {
          var filecompressed = false;
        }
        gfs.collection(req.params.collection);
        // only removing the file metadata 
        // gfs.files.remove({ filename: filename }, (err, gridStore) => {
        //   if (err) {
        //     return res.status(404).json({ err: err });
        //   }
        //   const fileInfo = {
        //     filename: filename,
        //     bucketName: req.params.collection,
        //     metadata: {
        //       filecompressed: filecompressed,
        //     },
        //   };
        //   resolve(fileInfo);
        // });

        // removing the file metadata and content
        gfs.remove({ filename: filename, root: req.params.collection }, (err, gridStore) => {
          if (err) {
            return res.status(404).json({ err: err });
          }
          const fileInfo = {
            filename: filename,
            bucketName: req.params.collection,
            metadata: {
              filecompressed: filecompressed,
            },
          };
          resolve(fileInfo);
        });
      });
    });
  },
});
const upload = multer({ storage });
//#endregion
//#region public APIs s

// @route POST /:collection/upload
app.post("/:collection/upload", upload.single("file"), (req, res) => {
  //   const conn = mongoose.createConnection(youConnectionURI);
  // const gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, {bucketName: 'yourBucketName'});
  console.log("Image Uploaded");
  res.json({ file: req.file });
});

// @route GET /files
// @desc  Display all files in JSON
app.get("/:collection/files", (req, res) => {
  console.log("Files Are Fetched");
  gfs.collection(req.params.collection);
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist",
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get("/files/:filename", (req, res) => {
  console.log("File Fetched");
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists",
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
app.get("/:collection/image/:filename", async (req, res) => {
  try {
      // Set the flag to true and process the request
      gfs.collection(req.params.collection);
      const file = await new Promise((resolve, reject) => {
        gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
          if (err) return reject(err);
          resolve(file);
        });
      });
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: "No file exists",
        });
      }
      const filetypes = [
        "image/jpeg",
        "image/png",
        "image/jpeg",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      // Check if image
      if (filetypes.includes(file.contentType)) {
        // Read output to browser
        const readStream = gfs.createReadStream(file.filename);
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Length', file.length);
        readStream.on("error", (err) => {
          console.log("An error occurred while reading the file: ", err);
          res.status(500).send("An error occurred while reading the file.");
        });
        await new Promise((resolve) => {
          readStream.on("data", (chunk) => {
            res.write(chunk);
          });
          readStream.on("end", () => {
            res.end();
            resolve();
          });
        });
      } else {
        res.status(404).json({
          err: "Not an image",
        });
      }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/:collection/file/:filename", (req, res) => {
  gfs.collection(req.params.collection);
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists",
      });
    }
    const secretKey = process.env.REPORT_FILE_SECRET;
    const receivedFileName = req.params.filename;
    const receivedFileNameHash = req.query.hash;
    const hash2 = crypto.createHash("sha256");
    hash2.update(receivedFileName + secretKey);
    const receivedFileNameHash2 = hash2.digest("hex");
    if (receivedFileNameHash !== receivedFileNameHash2) {
      return res.status(403).json({ message: "Invalid file name" });
    }
    const readstream = gfs.createReadStream(file.filename);
    if (
      file.contentType == "application/pdf" || file.contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      (file.metadata &&
          file.metadata.filecompressed &&
          file.metadata.filecompressed == true)
  ) {
      const gunzip = zlib.createGunzip();
      readstream.pipe(gunzip).pipe(res);
    } else {
      res.setHeader("Content-Type", file.contentType);
      res.setHeader("Content-Length", file.length);
      readstream.pipe(res);
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect("/");
      });
    });
//#endregion


app.get("/template", (req, res) => { 
  gfs.collection("template"); 
  gfs.files.findOne({ filename: req.headers.filename }, (err, file) => { 
    // Check if file 
    if (!file || file.length === 0) { 
      return res.status(404).json({ err: "No file exists", }); 
    } 
    const readstream = gfs.createReadStream(file.filename); 
    if ( file.contentType == "application/html" || 
      (file.metadata && file.metadata.filecompressed && file.metadata.filecompressed == true) ) { 
      const gunzip = zlib.createGunzip(); 
      readstream.pipe(gunzip).pipe(res); 
    } else { 
      res.setHeader("Content-Type", file.contentType); 
      res.setHeader("Content-Length", file.length); 
      readstream.pipe(res); 
    } 
  }); 
});

app.listen(port, () => console.log(`Server started on port ${port}`));
