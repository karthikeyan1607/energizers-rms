import { createApp } from './app.js';
import { seed } from './db/seed.js';

const port = Number(process.env.PORT || 4000);

seed();

createApp().listen(port, () => {
  console.log(`RMS API listening on http://localhost:${port}/api`);
});
