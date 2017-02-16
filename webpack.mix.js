const { mix } = require('laravel-mix');

mix.js('resources/assets/js/app.js', 'data/js')
   .sass('resources/assets/sass/app.scss', 'data/css')
   .combine([
        'resources/assets/css/animate.css',
        'resources/assets/css/reset.css',
        'resources/assets/css/bulma.css',
        'resources/assets/css/markdown.css',
        'resources/assets/css/highlight.css'
    ], 'data/css/vendor.css')
   .version();

