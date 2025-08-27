import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
const userSchema = new mongoose.Schema(
    {
        username:{
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
            index: true
        },
        email:{
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
        },
        fullname:{
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar:{
            type: String,
            required: true,
        },
        coverimage:{
            type: String,
        },
        watchhistory:[
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password:{
            type: String,
            required: [true, "Password is required"],
        },
        refreshToken:{
            type: String,
        },

    },
    {
        timestamps: true,
    }
)

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccesstoken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullname: this.fullname,
            username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
           expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN 
        }
    )
}

userSchema.methods.generateRefreshtoken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
           expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN 
        }
    )
}

export const User = mongoose.model("User", userSchema)