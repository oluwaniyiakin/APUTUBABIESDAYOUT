/* ============================================================
   APUTU: Baby's Day Out — src/main.ts
   Application entry point. Vite bundles this as a module script
   referenced from index.html. Importing the stylesheets here
   (rather than via <link> tags) lets Vite process, hash and
   optimise the CSS as part of the build.
   ============================================================ */

import './styles/style.css';
import './styles/screens.css';
import './styles/polish.css';
import { UI } from './ui/ui';

const boot = () => UI.init();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
