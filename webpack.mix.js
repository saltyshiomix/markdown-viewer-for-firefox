const { mix } = require('laravel-mix');

mix
  // App
  .js('resources/assets/js/app.js', 'data/js')
  .sass('resources/assets/sass/app.scss', 'data/css')
  .combine([
    'resources/assets/css/animate.css',
    'resources/assets/css/reset.css',
    'resources/assets/css/bulma.css',
    'resources/assets/css/markdown.css',
    'resources/assets/css/highlight.css'
  ], 'data/css/app.vendor.css')

  // Panel
  .js('resources/assets/js/panel.js', 'data/js')
  .sass('resources/assets/sass/panel.scss', 'data/css')
  .combine([
    'resources/assets/css/font-awesome.css',
    'resources/assets/css/lib/bulma.css'
  ], 'data/css/panel.vendor.css')

  // Versioning
  .version();

