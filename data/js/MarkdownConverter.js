var EXPORTED_SYMBOLS = ['MarkdownConverter'];

function MarkdownConverter(marked, hljs, emojione) {
    this.marked = marked;

    var renderer = new marked.Renderer();

    renderer.code = function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return '<pre class="hljs"><code class="'+ lang +'">'+ hljs.highlight(lang, code).value +'</code></pre>';
        }
        return '<pre class="hljs"><code>'+ hljs.highlightAuto(code).value +'</code></pre>';
    };

    renderer.blockquote = function(quote) {
        return '<blockquote>\n' + emojione.toImage(quote) + '</blockquote>\n';
    };

    renderer.html = function(html) {
        return html;
    };

    renderer.heading = function(text, level, raw) {
        return '<h'
            + level
            + ' id="'
            + raw.toLowerCase().replace(/[^\w]+/g, '-')
            + '">'
            + emojione.toImage(text)
            + '</h'
            + level
            + '>\n';
    };

    renderer.hr = function() {
        return '<hr>\n';
    };

    renderer.list = function(body, ordered) {
        var type = ordered ? 'ol' : 'ul';
        return '<' + type + '>\n' + body + '</' + type + '>\n';
    };

    renderer.listitem = function(text) {
        if (text.indexOf('[ ]') !== -1) {
            return '<li class="gfm-checkbox">' + emojione.toImage(text.replace('[ ]', '<input type="checkbox" disabled>')) + '</li>\n';
        }
        if (text.indexOf('[x]') !== -1) {
            return '<li class="gfm-checkbox">' + emojione.toImage(text.replace('[x]', '<input type="checkbox" checked disabled>')) + '</li>\n';
        }
        return '<li>' + emojione.toImage(text) + '</li>\n';
    };

    renderer.paragraph = function(text) {
        return '<p>' + emojione.toImage(text) + '</p>\n';
    };

    renderer.table = function(header, body) {
        return '<table>\n'
            + '<thead>\n'
            + header
            + '</thead>\n'
            + '<tbody>\n'
            + body
            + '</tbody>\n'
            + '</table>\n';
    };

    renderer.tablerow = function(content) {
        return '<tr>\n' + content + '</tr>\n';
    };

    renderer.tablecell = function(content, flags) {
        var type = flags.header ? 'th' : 'td';
        var tag = flags.align
            ? '<' + type + ' style="text-align:' + flags.align + '">'
            : '<' + type + '>';
        return tag + emojione.toImage(content) + '</' + type + '>\n';
    };

    renderer.strong = function(text) {
        return '<strong>' + emojione.toImage(text) + '</strong>';
    };

    renderer.em = function(text) {
        return '<em>' + emojione.toImage(text) + '</em>';
    };

    renderer.codespan = function(text) {
        return '<code>' + text + '</code>';
    };

    renderer.br = function() {
        return '<br>';
    };

    renderer.del = function(text) {
        return '<del>' + emojione.toImage(text) + '</del>';
    };

    renderer.link = function(href, title, text) {
        var out = '<a href="' + href + '"';
        if (title) {
            out += ' title="' + title + '"';
        }
        out += '>' + emojione.toImage(text) + '</a>';
        return out;
    };

    renderer.image = function(href, title, text) {
        var out = '<img src="' + href + '" alt="' + text + '"';
        if (title) {
            out += ' title="' + title + '"';
        }
        out += '>';
        return out;
    };

    renderer.text = function(text) {
        return emojione.toImage(text);
    };

    this.marked.setOptions({ renderer: renderer });
}

MarkdownConverter.prototype = {
    render: function(markdown) {
        return this.marked(markdown);
    }
};
