import {asyncHandler} from "../utils/aysnchandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import  uploadOnCloudinary  from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const gen_AccandRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccesstoken();
        const refreshToken = user.generateRefreshtoken();

       user.refreshToken = refreshToken;
       await user.save({validateBeforeSave: false})

       return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "error in generating access and refresh token");
    }
} 

const registerUser = asyncHandler(async (req, res) => {
    
    const {fullname, email, username, password} = req.body;
    console.log("email: ", email);

    if([fullname, email, username, password].some((field)=> field?.trim()==="")){
        throw new ApiError(400, "All fields are required");
    }

    const existedUSer = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUSer){
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverimage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0){
        coverImageLocalPath = req.files.coverimage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(400, "Failed to upload avatar");
    
    const user = await User.create({ 
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverimage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser) throw new ApiError(500, "User not found after creation");

    res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered successfully")
    )
});

const loginUser = asyncHandler(async (req, res) =>{

    const {email, username, password} = req.body;

    if(!username && !email){
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = await gen_AccandRefreshToken(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200).
    cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken
      },
      "User logged in successfully"
    )
    );

});

const logoutUser = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set: {
            refreshToken: undefined
        }
    },{
        new: true
    })

    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )

})

const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken) throw new ApiError(401, "Refresh token is required");

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id);
    
    if(!user) throw new ApiError(401, "Invalid refresh token");

    if(incomingRefreshToken != user?.refreshToken){
        throw new ApiError(403, "Forbidden");
    }

    const options = {
        httpOnly: true,
        secure: true 
    }

    const { accessToken, newrefreshToken } = await gen_AccandRefreshToken(user._id)

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newrefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {accessToken, refreshToken: newrefreshToken},
            "Access token refreshed successfully"

        )
    )
}) 
 

const changeCurrentpassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body;

    if(!oldPassword || !newPassword){
        throw new ApiError(400, "Old password and new password are required");
    }

    const user = await User.findById(req.user._id)

    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isOldPasswordCorrect){
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});


    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async(req, res)=>{
    return res.status(200).json(
        new ApiResponse(200, req.user, "User fetched successfully")
    )
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {email, username} = req.body;

    if(!email && !username){
        throw new ApiError(400, "Email or username is required");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        email: email || user.email,
        username: username || user.username
    }, { new: true }).select("-password ");

    return res.status(200).json(
        new ApiResponse(200, user, "User updated successfully")
    )
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatar) throw new ApiError(400, "Avatar is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url) throw new ApiError(400, "Failed to upload avatar");

    const user = await User.findByIdAndUpdate(req.user?._id, { avatar: avatar.url }, { new: true }).select("-password ");

    return res.status(200).json(
        new ApiResponse(200, user, "User avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath) throw new ApiError(400, "Cover image is required");

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url) throw new ApiError(400, "Failed to upload cover image");

    const user = await User.findByIdAndUpdate(req.user?._id, { coverImage: coverImage.url }, { new: true }).select("-password ");

    return res.status(200).json(
        new ApiResponse(200, user, "User cover image updated successfully")
    )
})

export  {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentpassword, getCurrentUser, updateAccountDetails,
    updateUserAvatar, updateUserCoverImage
};