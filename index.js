import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises"
import { fileURLToPath } from "url";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import dotenv from "dotenv";
import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import JSZip from 'jszip'; 
import deployRouter from "./routes.js";
dotenv.config();
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { Prompt } from "./models/codeGenChat.js";
import Publish from "./models/publish.js";  
import connectDB from "./config/db.js";
const app = express();
const port = process.env.PORT || 3000;

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors({
    origin: ['https://coderarmy-ai.netlify.app','https://coder-army-ai.netlify.app', 'http://localhost:5173'],
    credentials: true  
}));app.use(express.json());
 
// MongoDB Connection
await connectDB();
 
// ImageKit Configuration
const imagekit = new ImageKit({
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

// ====================== ROUTES ====================== //
app.get("/",(req,res)=>{
    res.send("Hello world!")
})
// Get ImageKit auth parameters
app.get("/api/upload", (req, res) => {
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
});

// Create new chat
app.post("/api/chats", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;
    const { text } = req.body;

    try {
        const newChat = new Chat({
            userId: userId,
            history: [{ role: "user", parts: [{ text }] }],
        });

        const savedChat = await newChat.save();

        const userChats = await UserChats.findOne({ userId });

        if (!userChats) {
            const newUserChats = new UserChats({
                userId: userId,
                chats: [{ _id: savedChat._id, title: text.substring(0, 40) }],
            });

            await newUserChats.save();
        } else {
            await UserChats.updateOne(
                { userId: userId },
                {
                    $push: {
                        chats: {
                            _id: savedChat._id,
                            title: text.substring(0, 40),
                        },
                    },
                }
            );
        }

        res.status(201).send(savedChat._id);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating chat!");
    }
});

// Get all user chats
app.get("/api/userchats", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;

    try {
        const userChats = await UserChats.findOne({ userId });

        if (!userChats || !userChats.chats) {
            return res.status(200).send([]);
        }

        // Sort chats by createdAt descending (latest first)
        const sortedChats = userChats.chats.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.status(200).send(sortedChats);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching user chats!");
    }
});

// Get single chat by ID
app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;

    try {
        const chat = await Chat.findOne({ _id: req.params.id, userId });
        res.status(200).send(chat);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching chat!");
    }
});

// Update chat with new messages
app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;
    const { question, answer, img } = req.body;

    const newItems = [
        ...(question
            ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
            : []),
        { role: "model", parts: [{ text: answer }] },
    ];

    try {
        const updatedChat = await Chat.updateOne(
            { _id: req.params.id, userId },
            {
                $push: {
                    history: { $each: newItems },
                },
            }
        );

        res.status(200).send(updatedChat);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating chat!");
    }
});

//create a new prompt for the code generation
app.post("/api/codeGenPrompts", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;
    const { prompt } = req.body;
    console.log(prompt);
    try {
        const newPrompt = new Prompt({
            userId: userId,
            prompt: prompt,
        });

        const savedPrompt = await newPrompt.save();

        res.status(201).send(savedPrompt._id);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating prompt!");
    }
});

app.get("/api/codeGenPrompts/:id", async (req, res) => {
    try {
        const prompt = await Prompt.findById(req.params.id);
        res.status(200).send(prompt);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching templates!");
    }
});

// insert a new publish
app.post("/api/publish", async (req, res) => {
    const { templateId, code } = req.body;

    if (!templateId || !code) {
        return res.status(400).json({
            error: "Missing required fields",
            details: "Both templateId and code are required"
        });
    }

    const session = await mongoose.startSession();

    try {
        const result = await session.withTransaction(async () => {
            // Check if document exists within transaction
            const existing = await Publish.findOne({ templateId,code }).session(session);

            if (existing) {
                return { url: existing.url, isNew: false };
            }

            // Generate unique URL
            const randomStr = uuidv4().replace(/-/g, "") + crypto.randomBytes(8).toString("hex");
            const url = randomStr.slice(0, 30);

            // Create new document within transaction
            const newPublish = new Publish({
                templateId,
                code,
                url,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const saved = await newPublish.save({ session });
            return { url: saved.url, isNew: true };
        });

        res.status(result.isNew ? 201 : 200).json({
            url: result.url,
            message: result.isNew ? "Component published successfully" : "Component already published",
            isNew: result.isNew
        });

    } catch (err) {
        console.error("Transaction error:", err);
        res.status(500).json({
            error: "Internal server error",
            message: "Failed to publish component. Please try again later."
        });
    } finally {
        await session.endSession();
    }
});
app.get("/api/preview/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const preview = await Publish.findOne({ url: id });

        if (!preview) {
            return res.status(404).json({ error: "Preview not found" });
        }

        const code = preview.code;

        res.status(200).json({ code });
    } catch (err) {
        console.error("Error fetching preview:", err);
        res.status(500).send("Error fetching preview!");
    }
});

// Static files content
const STATIC_FILES = {
    'package.json': `{
      "name": "react-project",
      "version": "1.0.0",
      "private": true,
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1",
        "lucide-react": "^0.325.0",
        "tailwindcss": "^2.2.19"
      },
      "scripts": {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject"
      },
      "eslintConfig": {
        "extends": ["react-app", "react-app/jest"]
      },
      "browserslist": {
        "production": [">0.2%", "not dead", "not op_mini all"],
        "development": [
          "last 1 chrome version",
          "last 1 firefox version",
          "last 1 safari version"
        ]
      }
    }`,

    'src/index.js': `import React from 'react';
  import ReactDOM from 'react-dom/client';
  import './index.css';
  import App from './App';
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );`,

    'src/index.css': `@tailwind base;
  @tailwind components;
  @tailwind utilities;`,

    'public/index.html': `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#000000" />
      <meta
        name="description"
        content="Web application created using React"
      />
      <title>React App</title>
    </head>
    <body>
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <div id="root"></div>
    </body>
  </html>`,

    '.gitignore': `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.
  
  # dependencies
  /node_modules
  /.pnp
  .pnp.js
  
  # testing
  /coverage
  
  # production
  /build
  
  # misc
  .DS_Store
  .env.local
  .env.development.local
  .env.test.local
  .env.production.local
  
  npm-debug.log*
  yarn-debug.log*
  yarn-error.log*`
};

app.post('/api/download-project', async (req, res) => {
    try {
        const { code, templateId } = req.body;
        const zip = new JSZip();

        // Create folder structure
        const srcFolder = zip.folder('src');
        const publicFolder = zip.folder('public');

        // Add user's code to src folder
        srcFolder.file('App.js', code);

        // Add static files to their proper locations
        Object.entries(STATIC_FILES).forEach(([path, content]) => {
            if (path.startsWith('src/')) {
                srcFolder.file(path.replace('src/', ''), content);
            } else if (path.startsWith('public/')) {
                publicFolder.file(path.replace('public/', ''), content);
            } else {
                zip.file(path, content);
            }
        });

        // Add Tailwind config
        zip.file('tailwind.config.js', `module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }`);

        // Generate ZIP
        const zipData = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });

        // Set response headers
        const fileName = `react-project-${templateId || 'new'}.zip`;
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(zipData);

    } catch (error) {
        console.error('Error generating project ZIP:', error);
        res.status(500).json({
            error: 'Failed to generate project',
            details: error.message
        });
    }
});
app.use("/api", deployRouter);
// Start server
app.listen(port, async() => { 
    console.log(`  Server running on http://localhost:${port}`);
});
