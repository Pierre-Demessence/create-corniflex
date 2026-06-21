import { greeting } from '@/example';

const app = document.querySelector<HTMLDivElement>('#app');

if (app)
  app.textContent = greeting('world');
