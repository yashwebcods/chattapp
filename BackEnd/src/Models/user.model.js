import mongoose from 'mongoose'

const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["manager", "marketing", "seller", "owner", "user"],
        default: "user"
    },
    fcmTokens: {
        type: [String],
        default: []
    }
}, { timestamps: true })

const User = mongoose.model('User', userSchema)

export default User