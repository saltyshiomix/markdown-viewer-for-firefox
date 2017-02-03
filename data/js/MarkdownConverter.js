var EXPORTED_SYMBOLS = ['MarkdownConverter'];

function insertToc(toc, tocObj, depth) {
    switch (depth) {
        case 0:
            toc.push(tocObj);
            break;
        case 1:
            toc[toc.length - 1].children.push(tocObj);
            break;
        case 2:
            toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children.push(tocObj);
            break;
        case 3:
            toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children.length - 1].children.push(tocObj);
            break;
        case 4:
            toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children.length - 1].children.length - 1].children.push(tocObj);
            break;
        case 5:
            toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children[toc[toc.length - 1].children[toc[toc.length - 1].children.length - 1].children.length - 1].children.length - 1].children.length - 1].children.push(tocObj);
            break;
        default:
            break;
    }
}

function MarkdownConverter(marked, hljs, emojione) {
    this.marked = marked;
    this.toc = [];

    var renderer = new marked.Renderer();

    renderer.code = (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
            return '<pre class="hljs"><code class="'+ lang +'">'+ hljs.highlight(lang, code).value +'</code></pre>';
        }
        return '<pre class="hljs"><code>'+ hljs.highlightAuto(code).value +'</code></pre>';
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

        if (this.topLevel) {
            if (level < this.topLevel) {
                this.topLevel = level;
                insertToc(this.toc, tocObj, 0);
            } else {
                insertToc(this.toc, tocObj, level - this.topLevel);
            }
        } else {
            this.topLevel = level;
            insertToc(this.toc, tocObj, 0);
        }

        return '<h'
            + level
            + ' id="'
            + id
            + '">'
            + emojione.toImage(text)
            + '</h'
            + level
            + '>\n';
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

    this.marked.setOptions({ renderer: renderer });
}

MarkdownConverter.prototype = {
    render: function(markdown) {
        this._clearToc();
        return this.marked(markdown);
    },
    getToc: function() {
        return this.toc;
    },
    getTocHtml: function() {
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
    },
    _clearToc: function() {
        this.toc = [];
    },
    _composeListHtml: function(children) {
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
};
