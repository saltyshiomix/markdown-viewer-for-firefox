'use strict';

var { Ci, Cu, Cr, Cc, CC, components } = require('chrome');
var { Class } = require('sdk/core/heritage');
var { viewFor } = require('sdk/view/core');
var xpcom = require('sdk/platform/xpcom');
var tabs = require('sdk/tabs');
var tabUtils = require('sdk/tabs/utils');

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

var registrar = components.manager.QueryInterface(Ci.nsIComponentRegistrar);
var hljs = require('resource://markdown-viewer/data/js/highlight.js');
var marked = require('resource://markdown-viewer/data/js/marked.js');
var emojione = require('resource://markdown-viewer/data/js/emojione.js');

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

marked.setOptions({ renderer: renderer });

// For Linux
function MarkdownMimeTypeObserver() {}

MarkdownMimeTypeObserver.prototype = {
    classDescription: 'text/markdown to text/plain stream converter',
    classID: components.ID('{315F060C-7489-48CD-835B-5A3DA6CB3D85}'),
    contractID: '@mozilla.org/streamconv;1?from=text/markdown&to=*/*',

    _xpcom_factory: {
        createInstance: function(outer, iid) {
            if (outer !== null) {
                throw Cr.NS_ERROR_NO_AGGREGATION;
            }

            if (iid.equals(Ci.nsISupports) ||
                iid.equals(Ci.nsIStreamConverter) ||
                iid.equals(Ci.nsIStreamListener) ||
                iid.equals(Ci.nsIRequestObserver)) {
                return new MarkdownMimeTypeObserver();
            }
            throw Cr.NS_ERROR_NO_INTERFACE;
        }
    },

    QueryInterface: XPCOMUtils.generateQI([
        Ci.nsIObserver,
        Ci.nsIStreamConverter,
        Ci.nsIStreamListener,
        Ci.nsIRequestObserver
    ]),

    onStartRequest: function(aRequest, aContext) {
        this.html = '';
        this.uri = aRequest.QueryInterface(Ci.nsIChannel).URI.spec;
        this.channel = aRequest;
        this.channel.contentType = 'text/plain';
        this.listener.onStartRequest(this.channel, aContext);
    },

    onStopRequest: function(aRequest, aContext, aStatusCode) {
        var sis = Cc['@mozilla.org/io/string-input-stream;1'].createInstance(Ci.nsIStringInputStream);
        sis.setData(this.html, this.html.length);
        this.listener.onDataAvailable(this.channel, aContext, sis, 0, this.html.length);
        this.listener.onStopRequest(this.channel, aContext, aStatusCode);
    },

    onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
        var si = Cc['@mozilla.org/scriptableinputstream;1'].createInstance();
        si = si.QueryInterface(Ci.nsIScriptableInputStream);
        si.init(aInputStream);
        this.html += si.read(aCount);

        // Fire the event
        Services.obs.notifyObservers({}, 'chrome-document-global-created', aInputStream);
    },

    asyncConvertData: function(aFromType, aToType, aListener, aCtxt) {
        this.listener = aListener;
    },

    convert: function(aFromStream, aFromType, aToType, aCtxt) {
        return aFromStream;
    }
};

var MarkdownMimeTypeObserverFactory = Object.freeze({
  createInstance: function(aOuter, aIID) {
    if (aOuter) {
        throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return new MarkdownMimeTypeObserver();
  },
  loadFactory: function (aLock) {},
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIFactory])
});

registrar.registerFactory(
    MarkdownMimeTypeObserver.prototype.classID,
    MarkdownMimeTypeObserver.prototype.classDescription,
    MarkdownMimeTypeObserver.prototype.contractID,
    MarkdownMimeTypeObserverFactory
);

var MarkdownDocumentObserver = Class({
    extends: xpcom.Unknown,
    interfaces: ['nsIObserver'],
    topic: 'chrome-document-global-created',
    get wrappedJSObject() this,

    observe: function(aSubject, aTopic, aData) {
        if (!/view-source:+/i.test(tabs.activeTab.url)
                && /\.m(arkdown|kdn?|d(o?wn)?)(\?.*)?(#.*)?$/i.test(tabs.activeTab.url)) {
            Services.io
                .newChannelFromURI(Services.io.newURI(tabs.activeTab.url, null, null))
                .asyncOpen(this, null);
        }
    },
    onStartRequest: function(aRequest, aContext) {},
    onStopRequest: function(aRequest, aContext, aStatusCode) {},
    onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
        this.content = '';

        var browser = tabUtils.getBrowserForTab(viewFor(tabs.activeTab));

        if (browser.contentDocument.contentType === 'text/html') {
            return;
        }

        try {
            var ConverterStream = CC('@mozilla.org/intl/converter-input-stream;1', 'nsIConverterInputStream', 'init');
            var cs = new ConverterStream(aInputStream, 'utf-8', 4096, Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

            try {
                var str = {};
                while (cs.readString(4096, str)) {
                    this.content += str.value;
                }
            }
            finally {
                cs.close();

                // I don't know why this is needed
                var content = this.content;

                browser.contentWindow.addEventListener('load', function load() {
                    browser.contentWindow.removeEventListener('load', load, false);

                    browser.contentDocument.body.innerHTML = '';

                    browser.contentDocument.head.innerHTML = `
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title></title>
<link rel="stylesheet" href="resource://markdown-viewer/data/css/app.css">
`;

                    browser.contentDocument.body.innerHTML = `
<div class="container">
    <article class="markdown-body">
        ${marked(content)}
    </article>
</div>
`;

                    var title = browser.contentDocument.body.querySelector('h1');
                    if (title) {
                        title = title.textContent;
                    }
                    else {
                        title = browser.contentDocument.body.textContent.trim().split("\n")[0];
                    }
                    title = title.trim().substr(0, 50).replace('<', '&lt;').replace('>', '&gt;');
                    browser.contentDocument.title = title;

                }, false);
            }
        }
        catch (ex) {
            console.error('data: ', ex.message, ex);
        }
    },
    register: function() {
        Services.obs.addObserver(this, this.topic, false);
    },
    unregister: function() {
        Services.obs.removeObserver(this, this.topic);
    }
});

var mdObserver = new MarkdownDocumentObserver();
mdObserver.register();

Services.obs.addObserver(function() {
    registrar.unregisterFactory(MarkdownMimeTypeObserver.prototype.classID, MarkdownMimeTypeObserverFactory);
    mdObserver.unregister();
}, 'xpcom-will-shutdown');
