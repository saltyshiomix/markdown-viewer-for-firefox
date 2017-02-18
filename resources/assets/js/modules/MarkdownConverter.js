'use strict';

let hljs = require('highlight.js');
let marked = require('marked');
let emojione = require('emojione');

emojione.imageType = 'png';
emojione.ascii = false;
emojione.imagePathPNG = 'resource://markdown-viewer/data/img/emoji/';

class MarkdownConverter {
    constructor() {
        this.marked = marked;
        this.toc = [];
        this.annotations = [];

        const renderer = new marked.Renderer();

        renderer.code = (code, lang) => {
            var fragments = [];
            if (lang) {
                if (lang.indexOf(':') === -1) {
                    if (hljs.getLanguage(lang)) {
                        fragments.push('<pre class="hljs">');
                        fragments.push('<code class="'+ lang +'">');
                        fragments.push(hljs.highlight(lang, code).value);
                        fragments.push('</code>');
                        fragments.push('</pre>');
                    } else {
                        fragments.push('<pre class="hljs">');
                        fragments.push('<code>');
                        fragments.push(hljs.highlightAuto(code).value);
                        fragments.push('</code>');
                        fragments.push('</pre>');
                    }
                } else {
                    var _lang = lang.split(':')[0];
                    var filename = lang.substring(_lang.length + 1, lang.length);
                    if (hljs.getLanguage(_lang)) {
                        fragments.push('<pre class="hljs has-filename">');
                        fragments.push('<code class="'+ _lang +'">');
                        fragments.push(hljs.highlight(_lang, code).value);
                        fragments.push('</code>');
                        fragments.push('<span class="filename">' + filename + '</span>');
                        fragments.push('</pre>');
                    } else {
                        fragments.push('<pre class="hljs has-filename">');
                        fragments.push('<code>');
                        fragments.push(hljs.highlightAuto(code).value);
                        fragments.push('</code>');
                        fragments.push('<span class="filename">' + filename + '</span>');
                        fragments.push('</pre>');
                    }
                }
            } else {
                fragments.push('<pre class="hljs">');
                fragments.push('<code>');
                fragments.push(hljs.highlightAuto(code).value);
                fragments.push('</code>');
                fragments.push('</pre>');
            }
            return fragments.join('');
        };

        renderer.blockquote = (quote) => {
            return '<blockquote>\n' + emojione.toImage(quote) + '</blockquote>\n';
        };

        renderer.html = (html) => {
            return html;
        };

        renderer.heading = (text, level, raw) => {
            var id = encodeURIComponent(raw).toLowerCase().replace(/[^\w]+/g, '-');

            var tocObj = {
                level: level,
                id: id,
                text: text,
                children: []
            };

            var children = this.toc;
            var parentChildren;
            var lastChild;
            while (children.length) {
                parentChildren = children;
                lastChild = children[children.length - 1];
                children = lastChild.children;
            }
            if (!this.toc.length) {
                this.topLevel = level;
                this.toc.push(tocObj);
            } else {
                if (level <= this.topLevel) {
                    this.topLevel = level;
                    this.toc.push(tocObj);
                } else if (lastChild.level < level) {
                    children.push(tocObj);
                } else if (lastChild.level === level) {
                    parentChildren.push(tocObj);
                } else {
                    children = this.toc;
                    while (children.length) {
                        parentChildren = children;
                        lastChild = children[children.length - 1];
                        if (lastChild.level === level) {
                            parentChildren.push(tocObj);
                            break;
                        }
                        children = lastChild.children;
                    }
                }
            }

            var fragments = [];
            fragments.push('<h' + level + ' class="heading" id="' + id + '">');
            fragments.push(emojione.toImage(text));
            fragments.push('</h' + level + '>\n');

            return fragments.join('');
        };

        renderer.hr = () => {
            return '<hr>\n';
        };

        renderer.list = (body, ordered) => {
            var type = ordered ? 'ol' : 'ul';
            return '<' + type + '>\n' + body + '</' + type + '>\n';
        };

        renderer.listitem = (text) => {
            if (text.indexOf('[ ]') !== -1) {
                return '<li class="gfm-checkbox">' + emojione.toImage(text.replace('[ ]', '<input type="checkbox" disabled>')) + '</li>\n';
            }
            if (text.indexOf('[x]') !== -1) {
                return '<li class="gfm-checkbox">' + emojione.toImage(text.replace('[x]', '<input type="checkbox" checked disabled>')) + '</li>\n';
            }
            return '<li>' + emojione.toImage(text) + '</li>\n';
        };

        renderer.paragraph = (text) => {
            return '<p>' + emojione.toImage(text) + '</p>\n';
        };

        renderer.table = (header, body) => {
            return '<table>\n'
                + '<thead>\n'
                + header
                + '</thead>\n'
                + '<tbody>\n'
                + body
                + '</tbody>\n'
                + '</table>\n';
        };

        renderer.tablerow = (content) => {
            return '<tr>\n' + content + '</tr>\n';
        };

        renderer.tablecell = (content, flags) => {
            var type = flags.header ? 'th' : 'td';
            var tag = flags.align
                ? '<' + type + ' style="text-align:' + flags.align + '">'
                : '<' + type + '>';
            return tag + emojione.toImage(content) + '</' + type + '>\n';
        };

        renderer.strong = (text) => {
            return '<strong>' + emojione.toImage(text) + '</strong>';
        };

        renderer.em = (text) => {
            return '<em>' + emojione.toImage(text) + '</em>';
        };

        renderer.codespan = (text) => {
            return '<code>' + text + '</code>';
        };

        renderer.br = () => {
            return '<br>';
        };

        renderer.del = (text) => {
            return '<del>' + emojione.toImage(text) + '</del>';
        };

        renderer.link = (href, title, text) => {
            if (text.indexOf('^') === 0) {
                const id = text.replace('^', '');
                const annotation = href;
                let annotationFragments = [];
                annotationFragments.push('<p id="annotation'+ id +'"><small>');
                annotationFragments.push('[^' + id + ']: ' + annotation);
                annotationFragments.push('</small></p>');
                this.annotations.push(annotationFragments.join(''));

                let annotationTrigger = [];
                annotationTrigger.push('<a class="annotation" href="#annotation'+ id +'">');
                annotationTrigger.push('[' + text + ']');
                annotationTrigger.push('</a>');

                return annotationTrigger.join('');
            }
            var out = '<a href="' + href + '"';
            if (title) {
                out += ' title="' + title + '"';
            }
            out += '>' + emojione.toImage(text) + '</a>';
            return out;
        };

        renderer.image = (href, title, text) => {
            var out = '<img src="' + href + '" alt="' + text + '"';
            if (title) {
                out += ' title="' + title + '"';
            }
            out += '>';
            return out;
        };

        renderer.text = (text) => {
            return emojione.toImage(text);
        };

        this.marked.setOptions({
            renderer: renderer,
            gfm: true,
            tables: true,
            breaks: true,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: true
        });
    }

    render(markdown) {
        this.toc = [];
        this.annotations = [];
        return marked(markdown);
    }

    getToc() {
        return this.toc;
    }

    getTocHtml() {
        if (!this.toc.length) {
            return '';
        }

        var fragments = [];

        fragments.push('<aside class="menu box">');
        fragments.push('<ul class="menu-list">');
        fragments.push(this._composeListHtml(this.toc));
        fragments.push('</ul>');
        fragments.push('</aside>');

        return fragments.join('');
    }

    getAnnotations() {
        return this.annotations;
    }

    getAnnotationsHtml() {
        return this.annotations.join('');
    }

    _composeListHtml(children) {
        var self = this;
        var fragments = [];

        children.forEach(function(child) {
            fragments.push('<li>');
            fragments.push('<a href="#' + child.id + '">');
            fragments.push(child.text);
            fragments.push('</a>');
            if (child.children.length) {
                fragments.push('<ul class="menu-list">');
                fragments.push(self._composeListHtml(child.children));
                fragments.push('</ul>');
            }
            fragments.push('</li>');
        });

        return fragments.join('');
    }
}

module.exports = MarkdownConverter;
