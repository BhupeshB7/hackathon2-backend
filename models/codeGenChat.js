import mongoose from "mongoose";
import { Schema } from "mongoose";

const codeGenChatSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  prompt: {
    type: String,
    required: true,
  },
});

export const Prompt = mongoose.model("Prompt", codeGenChatSchema);
