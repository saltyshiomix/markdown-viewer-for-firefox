var headFragments = [];
var bodyFragments = [];
var markdowns = [];
var markdownExtension = /\.m(arkdown|kdn?|d(o?wn)?)(\?.*)?(#.*)?$/i;
var url = decodeURIComponent(window.location.href);
var isMarkdownFile = markdownExtension.test(url);
var content = $('body pre').text();

if ($('.file').length) {
    $('.file').each(function() {
        var filename = decodeURIComponent($(this).attr('href'));
        if (markdownExtension.test(filename)) {
            markdowns.push(filename);
        }
    });
}

if (isMarkdownFile || markdowns.length) {
    $('head, body').empty();
    headFragments.push('<meta charset="utf-8">');
    headFragments.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
    headFragments.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
    headFragments.push('<title>Markdown Viewer</title>');
    headFragments.push('<link rel="stylesheet" href="resource://markdown-viewer/data/css/lib/animate.css">');
    headFragments.push('<link rel="stylesheet" href="resource://markdown-viewer/data/css/app.css">');
    $('head').append(headFragments.join(''));
}

if (isMarkdownFile) {
    self.port.on('load-menus', function(menus) {
        var md = new MarkdownConverter(marked, hljs, emojione);

        if (menus.length) {
            bodyFragments.push('<div class="container">');
            bodyFragments.push('<div class="columns">');
            bodyFragments.push('<div class="column is-2 left-menu">');
            bodyFragments.push('<aside class="menu box">');
            bodyFragments.push('<ul class="menu-list">');
            menus.forEach(function(menu) {
                if (url.indexOf(menu) === -1) {
                    bodyFragments.push('<li><a href="' + menu + '">' + menu.replace(markdownExtension, '') + '</a></li>');
                } else {
                    bodyFragments.push('<li><a href="' + menu + '" class="is-active">' + menu.replace(markdownExtension, '') + '</a></li>');
                }
            });
            bodyFragments.push('</ul>');
            bodyFragments.push('</aside>');
            bodyFragments.push('</div>');
            bodyFragments.push('<div class="column is-8">');
            bodyFragments.push('<article class="markdown-body animated fadeInUpBig">');
            bodyFragments.push(md.render(content));
            bodyFragments.push('</article>');
            bodyFragments.push('</div>');
            bodyFragments.push('<div class="column is-2 right-menu">');
            bodyFragments.push(md.getTocHtml());
            bodyFragments.push('</div>');
            bodyFragments.push('</div>');
            bodyFragments.push('</div>');
        } else {
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
        }

        $('body').delay(25).queue(function() {
            $(this).append(bodyFragments.join(''));

            var title = $('h1:first').text();
            if (!title) {
                title = $(this).text().trim().split("\n")[0];
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
    });
} else if (markdowns.length) {
    self.port.emit('load-directory', {
        path: url,
        files: markdowns
    });

    bodyFragments.push('<div class="container">');
    bodyFragments.push('<div class="columns">');
    bodyFragments.push('<div class="column is-2 left-menu">');
    bodyFragments.push('<aside class="menu box">');
    bodyFragments.push('<ul class="menu-list">');
    markdowns.forEach(function(menu) {
        if (url.indexOf(menu) === -1) {
            bodyFragments.push('<li><a href="' + menu + '">' + menu.replace(markdownExtension, '') + '</a></li>');
        } else {
            bodyFragments.push('<li><a href="' + menu + '" class="is-active">' + menu.replace(markdownExtension, '') + '</a></li>');
        }
    });
    bodyFragments.push('</ul>');
    bodyFragments.push('</aside>');
    bodyFragments.push('</div>');
    bodyFragments.push('<div class="column">');
    bodyFragments.push('</div>');
    bodyFragments.push('</div>');
    bodyFragments.push('</div>');

    $('body').delay(25).queue(function() {
        $(this).append(bodyFragments.join(''));
    });
}
