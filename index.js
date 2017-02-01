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
var marked = require('resource://markdown-viewer/data/js/marked.js');

// For Linux
function MarkdownMimeTypeObserver() {}

MarkdownMimeTypeObserver.prototype = {
    classDescription: 'text/markdown to text/plain stream converter',
    classID: components.ID('{22e1de77-b21a-11e3-a5e2-0800200c9a66}'),
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
        console.log('MarkdownMimeTypeObserver: onStartRequest');
        this.html = '';
        this.uri = aRequest.QueryInterface(Ci.nsIChannel).URI.spec;
        this.channel = aRequest;
        this.channel.contentType = 'text/plain';
        this.listener.onStartRequest(this.channel, aContext);
    },

    onStopRequest: function(aRequest, aContext, aStatusCode) {
        console.log('MarkdownMimeTypeObserver: onStopRequest');
        var sis = Cc['@mozilla.org/io/string-input-stream;1'].createInstance(Ci.nsIStringInputStream);
        sis.setData(this.html, this.html.length);
        this.listener.onDataAvailable(this.channel, aContext, sis, 0, this.html.length);
        this.listener.onStopRequest(this.channel, aContext, aStatusCode);
    },

    onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
        console.log('MarkdownMimeTypeObserver: onDataAvailable');
        var si = Cc['@mozilla.org/scriptableinputstream;1'].createInstance();
        si = si.QueryInterface(Ci.nsIScriptableInputStream);
        si.init(aInputStream);
        this.html += si.read(aCount);

        // Fire the event
        Services.obs.notifyObservers({}, 'chrome-document-global-created', aInputStream);
    },

    asyncConvertData: function(aFromType, aToType, aListener, aCtxt) {
        console.log('MarkdownMimeTypeObserver: asyncConvertData');
        this.listener = aListener;
    },

    convert: function(aFromStream, aFromType, aToType, aCtxt) {
        console.log('MarkdownMimeTypeObserver: convert');
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

console.log('MarkdownMimeTypeObserver: registered');
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
        console.log('MarkdownDocumentObserver: observing...');
        if (!/view-source:+/.test(tabs.activeTab.url)
                && /\.m(arkdown|kdn?|d(o?wn)?)(\?.*)?(#.*)?$/.test(tabs.activeTab.url)) {
            Services.io
                .newChannelFromURI(Services.io.newURI(tabs.activeTab.url, null, null))
                .asyncOpen(this, null);
        }
    },
    onStartRequest: function(aRequest, aContext) {
        console.log('MarkdownDocumentObserver: onStartRequest');
    },
    onStopRequest: function(aRequest, aContext, aStatusCode) {
        console.log('MarkdownDocumentObserver: onStopRequest');
    },
    onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
        console.log('MarkdownDocumentObserver: onDataAvailable');

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

                }, false);
            }
        }
        catch (ex) {
            console.error('data: ', ex.message, ex);
        }
    },
    register: function() {
        console.log('MarkdownDocumentObserver: registered');
        Services.obs.addObserver(this, this.topic, false);
    },
    unregister: function() {
        console.log('MarkdownDocumentObserver: unregistered');
        Services.obs.removeObserver(this, this.topic);
    }
});

var mdObserver = new MarkdownDocumentObserver();
mdObserver.register();

Services.obs.addObserver(function() {
    console.log('System: xpcom-will-shutdown');

    console.log('MarkdownMimeTypeObserver: unregistered');
    registrar.unregisterFactory(MarkdownMimeTypeObserver.prototype.classID, MarkdownMimeTypeObserverFactory);

    console.log('TestObserver: unregistered');
    registrar.unregisterFactory(TestObserver.prototype.classID, TestObserverFactory);

    mdObserver.unregister();
}, 'xpcom-will-shutdown');
