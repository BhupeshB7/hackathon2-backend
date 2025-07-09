// import express from "express";
// import { Octokit } from "@octokit/rest";
// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();

// const router = express.Router();

// const octokit = new Octokit({
//     auth: process.env.GITHUB_TOKEN,
// });

// const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
// const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
// const VERCEL_API_URL = "https://api.vercel.com";

// const waitForMainBranchCommit = async (owner, repo, maxAttempts = 10) => {
//     console.log("⏳ Waiting for 'main' branch to receive first commit...");
//     for (let i = 1; i <= maxAttempts; i++) {
//         try {
//             const { data } = await octokit.rest.repos.getBranch({
//                 owner,
//                 repo,
//                 branch: "master",
//             });

//             if (data?.commit?.sha) {
//                 console.log(`✅ Detected commit on 'master' (attempt ${i})`);
//                 return;
//             }
//         } catch (err) {
//             if (err.status !== 404) throw err;
//         }

//         console.log(`⏱️ Attempt ${i}: No commit yet. Retrying in ${i + 1}s...`);
//         await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
//     }

//     throw new Error("❌ Timed out waiting for commit on 'master'");
// };

// // Function to wait for Vercel deployment to complete
// const waitForDeploymentComplete = async (deploymentId, maxAttempts = 30) => {
//     console.log("⏳ Waiting for Vercel deployment to complete...");
    
//     for (let i = 1; i <= maxAttempts; i++) {
//         try {
//             const { data } = await axios.get(
//                 `${VERCEL_API_URL}/v13/deployments/${deploymentId}`,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${VERCEL_TOKEN}`,
//                     },
//                 }
//             );

//             console.log(`🔄 Deployment status (attempt ${i}): ${data.readyState}`);

//             if (data.readyState === 'READY') {
//                 console.log(`✅ Deployment completed successfully!`);
//                 return {
//                     status: 'success',
//                     url: data.url,
//                     alias: data.alias || []
//                 };
//             } else if (data.readyState === 'ERROR') {
//                 console.log(`❌ Deployment failed with error`);
//                 return {
//                     status: 'error',
//                     error: data.error || 'Unknown deployment error'
//                 };
//             } else if (data.readyState === 'CANCELED') {
//                 console.log(`❌ Deployment was canceled`);
//                 return {
//                     status: 'canceled'
//                 };
//             }

//             // If still building, wait before next check
//             const waitTime = Math.min(5000 + (i * 1000), 15000); // Progressive backoff, max 15s
//             console.log(`⏱️ Still building... waiting ${waitTime/1000}s before next check`);
//             await new Promise((r) => setTimeout(r, waitTime));

//         } catch (error) {
//             console.error(`❌ Error checking deployment status:`, error.response?.data || error.message);
            
//             // If it's a 404, the deployment might not be ready yet
//             if (error.response?.status === 404) {
//                 console.log(`⏱️ Deployment not found yet, waiting...`);
//                 await new Promise((r) => setTimeout(r, 3000));
//                 continue;
//             }
            
//             throw error;
//         }
//     }

//     throw new Error("❌ Timed out waiting for deployment to complete");
// };

// router.post("/deploy-to-vercel", async (req, res) => {
//     try {
//         const { code, templateId, projectName } = req.body;
//         if (!code || !projectName) {
//             return res.status(400).json({ error: "Code and project name are required" });
//         }

//         const sanitizedProjectName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");

//         // Step 1: Create GitHub repo
//         const repoResponse = await octokit.rest.repos.createForAuthenticatedUser({
//             name: sanitizedProjectName,
//             description: `React app generated from template: ${templateId}`,
//             private: false,
//             auto_init: true,
//         });

//         const repoUrl = repoResponse.data.html_url;
//         console.log("✅ GitHub repo created:", repoUrl);

