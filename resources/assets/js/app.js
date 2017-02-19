'use strict';

import './bootstrap';
import path from 'path';
import MarkdownConverter from './modules/MarkdownConverter';
import particlesConfig from './particles.json';

let headFragments = [];
let bodyFragments = [];
const markdownExtension = /\.m(arkdown|kdn?|d(o?wn)?)(\?.*)?(#.*)?$/i;
const url = decodeURIComponent(window.location.href);
const menuUrl = path.dirname(url);
const $document = $(document);
const isPrintPreview = /\?print$/.test(url);
const isMarkdownFile = markdownExtension.test(url);
const isDirectory = $document.find('.file, .dir').length;
let content = $document.find('body pre').text();
let beforeContent = content;

function setTitle($document) {
    let title = $document.find('h1:first').text();
    if (!title) {
        title = $document.find('.markdown-body').text().trim().split("\n")[0];
        title = title.trim().substr(0, 50).replace('<', '&lt;').replace('>', '&gt;');
    }
    $document.find('head > title').text(title);
}

function convertFileUrlToPath(fileUrl) {
    if (navigator.platform.indexOf('Win') === -1) {
        return fileUrl.replace('file://', '');
    } else {
        return fileUrl.replace('file:///', '').replace(/\//g, '\\');
    }
}

function convertPathToFileUrl(path) {
    if (navigator.platform.indexOf('Win') === -1) {
        return 'file://' + path;
    } else {
        return 'file:///' + path.replace(/\//g, '\\');
    }
}

if (isPrintPreview || isMarkdownFile) {
    $document.find('head, body').empty();
}

if (isPrintPreview) {

    headFragments.push('<meta charset="utf-8">');
    headFragments.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
    headFragments.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
    headFragments.push('<title>Markdown Viewer</title>');
    $document.find('head').append(headFragments.join(''));

    const md = new MarkdownConverter();

    bodyFragments.push('<div class="container">');
    bodyFragments.push('<article class="markdown-body">');
    bodyFragments.push(md.render(content));
    if (md.getAnnotations().length) {
        bodyFragments.push('<hr>');
        bodyFragments.push(md.getAnnotationsHtml());
    }
    bodyFragments.push('</article>');
    bodyFragments.push('</div>');

    $document.find('body').delay(25).queue(function() {
        $(this).append(bodyFragments.join(''));

        setTitle($document);
    });

} else if (isMarkdownFile) {

    headFragments.push('<meta charset="utf-8">');
    headFragments.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
    headFragments.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
    headFragments.push('<title>Markdown Viewer</title>');
    $document.find('head').append(headFragments.join(''));

    const activeClass = 'is-active animated fadeIn';
    const md = new MarkdownConverter();
    let isFirstView = true;
    let scrolled = false;
    let clickMenuAnimating = false;

    function attachEventsToToc($document) {
        $document.find('#right-menu a:first').addClass(activeClass);
        $document.find('#right-menu a').on('click', function() {
            clickMenuAnimating = true;
            $document.find('#right-menu a').removeClass(activeClass);
            $(this).addClass(activeClass);
            $document.find('html,body').animate({
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

        $('#right-menu').delay(100).queue(function() {
            particlesJS('right-menu', particlesConfig);
        });
    }

    self.port.emit('request-content', convertFileUrlToPath(url));

    self.port.on('response-content', function(data) {
        if (isFirstView) {
            isFirstView = false;

            bodyFragments.push('<aside class="animated fadeInLeft" id="left-menu">');
            bodyFragments.push('<p class="title">Markdown Viewer</p>');
            bodyFragments.push('<ul>');
            data.dirs.forEach(function(dir) {
                bodyFragments.push('<li>');
                bodyFragments.push('<a href="' + convertPathToFileUrl(dir.path) + '">');
                bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/dir.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
                bodyFragments.push(dir.filename);
                bodyFragments.push('</a>');
                bodyFragments.push('</li>');
            });
            data.files.forEach(function(file) {
                bodyFragments.push('<li>');
                if (new RegExp(file.filename + '$').test(url)) {
                    bodyFragments.push('<a href="' + convertPathToFileUrl(file.path) + '" class="is-active">');
                } else {
                    bodyFragments.push('<a href="' + convertPathToFileUrl(file.path) + '">');
                }
                if (markdownExtension.test(file.filename)) {
                    bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/md.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
                } else {
                    bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/file.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
                }
                bodyFragments.push(file.filename);
                bodyFragments.push('</a>');
                bodyFragments.push('</li>');
            });
            bodyFragments.push('</ul>');
            bodyFragments.push('</aside>');

            bodyFragments.push('<div id="main">');
            bodyFragments.push('<a class="print animated bounceInRight" href="?print">');
            bodyFragments.push('<img class="image is-24x24" src="resource://markdown-viewer/data/img/print.png">');
            bodyFragments.push('</a>');
            bodyFragments.push('<div class="container">');
            bodyFragments.push('<article class="markdown-body animated fadeInUpBig">');
            bodyFragments.push(md.render(data.content));
            if (md.getAnnotations().length) {
                bodyFragments.push('<hr>');
                bodyFragments.push(md.getAnnotationsHtml());
            }
            bodyFragments.push('</article>');
            bodyFragments.push('</div>');
            bodyFragments.push('</div>');

            bodyFragments.push('<div class="animated fadeInRight" id="right-menu">');
            bodyFragments.push(md.getTocHtml());
            bodyFragments.push('</div>');

            $document.find('body').delay(25).queue(function() {
                $(this).append(bodyFragments.join(''));

                var title = $document.find('h1:first').text();
                if (!title) {
                    title = $document.find('.markdown-body').text().trim().split("\n")[0];
                    title = title.trim().substr(0, 50).replace('<', '&lt;').replace('>', '&gt;');
                }
                $document.find('head > title').text(title);

                attachEventsToToc($document);

                $(window).on('scroll', function() {
                    scrolled = true;
                });
                window.setInterval(function() {
                    if (scrolled && !clickMenuAnimating) {
                        var $prevHeading = null;
                        var hasDetect = false;
                        var offset = 5;
                        var scroll = $(window).scrollTop();
                        $document.find('.heading').each(function() {
                            if (!hasDetect) {
                                if (scroll + offset < $(this).offset().top) {
                                    if (!$prevHeading) {
                                        $prevHeading = $(this);
                                    }
                                    $document.find('#right-menu a').removeClass(activeClass);
                                    $document.find('#right-menu a[href="#'+ $prevHeading.attr('id') +'"]').addClass(activeClass);
                                    hasDetect = true;
                                } else {
                                    $prevHeading = $(this);
                                }
                            }
                        });
                        scrolled = false;
                    }
                }, 150);

                particlesJS('left-menu', particlesConfig);
            });
        }
        if (beforeContent !== data.content) {
            let mdFragments = [];
            mdFragments.push(md.render(data.content));
            if (md.getAnnotations().length) {
                mdFragments.push('<hr>');
                mdFragments.push(md.getAnnotationsHtml());
            }
            $document.find('.markdown-body').html(mdFragments.join(''));
            $document.find('#right-menu').html(md.getTocHtml());
            attachEventsToToc($document);
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

    $document.find('body > table:first > tbody').children('tr').each(function() {
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

    $document.find('head, body').empty();

    self.port.emit('request-content', convertFileUrlToPath(url));

    self.port.on('response-content', function(menuData) {
        headFragments.push('<meta charset="utf-8">');
        headFragments.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
        headFragments.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
        headFragments.push('<title>Markdown Viewer</title>');
        $document.find('head').append(headFragments.join(''));

        bodyFragments.push('<aside class="animated fadeInLeft" id="left-menu">');
        bodyFragments.push('<p class="title">Markdown Viewer</p>');
        bodyFragments.push('<ul>');
        menuData.dirs.forEach(function(dir) {
            bodyFragments.push('<li>');
            if (new RegExp(dir.filename + '\/$').test(url)) {
                bodyFragments.push('<a href="' + convertPathToFileUrl(dir.path) + '" class="is-active">');
                bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/dir-open.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
            } else {
                bodyFragments.push('<a href="' + convertPathToFileUrl(dir.path) + '">');
                bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/dir.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
            }
            bodyFragments.push(dir.filename);
            bodyFragments.push('</a>');
            bodyFragments.push('</li>');
        });
        menuData.files.forEach(function(file) {
            bodyFragments.push('<li>');
            bodyFragments.push('<a href="' + convertPathToFileUrl(file.path) + '">');
            if (markdownExtension.test(file.filename)) {
                bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/md.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
            } else {
                bodyFragments.push('<img class="image is-16x16" src="resource://markdown-viewer/data/img/menu/file.png" style="display: inline-block; vertical-align: -2px; margin-right: 8px;">');
            }
            bodyFragments.push(file.filename);
            bodyFragments.push('</a>');
            bodyFragments.push('</li>');
        });
        bodyFragments.push('</ul>');
        bodyFragments.push('</aside>');

        bodyFragments.push('<div id="dir-main">');
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
        bodyFragments.push('</div>');

        $document.find('body').delay(25).queue(function() {
            $(this).append(bodyFragments.join(''));

            particlesJS('left-menu', particlesConfig);
        });
    });

}
