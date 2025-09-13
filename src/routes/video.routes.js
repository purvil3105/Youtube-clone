import { Router } from 'express';
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js"
import {
    getVideoComments,
    addComment
} from "../controllers/comment.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router();
router.route("/").get(getAllVideos);  //
router.route("/:videoId").get(getVideoById); 

// Protected routes (authentication required)
router.use(verifyJWT); // Apply verifyJWT middleware to all routes below this line

router
    .route("/")
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

// Comment routes for videos
router.route("/:videoId/comments")
    .get(getVideoComments)  // Get all comments for a video
    .post(addComment);      // Add a comment to a video

export default router