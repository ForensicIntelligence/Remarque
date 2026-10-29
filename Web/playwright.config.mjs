import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./integration',workers:1,timeout:30000,reporter:'list',use:{headless:true,launchOptions:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'},viewport:{width:1100,height:900}},outputDir:'/tmp/remarque-build/browser-results'});
