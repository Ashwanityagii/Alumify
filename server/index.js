require('./env');
const { createApp } = require('./app');
const { create } = require('./store');
const store = create();
const port = process.env.PORT || 3001;
createApp(store).listen(port, () => {
  console.log(`Alumify API listening on http://localhost:${port}  [data: ${store.mode}]`);
  if (store.mode === 'memory') {
    console.log('Demo mode (no Supabase keys): admin@alumify.dev / Admin@12345 | aryan@alumify.dev / Student@123 | vikram@alumify.dev / Alumni@123 | sandeep@alumify.dev / Faculty@123');
  }
});
