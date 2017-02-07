var headFragments = [];
var bodyFragments = [];
var markdowns = [];
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
        return fileUrl.replace('file:///', '').replace('/', '\\');
    }
}

if ($('.file').length) {
    $('.file').each(function() {
        var filename = decodeURIComponent($(this).attr('href'));
        if (markdownExtension.test(filename)) {
            markdowns.push(filename);
        }
    });
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

    window.setInterval(function() {
        self.port.emit('request-content', convertFileUrlToPath(url));
    }, 800);

    self.port.on('response-content', function(afterContent) {
        if (beforeContent !== afterContent) {
            $('.markdown-body').html(md.render(afterContent));
            $('.right-menu').html(md.getTocHtml());
        }
        beforeContent = afterContent;
    });

    bodyFragments.push('<div class="container">');
    bodyFragments.push('<div class="columns">');
    bodyFragments.push('<div class="column is-three-quarters">');
    bodyFragments.push('<article class="markdown-body animated fadeInUpBig">');
    bodyFragments.push(md.render(content));
    bodyFragments.push('</article>');
    bodyFragments.push('</div>');
    bodyFragments.push('<div class="column right-menu">');
    bodyFragments.push(md.getTocHtml());
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

        var scrolled = false;
        var clickMenuAnimating = false;
        var activeClass = 'is-active animated fadeIn';

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
            bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/icons/markdown.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
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
