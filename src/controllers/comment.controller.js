import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
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
            $sort: {
                createdAt: -1
            }
        }
    ])

    const options = {
        page: pageNumber,
        limit: limitNumber
    }

    const comments = await Comment.aggregatePaginate(commentsAggregate, options)

    return res.status(200).json(
        new ApiResponse(200, comments, "Comments retrieved successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    const {content} = req.body
    const {videoId} = req.params
    
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required")
    }
    
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    const createdComment = await Comment.findById(comment._id).populate("owner", "username fullname avatar")

    if (!createdComment) {
        throw new ApiError(500, "Failed to create comment")
    }

    return res.status(201).json(
        new ApiResponse(201, createdComment, "Comment added successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if (!content?.trim()) {
        throw new ApiError(400, "Content is required")
    }

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId)
    
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // Check if user owns the comment
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own comments")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            content: content.trim()
        },
        { new: true }
    ).populate("owner", "username fullname avatar")

    return res.status(200).json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId)
    
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    // Check if user owns the comment
    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own comments")
    }

    await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }