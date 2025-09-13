import { Router } from 'express';
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

// All comment routes require authentication
router.use(verifyJWT);

// Comment CRUD operations
router.route("/:commentId")
    .patch(updateComment)    // Update a specific comment
    .delete(deleteComment);  // Delete a specific comment

export default router;