//         // Step 2: Define files
//         const files = {
//             "package.json": JSON.stringify({
//                 name: sanitizedProjectName,
//                 version: "0.1.0",
//                 private: true,
//                 dependencies: {
//                     react: "^18.2.0",
//                     "react-dom": "^18.2.0",
//                     "react-scripts": "5.0.1",
//                     "lucide-react": "^0.325.0",
//                 },
//                 scripts: {
//                     start: "react-scripts start",
//                     build: "react-scripts build",
//                     test: "react-scripts test",
//                     eject: "react-scripts eject",
//                 },
//             }, null, 2),

//             "public/index.html": `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#000000"/><title>${sanitizedProjectName}</title><script src="https://cdn.tailwindcss.com"></script></head><body><div id="root"></div></body></html>`,

//             "src/index.js": `import React from 'react';import ReactDOM from 'react-dom/client';import './index.css';import App from './App';const root = ReactDOM.createRoot(document.getElementById('root'));root.render(<React.StrictMode><App /></React.StrictMode>);`,

//             "src/App.js": code,

//             "src/index.css": `@tailwind base;@tailwind components;@tailwind utilities;body { margin: 0; font-family: sans-serif; }`,

//             "README.md": `# ${sanitizedProjectName}\nReact app generated with custom deployment.`,
//         };

//         // Step 3: Upload files to GitHub
//         console.log("📤 Uploading files to GitHub...");
//         for (const [filePath, content] of Object.entries(files)) {
//             let sha;
//             try {
//                 const { data } = await octokit.rest.repos.getContent({
//                     owner: GITHUB_USERNAME,
//                     repo: sanitizedProjectName,
//                     path: filePath,
//                 });
//                 sha = data.sha;
//             } catch (err) {
//                 if (err.status !== 404) throw err;
//             }

//             await octokit.rest.repos.createOrUpdateFileContents({
//                 owner: GITHUB_USERNAME,
//                 repo: sanitizedProjectName,
//                 path: filePath,
//                 message: `Add ${filePath}`,
//                 content: Buffer.from(content).toString("base64"),
//                 ...(sha && { sha }),
//             });
//             console.log(`✅ Uploaded: ${filePath}`);
//         }

//         // Step 4: Confirm commit exists
//         await waitForMainBranchCommit(GITHUB_USERNAME, sanitizedProjectName);
        
//         // Step 5: Create Vercel project and deployment
//         console.log("🚀 Creating Vercel project and deployment...");

//         // First, create/import the project
//         const projectResponse = await axios.post(
//             `${VERCEL_API_URL}/v9/projects`,
//             {
//                 name: sanitizedProjectName,
//                 gitRepository: {
//                     type: "github",
//                     repo: `${GITHUB_USERNAME}/${sanitizedProjectName}`,
//                     branch: "master",
//                 },
//                 buildCommand: "npm run build",
//                 outputDirectory: "build",
//                 installCommand: "npm install",
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${VERCEL_TOKEN}`,
//                     "Content-Type": "application/json",
//                 },
//             }
//         );

//         console.log("✅ Vercel project created:", projectResponse.data.name);
//         console.log("✅ Vercel project linkedGitRepository:", projectResponse.data.link);

//         // Then trigger deployment
//         const deploymentResponse = await axios.post(
//             `${VERCEL_API_URL}/v13/deployments`,
//             {
//                 name: sanitizedProjectName,
//                 gitSource: {
//                     type: "github",
//                     repoId: projectResponse.data.link.repoId, 
//                     ref: "master",
//                     gitCredentialId: projectResponse.data.link.gitCredentialId,
//                 },
//                 projectSettings: {
//                     buildCommand: "npm run build",
//                     outputDirectory: "build",
//                     installCommand: "npm install",
//                 },
//                 target: "production",
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${VERCEL_TOKEN}`,
//                     "Content-Type": "application/json",
//                 },
//             }
//         );

//         const deploymentId = deploymentResponse.data.id;
//         console.log("🚀 Deployment started with ID:", deploymentId);

//         // Step 6: Wait for deployment to complete
//         const deploymentResult = await waitForDeploymentComplete(deploymentId);

//         if (deploymentResult.status === 'success') {
//             // Get the final deployment URL
//             const finalUrl = deploymentResult.url.startsWith('https://') 
//                 ? deploymentResult.url 
//                 : `https://${deploymentResult.url}`;

