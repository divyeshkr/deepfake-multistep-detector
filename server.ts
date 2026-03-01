import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function installPythonDependencies() {
  console.log('Installing Python dependencies...');
  return new Promise<void>((resolve, reject) => {
    const pipProcess = spawn('pip3', ['install', '-r', 'requirements.txt']);

    pipProcess.stdout.on('data', (data) => {
      console.log(`pip: ${data}`);
    });

    pipProcess.stderr.on('data', (data) => {
      console.error(`pip error: ${data}`);
    });

    pipProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Python dependencies installed successfully.');
        resolve();
      } else {
        console.error(`pip exited with code ${code}`);
        // We resolve anyway to try running the server, maybe packages are already there or partial install worked
        resolve(); 
      }
    });
  });
}

async function startServer() {
  await installPythonDependencies();

  const app = express();
  const upload = multer({ dest: 'uploads/' });

  app.use(express.json());

  // Helper to run python script
  const runPythonScript = (args: string[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['detect.py', ...args]);
      
      let dataString = '';
      let errorString = '';

      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorString);
          // Try to parse error from stdout if it's JSON
          try {
             const lines = dataString.trim().split('\n');
             const lastLine = lines[lines.length - 1];
             const result = JSON.parse(lastLine);
             if (result.error) {
               reject(new Error(result.error));
               return;
             }
          } catch(e) {}
          
          reject(new Error(`Python script exited with code ${code}: ${errorString}`));
        } else {
          try {
            // Find the last JSON object in the output
            const lines = dataString.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const result = JSON.parse(lastLine);
            resolve(result);
          } catch (e) {
            console.error('Failed to parse Python output:', dataString);
            reject(new Error('Failed to parse Python output'));
          }
        }
      });
    });
  };

  app.post('/api/detect-deepfake', upload.single('audio'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
      const result = await runPythonScript(['stage1', req.file.path]);
      // Cleanup uploaded file
      fs.unlink(req.file.path, (err) => { if (err) console.error(err); });
      
      if (result.status === 'error') {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/verify-speaker', upload.fields([{ name: 'audio1' }, { name: 'audio2' }]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files['audio1']?.[0] || !files['audio2']?.[0]) {
      return res.status(400).json({ error: 'Both audio files are required' });
    }

    try {
      const result = await runPythonScript(['stage2', files['audio1'][0].path, files['audio2'][0].path]);
      
      // Cleanup
      fs.unlink(files['audio1'][0].path, (err) => { if (err) console.error(err); });
      fs.unlink(files['audio2'][0].path, (err) => { if (err) console.error(err); });
      
      if (result.status === 'error') {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
