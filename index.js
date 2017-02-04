'use strict';

var { Ci, Cu, Cr, Cc, CC, components } = require('chrome');
var { Class } = require('sdk/core/heritage');
var { viewFor } = require('sdk/view/core');
var xpcom = require('sdk/platform/xpcom');
var tabs = require('sdk/tabs');
var tabUtils = require('sdk/tabs/utils');

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://markdown-viewer/data/js/MarkdownConverter.js');

var registrar = components.manager.QueryInterface(Ci.nsIComponentRegistrar);

var $ = require('resource://markdown-viewer/data/js/lib/jquery.js');
var hljs = require('resource://markdown-viewer/data/js/lib/highlight.js');
var marked = require('resource://markdown-viewer/data/js/lib/marked.js');
var emojione = require('resource://markdown-viewer/data/js/lib/emojione.js');

var md = new MarkdownConverter(marked, hljs, emojione);

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
    topic: 'content-document-global-created',
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
        var content = '';
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
                    content += str.value;
                }
            } finally {
                cs.close();

                browser.contentWindow.addEventListener('load', function load() {
                    browser.contentWindow.removeEventListener('load', load, false);

                    var $ = require('resource://markdown-viewer/data/js/lib/jquery.js')(browser.contentWindow);

                    $('body').empty();

                    var headFragments = [];
                    headFragments.push('<meta charset="utf-8">');
                    headFragments.push('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
                    headFragments.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
                    headFragments.push('<title>Markdown Viewer</title>');
                    headFragments.push('<link rel="stylesheet" href="resource://markdown-viewer/data/css/animate.css">');
                    headFragments.push('<link rel="stylesheet" href="resource://markdown-viewer/data/css/app.css">');
                    $('head').empty().append(headFragments.join(''));

                    var bodyFragments = [];
                    bodyFragments.push('<div class="container">');
                    bodyFragments.push('<div class="columns">');
                    bodyFragments.push('<div class="column is-three-quarters">');
                    bodyFragments.push('<article class="markdown-body animated fadeInUpBig">');
                    bodyFragments.push(md.render(content));
                    bodyFragments.push('</article>');
                    bodyFragments.push('</div>');
                    bodyFragments.push('<div class="column">');
                    bodyFragments.push(md.getTocHtml());
                    bodyFragments.push('</div>');
                    bodyFragments.push('</div>');
                    bodyFragments.push('</div>');

                    $('body').delay(50).queue(function() {
                        $(this).append(bodyFragments.join(''));

                        var title = $('h1').eq(0).text();
                        if (!title) {
                            title = $('body').text().trim().split("\n")[0];
                            title = title.trim().substr(0, 50).replace('<', '&lt;').replace('>', '&gt;');
                        }
                        $('head > title').text(title);

                        var scrolled = false;
                        var clickMenuAnimating = false;
                        var activeClass = 'is-active animated fadeIn';
                        $('.menu-list a:first').addClass(activeClass);
                        $('.menu-list a').on('click', function(e) {
                            clickMenuAnimating = true;
                            $('.menu-list a').removeClass(activeClass);
                            $(this).addClass(activeClass);
                            $('html,body').animate({
                                scrollTop: $($(this).attr('href')).offset().top
                            }, {
                                complete: function() {
                                    browser.contentWindow.setTimeout(function() {
                                        scrolled = false;
                                        clickMenuAnimating = false;
                                    }, 300);
                                },
                                queue: false
                            });
                        });

                        $(browser.contentWindow).on('scroll', function() {
                            scrolled = true;
                        });
                        browser.contentWindow.setInterval(function() {
                            if (scrolled && !clickMenuAnimating) {
                                var $prevHeading = null;
                                var hasDetect = false;
                                var scroll = $(browser.contentWindow).scrollTop();
                                $('.heading').each(function() {
                                    if (!hasDetect) {
                                        if (scroll + 5 < $(this).offset().top) {
                                            if (!$prevHeading) {
                                                $prevHeading = $(this);
                                            }
                                            $('.menu-list a').removeClass(activeClass);
                                            $('.menu-list a[href="#'+ $prevHeading.attr('id') +'"]').addClass(activeClass);
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

                }, false);
            }
        } catch (e) {
            console.error('data: ', e.message, e);
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