//             res.json({
//                 success: true,
//                 githubUrl: repoUrl,
//                 deploymentUrl: finalUrl,
//                 vercelProject: projectResponse.data.name,
//                 message: "✅ App deployed successfully to Vercel!",
//                 deploymentId: deploymentId,
//             });
//         } else {
//             throw new Error(`Deployment failed: ${deploymentResult.error || deploymentResult.status}`);
//         }

//     } catch (error) {
//         console.error("🚨 Deployment Error:", error.response?.data || error.message);
//         res.status(500).json({
//             error: "Deployment failed",
//             details: error.response?.data || error.message,
//         });
//     }
// });

// export default router;































import express from "express";
import { Octokit } from "@octokit/rest";
import axios from "axios";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const router = express.Router();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_API_URL = "https://api.vercel.com";

// Store deployment progress and status
const deploymentStore = new Map();

// Update progress function
function updateProgress(deploymentId, progress, message, type = 'progress') {
    const deployment = deploymentStore.get(deploymentId);
    if (deployment) {
        deployment.progress = progress;
        deployment.logs.push({
            message,
            type,
            level: type === 'progress' ? 'info' : type,
            timestamp: new Date().toISOString()
        });
    }
}

// Helper to clean up deployments
const cleanUpDeployment = (deploymentId) => {
    setTimeout(() => {
        deploymentStore.delete(deploymentId);
        console.log(`Cleaned up deployment ${deploymentId}`);
    }, 300000); // 5 minutes
};

const waitForMainBranchCommit = async (owner, repo, deploymentId, maxAttempts = 10) => {
    updateProgress(deploymentId, 45, "⏳ Waiting for GitHub repository to initialize...");

    for (let i = 1; i <= maxAttempts; i++) {
        try {
            const { data } = await octokit.rest.repos.getBranch({
                owner,
                repo,
                branch: "master",
            });

            if (data?.commit?.sha) {
                updateProgress(deploymentId, 45, `✅ Repository initialized successfully (attempt ${i})`);
                return;
            }
        } catch (err) {
            if (err.status !== 404) throw err;
        }

        updateProgress(deploymentId, 45, `⏱️ Attempt ${i}: Waiting for repository... (${i + 1}s)`);
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }

    throw new Error("❌ Timed out waiting for commit on 'master'");
};

const waitForDeploymentComplete = async (deploymentId, vercelDeploymentId, maxAttempts = 40) => {
    updateProgress(deploymentId, 60, "⏳ Starting Vercel deployment...");

    for (let i = 1; i <= maxAttempts; i++) {
        try {
            const { data } = await axios.get(
                `${VERCEL_API_URL}/v13/deployments/${vercelDeploymentId}`,
                {
                    headers: {
                        Authorization: `Bearer ${VERCEL_TOKEN}`,
                    },
                }
            );

            const progressPercentage = Math.min(60 + (i * 2), 95);

            if (data.readyState === 'READY') {
                updateProgress(deploymentId, 100, "✅ Deployment completed successfully!");
                return {
                    status: 'success',
                    url: data.url,
                    alias: data.alias || []
                };
            } else if (data.readyState === 'ERROR') {
                updateProgress(deploymentId, 0, `❌ Deployment failed: ${data.error?.message || 'Unknown error'}`, 'error');
                return {
                    status: 'error',
                    error: data.error?.message || 'Unknown deployment error'
                };
            } else if (data.readyState === 'CANCELED') {
                updateProgress(deploymentId, 0, `❌ Deployment was canceled`, 'error');
                return {
                    status: 'canceled'
                };
            } else {
                let statusMessage = "Building...";
                if (data.readyState === 'BUILDING') {
                    statusMessage = "🔨 Building your application...";
                } else if (data.readyState === 'DEPLOYING') {
                    statusMessage = "🚀 Deploying to production...";
                }

                updateProgress(deploymentId, progressPercentage, statusMessage);
            }

            const waitTime = Math.min(3000 + (i * 500), 10000);
            await new Promise((r) => setTimeout(r, waitTime));

        } catch (error) {
            updateProgress(deploymentId, 0, `❌ Error checking deployment: ${error.message}`, 'error');

            if (error.response?.status === 404) {
                updateProgress(deploymentId, 60, `⏱️ Deployment not ready yet, retrying...`);
                await new Promise((r) => setTimeout(r, 3000));
                continue;
            }

            throw error;
        }
    }

    throw new Error("❌ Timed out waiting for deployment to complete");
};

