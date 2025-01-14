import mongoose from 'mongoose';
import dotenv from 'dotenv'

const connectDB = async () => {
    try {
        const conn = mongoose.connect("mongodb+srv://happybiostockcode07040:UfQm63Vv9O5MVb8q@cluster0.rhutd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        );
        if (conn) {
            console.log(`Successfully connected to MongoDB`);
        }
        else {
            console.log("Cannot connect")
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;