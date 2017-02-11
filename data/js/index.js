var headFragments = [];
var bodyFragments = [];
var markdownExtension = /\.m(arkdown|kdn?|d(o?wn)?)(\?.*)?(#.*)?$/i;
var url = decodeURIComponent(window.location.href);
var isMarkdownFile = markdownExtension.test(url);
var isDirectory = $('.file, .dir').length;
var content = $('body pre').text();
var beforeContent = content;

function convertFileUrlToPath(fileUrl) {
    if (navigator.platform.indexOf('Win') === -1) {
        return fileUrl.replace('file://', '');
    } else {
        return fileUrl.replace('file:///', '').replace(/\//g, '\\');
    }
}

if (isMarkdownFile) {
    $('head, body').empty();

    headFragments.push('<meta charset="utf-8">');
    headFragments.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
    headFragments.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
    headFragments.push('<title>Markdown Viewer</title>');
    headFragments.push('<link rel="stylesheet" href="resource://markdown-viewer/data/css/lib/animate.css">');
    headFragments.push('<link rel="stylesheet" href="resource://markdown-viewer/data/css/app.css">');
    $('head').append(headFragments.join(''));

    var md = new MarkdownConverter(marked, hljs, emojione);
    var isFirstView = true;
    var scrolled = false;
    var clickMenuAnimating = false;
    var activeClass = 'is-active animated fadeIn';

    function attachEventsToToc() {
        $('.right-menu a:first').addClass(activeClass);
        $('.right-menu a').on('click', function() {
            clickMenuAnimating = true;
            $('.right-menu a').removeClass(activeClass);
            $(this).addClass(activeClass);
            $('html,body').animate({
                scrollTop: $($(this).attr('href')).offset().top
            }, {
                complete: function() {
                    window.setTimeout(function() {
                        scrolled = false;
                        clickMenuAnimating = false;
                    }, 300);
                },
                queue: false
            });
        });
    }

    self.port.emit('request-content', convertFileUrlToPath(url));

    self.port.on('response-content', function(data) {
        if (isFirstView) {
            isFirstView = false;

            bodyFragments.push('<aside class="left-menu">');
            bodyFragments.push('<p class="title">Markdown Viewer</p>');
            bodyFragments.push('<ul>');
            data.dirs.forEach(function(dir) {
                bodyFragments.push('<li>');
                bodyFragments.push('<a href="' + dir + '">');
                bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/dir.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
                bodyFragments.push(dir);
                bodyFragments.push('</a>');
                bodyFragments.push('</li>');
            });
            data.files.forEach(function(file) {
                bodyFragments.push('<li>');
                if (url.indexOf(file) === -1) {
                    bodyFragments.push('<a href="' + file + '">');
                } else {
                    bodyFragments.push('<a href="' + file + '" class="is-active">');
                }
                if (markdownExtension.test(file)) {
                    bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/md.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
                } else {
                    bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/file.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
                }
                bodyFragments.push(file);
                bodyFragments.push('</a>');
                bodyFragments.push('</li>');
            });
            bodyFragments.push('</ul>');
            bodyFragments.push('</aside>');

            bodyFragments.push('<div class="main">');
            bodyFragments.push('<div class="container">');
            bodyFragments.push('<div class="columns">');
            bodyFragments.push('<div class="column is-three-quarters">');
            bodyFragments.push('<article class="markdown-body animated fadeInUpBig">');
            bodyFragments.push(md.render(data.content));
            bodyFragments.push('</article>');
            bodyFragments.push('</div>');
            bodyFragments.push('<div class="column right-menu">');
            bodyFragments.push(md.getTocHtml());
            bodyFragments.push('</div>');
            bodyFragments.push('</div>');
            bodyFragments.push('</div>');
            bodyFragments.push('</div>');

            $('body').delay(25).queue(function() {
                $(this).append(bodyFragments.join(''));

                var title = $('h1:first').text();
                if (!title) {
                    title = $('.markdown-body').text().trim().split("\n")[0];
                    title = title.trim().substr(0, 50).replace('<', '&lt;').replace('>', '&gt;');
                }
                $('head > title').text(title);

                attachEventsToToc();

                $(window).on('scroll', function() {
                    scrolled = true;
                });
                window.setInterval(function() {
                    if (scrolled && !clickMenuAnimating) {
                        var $prevHeading = null;
                        var hasDetect = false;
                        var offset = 5;
                        var scroll = $(window).scrollTop();
                        $('.heading').each(function() {
                            if (!hasDetect) {
                                if (scroll + offset < $(this).offset().top) {
                                    if (!$prevHeading) {
                                        $prevHeading = $(this);
                                    }
                                    $('.right-menu a').removeClass(activeClass);
                                    $('.right-menu a[href="#'+ $prevHeading.attr('id') +'"]').addClass(activeClass);
                                    hasDetect = true;
                                } else {
                                    $prevHeading = $(this);
                                }
                            }
                        });
                        scrolled = false;
                    }
                }, 150);
            });
        }
        if (beforeContent !== data.content) {
            $('.markdown-body').html(md.render(data.content));
            $('.right-menu').html(md.getTocHtml());
            attachEventsToToc();
        }
        beforeContent = data.content;
    });

    window.setInterval(function() {
        self.port.emit('request-content', convertFileUrlToPath(url));
    }, 800);

} else if (isDirectory) {

    var index = 1;
    var data = {
        dirs: [],
        files: []
    };

    $('body > table:first > tbody').children('tr').each(function() {
        var $tds = $(this).children('td');
        var $file = $tds.eq(0).find('.file');
        var $dir = $tds.eq(0).find('.dir');
        var filename;
        if ($file.length) {
            filename = $file.attr('href');
            data.files.push({
                filename: $file.attr('href'),
                size: $tds.eq(1).text(),
                modified: $tds.eq(2).text()
            });
        } else if ($dir.length) {
            filename = $dir.attr('href');
            data.dirs.push({
                filename: $dir.attr('href'),
                size: $tds.eq(1).text(),
                modified: $tds.eq(2).text()
            });
        }
    });

    $('head, body').empty();

    headFragments.push('<meta charset="utf-8">');
    headFragments.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
    headFragments.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
    headFragments.push('<title>Markdown Viewer</title>');
    headFragments.push('<link rel="stylesheet" href="resource://markdown-viewer/data/css/lib/bulma.css">');
    $('head').append(headFragments.join(''));

    bodyFragments.push('<div class="container">');
    bodyFragments.push('<div class="columns">');
    bodyFragments.push('<div class="column is-12">');
    bodyFragments.push('<table class="table">');
    bodyFragments.push('<thead>');
    bodyFragments.push('<tr>');
    bodyFragments.push('<th>Index</th>');
    bodyFragments.push('<th>Name</th>');
    bodyFragments.push('<th>Size</th>');
    bodyFragments.push('<th>Last Modified</th>');
    bodyFragments.push('</tr>');
    bodyFragments.push('</thead>');
    bodyFragments.push('<tbody>');
    data.dirs.forEach(function(dir) {
        bodyFragments.push('<tr>');
        bodyFragments.push('<td>' + (index++) + '</td>');
        bodyFragments.push('<td>');
        bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/dir.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        bodyFragments.push('<a href="'+ dir.filename +'">'+ decodeURIComponent(dir.filename) +'</a>');
        bodyFragments.push('</td>');
        bodyFragments.push('<td>' + dir.size + '</td>');
        bodyFragments.push('<td>' + dir.modified + '</td>');
        bodyFragments.push('</tr>');
    });
    data.files.forEach(function(file) {
        bodyFragments.push('<tr>');
        bodyFragments.push('<td>' + (index++) + '</td>');
        bodyFragments.push('<td>');
        if (markdownExtension.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/md.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.(htm|html)/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/html.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.(scss|sass)/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/sass.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.css/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/css.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.json/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/json.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.js/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/js.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.php/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/php.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.rb/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/rb.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.vb/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/vb.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.ini/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/ini.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.png/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/png.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.(jpeg|jpg)/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/jpg.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else if (/\.gif/.test(file.filename)) {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/gif.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        } else {
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/file.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
        }
        bodyFragments.push('<a href="'+ file.filename +'">'+ decodeURIComponent(file.filename) +'</a>');
        bodyFragments.push('</td>');
        bodyFragments.push('<td>' + file.size + '</td>');
        bodyFragments.push('<td>' + file.modified + '</td>');
        bodyFragments.push('</tr>');
    });
    bodyFragments.push('</tbody>');
    bodyFragments.push('</div>');
    bodyFragments.push('</div>');
    bodyFragments.push('</div>');

    $('body').delay(25).queue(function() {
        $(this).append(bodyFragments.join(''));
    });
}
