import mongoose from "mongoose";

const publishSchema = new mongoose.Schema(
    {
        templateId: {
            type: String,
            required: true, 
        },
        code: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
            unique: true,
        },
    },
    { timestamps: true }
);

const Publish = mongoose.model("Publish", publishSchema);
export default Publish;
