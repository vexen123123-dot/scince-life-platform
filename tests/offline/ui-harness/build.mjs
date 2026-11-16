import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
await build({ entryPoints: ['entry.tsx'], bundle: true, outfile: 'out.js', jsx: 'automatic', format: 'iife', define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '{}' },
  nodePaths: ['/opt/npm-tools/node_modules'], alias: { 'react-router-dom': './stub-router.tsx', 'lucide-react': './stub-icons.tsx' }, logLevel: 'error' });
console.log('built');
