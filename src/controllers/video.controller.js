import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    // Build match conditions
    const matchConditions = {
        isPublished: true // Only show published videos
    }

    // Add search query condition
    if (query) {
        matchConditions.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    // Add user filter condition
    if (userId && isValidObjectId(userId)) {
        matchConditions.owner = new mongoose.Types.ObjectId(userId)
    }

    // Build sort conditions
    let sortConditions = {}
    if (sortBy && sortType) {
        sortConditions[sortBy] = sortType === "desc" ? -1 : 1
    } else {
        sortConditions = { createdAt: -1 } // Default: newest first
    }

    // Convert page and limit to numbers
    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)
    const skip = (pageNumber - 1) * limitNumber

    // Aggregation pipeline
    const videos = await Video.aggregate([
        {
            $match: matchConditions
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $sort: sortConditions
        },
        {
            $skip: skip
        },
        {
            $limit: limitNumber
        }
    ])

    // Get total count for pagination info
    const totalVideos = await Video.countDocuments(matchConditions)
    const totalPages = Math.ceil(totalVideos / limitNumber)

    return res.status(200).json(
        new ApiResponse(200, {
            videos,
            pagination: {
                currentPage: pageNumber,
                totalPages,
                totalVideos,
                hasNextPage: pageNumber < totalPages,
                hasPrevPage: pageNumber > 1
            }
        }, "Videos retrieved successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
        
    // Validate required fields
    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }

    // Get video and thumbnail file paths from multer
    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required")
    }

    // Upload video to cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile) {
        throw new ApiError(400, "Failed to upload video file")
    }

    if (!thumbnail) {
        throw new ApiError(400, "Failed to upload thumbnail")
    }

    // Create video document
    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration || 0,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
        isPublished: true
    })

    const createdVideo = await Video.findById(video._id).populate("owner", "username fullname avatar")

    if (!createdVideo) {
        throw new ApiError(500, "Something went wrong while creating video")
    }

    return res.status(201).json(
        new ApiResponse(201, createdVideo, "Video published successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video = await Video.findById(videoId).populate("owner", "username fullname avatar")
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    return res.status(200).json(
        new ApiResponse(200, video, "Video retrieved successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    // Check if video exists and user owns it
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Check ownership
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own videos")
    }

    // Prepare update data
    const updateData = {}
    
    if (title) updateData.title = title
    if (description) updateData.description = description

    // Handle thumbnail update if provided
    if (req.file) {
        const thumbnailLocalPath = req.file.path
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        
        if (!thumbnail) {
            throw new ApiError(400, "Failed to upload thumbnail")
        }
        
        updateData.thumbnail = thumbnail.url
    }

    // Update video with new data
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId, 
        updateData, 
        { new: true }
    ).populate("owner", "username fullname avatar")
    
    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    // Check if video exists and user owns it
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Check ownership
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own videos")
    }

    // Delete the video
    await Video.findByIdAndDelete(videoId)
    
    return res.status(200).json(
        new ApiResponse(200, {}, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Check ownership
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update publish status of your own videos")
    }

    video.isPublished = !video.isPublished
    await video.save()

    return res.status(200).json(
        new ApiResponse(200, video, "Video publish status updated successfully")
    )
})


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}