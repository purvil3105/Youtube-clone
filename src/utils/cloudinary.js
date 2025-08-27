import {v2 as cloudinary} from "cloudinary";
import { log } from "console";
 import fs from "fs";

 cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
 })

 const uploadOnCloudinary = async (localfilepath) =>{
    try {
        if(!localfilepath) return null
       const response = await cloudinary.uploader.upload(localfilepath, {resource_type: "auto"})
      //   console.log("Uploaded to Cloudinary:", response.url);
         fs.unlinkSync(localfilepath) // Delete the local file after successful upload
        return response
    } catch (error) {
         fs.unlinkSync(localfilepath) // Delete the local file if upload fails
         console.error("Error uploading to Cloudinary:", error);
         return null;
    }
 }

 export default uploadOnCloudinary;