// Deployment endpoint
router.post("/deploy-to-vercel", async (req, res) => {
    const deploymentId = uuidv4();

    // Initialize deployment tracking
    deploymentStore.set(deploymentId, {
        id: deploymentId,
        progress: 0,
        logs: [{
            message: "🚀 Starting deployment process...",
            level: 'info',
            timestamp: new Date().toISOString()
        }],
        startTime: new Date().toISOString(),
        result: null,
        error: null
    });

    // Return deployment ID immediately
    res.json({
        success: true,
        deploymentId,
        message: "Deployment started"
    });

    try {
        const { code, templateId, projectName } = req.body;

        if (!code || !projectName) {
            throw new Error("Code and project name are required");
        }

        const sanitizedProjectName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");

        // Step 1: Create GitHub repo
        updateProgress(deploymentId, 10, "🔨 Creating GitHub repository...");

        const repoResponse = await octokit.rest.repos.createForAuthenticatedUser({
            name: sanitizedProjectName,
            description: `React app generated from template: ${templateId}`,
            private: false,
            auto_init: true,
        });

        const repoUrl = repoResponse.data.html_url;
        updateProgress(deploymentId, 15, `✅ Repository created: ${repoUrl}`);

        // Step 2: Define files
        updateProgress(deploymentId, 20, "📝 Preparing project files...");

        const files = {
            "package.json": JSON.stringify({
                name: sanitizedProjectName,
                version: "0.1.0",
                private: true,
                dependencies: {
                    react: "^18.2.0",
                    "react-dom": "^18.2.0",
                    "react-scripts": "5.0.1",
                    "lucide-react": "^0.325.0",
                },
                scripts: {
                    start: "react-scripts start",
                    build: "react-scripts build",
                    test: "react-scripts test",
                    eject: "react-scripts eject",
                },
            }, null, 2),
            "public/index.html": `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#000000"/><title>${sanitizedProjectName}</title><script src="https://cdn.tailwindcss.com"></script></head><body><div id="root"></div></body></html>`,
            "src/index.js": `import React from 'react';import ReactDOM from 'react-dom/client';import './index.css';import App from './App';const root = ReactDOM.createRoot(document.getElementById('root'));root.render(<React.StrictMode><App /></React.StrictMode>);`,
            "src/App.js": code,
            "src/index.css": `@tailwind base;@tailwind components;@tailwind utilities;body { margin: 0; font-family: sans-serif; }`,
            "README.md": `# ${sanitizedProjectName}\nReact app generated with custom deployment.`,
        };

        // Step 3: Upload files to GitHub
        updateProgress(deploymentId, 30, "📤 Uploading files to GitHub...");

        const totalFiles = Object.keys(files).length;
        let uploadedFiles = 0;

        for (const [filePath, content] of Object.entries(files)) {
            let sha;
            try {
                const { data } = await octokit.rest.repos.getContent({
                    owner: GITHUB_USERNAME,
                    repo: sanitizedProjectName,
                    path: filePath,
                });
                sha = data.sha;
            } catch (err) {
                if (err.status !== 404) throw err;
            }

            await octokit.rest.repos.createOrUpdateFileContents({
                owner: GITHUB_USERNAME,
                repo: sanitizedProjectName,
                path: filePath,
                message: `Add ${filePath}`,
                content: Buffer.from(content).toString("base64"),
                ...(sha && { sha }),
            });

            uploadedFiles++;
            const uploadProgress = 30 + (uploadedFiles / totalFiles) * 10;
            updateProgress(deploymentId, uploadProgress, `📤 Uploaded ${filePath}`);
        }

        // Step 4: Confirm commit exists
        updateProgress(deploymentId, 45, "🔄 Verifying repository...");
        await waitForMainBranchCommit(GITHUB_USERNAME, sanitizedProjectName, deploymentId);

        // Step 5: Create Vercel project
        updateProgress(deploymentId, 50, "🚀 Setting up Vercel project...");

        const projectResponse = await axios.post(
            `${VERCEL_API_URL}/v9/projects`,
            {
                name: sanitizedProjectName,
                gitRepository: {
                    type: "github",
                    repo: `${GITHUB_USERNAME}/${sanitizedProjectName}`,
                    branch: "master",
                },
                buildCommand: "npm run build",
                outputDirectory: "build",
                installCommand: "npm install",
            },
            {
                headers: {
                    Authorization: `Bearer ${VERCEL_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        updateProgress(deploymentId, 55, `✅ Vercel project created: ${projectResponse.data.name}`);

        // Step 6: Trigger deployment
        updateProgress(deploymentId, 55, "🚀 Triggering deployment...");

        const deploymentResponse = await axios.post(
            `${VERCEL_API_URL}/v13/deployments`,
            {
                name: sanitizedProjectName,
                gitSource: {
                    type: "github",
                    repoId: projectResponse.data.link.repoId,
                    ref: "master",
                    gitCredentialId: projectResponse.data.link.gitCredentialId,
                },
                projectSettings: {
                    buildCommand: "npm run build",
                    outputDirectory: "build",
                    installCommand: "npm install",
                },
                target: "production",
            },
            {
                headers: {
                    Authorization: `Bearer ${VERCEL_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const vercelDeploymentId = deploymentResponse.data.id;
        updateProgress(deploymentId, 60, `🚀 Deployment started with ID: ${vercelDeploymentId}`);

        // Step 7: Wait for deployment to complete
        const deploymentResult = await waitForDeploymentComplete(deploymentId, vercelDeploymentId);

        if (deploymentResult.status === 'success') {
            const finalUrl = `https://${sanitizedProjectName}.vercel.app`;

            // Store result
            const deployment = deploymentStore.get(deploymentId);
            if (deployment) {
                deployment.result = {
                    githubUrl: repoUrl,
                    deploymentUrl: finalUrl,
                    vercelProject: projectResponse.data.name,
                    vercelDeploymentId,
                };
                deployment.progress = 100;
            }
        } else {
            // Store error
            const deployment = deploymentStore.get(deploymentId);
            if (deployment) {
                deployment.error = `Deployment failed: ${deploymentResult.error || deploymentResult.status}`;
            }
        }

    } catch (error) {
        console.error("🚨 Deployment Error:", error.response?.data || error.message);
        const deployment = deploymentStore.get(deploymentId);
        if (deployment) {
            deployment.error = {
                message: error.message,
                details: error.response?.data || 'No additional details'
            };
            deployment.logs.push({
                message: `🚨 Deployment failed: ${error.message}`,
                level: 'error',
                timestamp: new Date().toISOString()
            });
        }
    } finally {
        // Schedule cleanup
        cleanUpDeployment(deploymentId);
    }
});

// Status endpoint for polling
router.get('/vercel/status/:deploymentId', async (req, res) => {
    const { deploymentId } = req.params;
    const deployment = deploymentStore.get(deploymentId);

    if (!deployment) {
        return res.status(404).json({
            error: 'Deployment not found or expired'
        });
    }

    // Get the last message for current status
    const lastLog = deployment.logs.length > 0
        ? deployment.logs[deployment.logs.length - 1]
        : null;

    const currentMessage = lastLog ? lastLog.message : '';

    res.json({
        progress: deployment.progress,
        logs: deployment.logs,
        currentMessage,
        status: deployment.result
            ? 'completed'
            : deployment.error
                ? 'error'
                : 'in_progress',
        result: deployment.result,
        error: deployment.error
    });
});

export default router;