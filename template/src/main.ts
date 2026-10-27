import { greeting } from '@/example';

import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (app)
  app.textContent = greeting('world');
