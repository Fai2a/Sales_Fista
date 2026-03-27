import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function compile() {
    try {
        console.log("Cleaning old dist...");
        if (fs.existsSync('dist')) {
            fs.rmSync('dist', { recursive: true, force: true });
        }
        fs.mkdirSync('dist');

        console.log("Bundling scripts...");
        await esbuild.build({
            entryPoints: [
                'src/background.ts',
                'src/content.ts',
                'src/popup.ts'
            ],
            bundle: true,
            outdir: 'dist',
            format: 'iife', // Use IIFE for non-module service worker compatibility
            target: 'es2020'
        });

        console.log("Copying assets...");
        fs.copyFileSync('src/popup.html', 'dist/popup.html');
        fs.copyFileSync('public/manifest.json', 'dist/manifest.json');
        
        // Copy other assets if needed
        if (fs.existsSync('public/favicon.svg')) fs.copyFileSync('public/favicon.svg', 'dist/favicon.svg');
        if (fs.existsSync('public/icons.svg')) fs.copyFileSync('public/icons.svg', 'dist/icons.svg');

        console.log("Built successfully! Load the 'dist' folder in Chrome.");
    } catch (e) {
        console.error("ESBuild Error:", e);
        process.exit(1);
    }
}

compile();
