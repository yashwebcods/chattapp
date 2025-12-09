import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    companyName:{
        type:String,
        required:true    
    },
    addresh: {
        type: String,
        required: true
    },
    mobileNo:{
        type:String,
        minlength:10,
        maxlength:10,
        required:true
    },
    email: {
    type: String,
    required: true
},
    password: {
    type: String,
    required: true
},
    createdBy: {
    type: String,
    require: true
},
    subscription: {
    type: Boolean,
    default: false
}
}, { timestamps: true })

const Seller = mongoose.model("Seller", sellerSchema);
export default Seller