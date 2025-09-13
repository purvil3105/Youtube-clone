import mongoose, {schema} from 'mongoose'

const likeSchema  = new Schema({
    comment:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },
    video:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    },
    likedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
    
}, {
    timestamps: true
}
)

export const Like = mongoose.model('Like', likeSchema);