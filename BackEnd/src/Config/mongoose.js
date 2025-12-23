import mongoose from 'mongoose'

 const isDev = process.env.NODE_ENV !== 'production';
 const debug = (...args) => {
     if (isDev) console.log(...args);
 };

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        debug(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB; 
