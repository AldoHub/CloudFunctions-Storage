const functions = require('firebase-functions');
//add google-cloud/storage functionality
const {Storage} = require("@google-cloud/storage");
//nodejs OS method
const nodeOs = require("os");
const path = require("path");
const cors = require("cors");

const projectID = "cloudfunctions-e62de";

const storage = new Storage({
    projectId: projectID,
    keyFilename: "cloudfunctions-e62de-firebase-adminsdk-2t83e-5deb7e199f.json"
})

//send the file using the onFinalize
//event fires when creating, updating / replacing a object inside the bucket
exports.storageEvent = functions.storage.object().onFinalize(e => {
    console.log(e);
    //----------------- first add of the file
    
    //get the object
    const objName = e.name;
    //get the current bucket
    const currBucket = e.bucket;
    const contType = e.contentType;
       
    console.log("Object added to the bucket");

    //----------------- manipulation of the file

    //build the temp file to store the downloaded file
    const tmpFilePath =  path.join(nodeOs.tmpdir(), objName);
    const metadata = {contentType: contType};
    const destBucket = storage.bucket(currBucket);
   

   
    //check if file was already renamed
    if(path.basename(objName).startsWith("renamed_")){
        console.log("File was already renamed");
        return false;
    }else{
        return destBucket.file(objName).download({
            destination: tmpFilePath
        }).then(() => {
            let b=  storage.bucket(currBucket);
            let file = b.file(objName);

            file.delete();

            return destBucket.upload(tmpFilePath,{
                destination: "renamed_" +  objName,
                metadata: metadata
            });
        }).catch(e => {
            console.log(e);
        });

    }
    
  
   
});


//function that catches the delete event
exports.deleteEvent = functions.storage.object().onDelete(e => {
    console.log("Object deleted from the bucket");
    console.log(e);
    return;
});




const express = require("express");
const Busboy = require("busboy");
const fs = require("fs");
const cloudApp = express();



cloudApp.use(cors());


cloudApp.post("/cloudForm", (req, res, next) =>{
    const busboy = new Busboy({ headers: req.headers });
    const tmpdir = nodeOs.tmpdir();
    //let filedata = null;
    

    // all fields
    const fields = {};

    // all files, keyed by their name.
    const uploads = {};

    // process each non-file field in the form.
    busboy.on('field', (fieldname, val) => {
         // TODO(developer): Process submitted field values here
        console.log(`Processed field ${fieldname}: ${val}.`);
        fields[fieldname] = val;
      });
    // process each file uploaded
    busboy.on('file', (fieldname, file, filename, mimetype) => {
     
        console.log(`Processed file ${filename}`);
       
        // Note that os.tmpdir() is an in-memory file system, so should only 
        // be used for files small enough to fit in memory.
        //Create the filepath
        const filepath = path.join(tmpdir, filename);
       
        //add it to the uploads object
        uploads[fieldname] = filepath;
       
       // filedata = {file: filepath, type: mimetype}

        //Create the file stream
        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);
  
   
    });  


    busboy.on('finish', () => {
        const bucket = storage.bucket("cloudfunctions-e62de.appspot.com");  
        for (const name in uploads) {
            const file = uploads[name];

            //console.log(`${path.basename(file)} was stored in memory`);
            bucket.upload(file).then(()=>{
               console.log("image uploaded"); 
               //remove files 
               fs.unlinkSync(file);
               res.status(200).json({
                   message: "Image was uploaded"
               });
               return true;
            }).catch(err => {
                res.status(500).json({
                    message: err
                });
                return false;
            });
            
           
          }
        //res.send();
        return true;

    });
      // The raw bytes of the upload will be in req.rawBody.  Send it to busboy, and get
      // a callback when it's finished.
      busboy.end(req.rawBody);
   
    
})



//https://us-central1-cloudfunctions-e62de.cloudfunctions.net/uploadFile/cloudForm

//onRequest function to store the files
exports.uploadFile = functions.https.onRequest(cloudApp);