import { asyncHandler } from "../utils/aysnchandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async(req, res, next)=>{
   try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if(!token) throw new ApiError(401, "Unauthorized");
 
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if(!decoded) throw new ApiError(401, "Unauthorized");
 
    const user = await User.findById(decoded?._id).select("-password -refreshToken");
 
    if(!user) throw new ApiError(401, "Invalid access token");
 
     req.user = user;
     next();
   } catch (error) {
       throw new ApiError(401, error?.message || "Invalid access token");
   }
})