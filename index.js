// For Linux
var { Ci, Cu, Cr, Cc, CC, components } = require('chrome');
var registrar = components.manager.QueryInterface(Ci.nsIComponentRegistrar);
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

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
        this.content = '';
        this.uri = aRequest.QueryInterface(Ci.nsIChannel).URI.spec;
        this.channel = aRequest;
        this.channel.contentCharset = 'UTF-8';
        this.channel.contentType = 'text/plain';
        this.listener.onStartRequest(this.channel, aContext);
    },

    onStopRequest: function(aRequest, aContext, aStatusCode) {
        var sis = Cc['@mozilla.org/io/string-input-stream;1'].createInstance(Ci.nsIStringInputStream);
        sis.setData(this.content, this.content.length);
        this.listener.onDataAvailable(this.channel, aContext, sis, 0, this.content.length);
        this.listener.onStopRequest(this.channel, aContext, aStatusCode);
    },

    onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
        var si = Cc['@mozilla.org/scriptableinputstream;1'].createInstance();
        si = si.QueryInterface(Ci.nsIScriptableInputStream);
        si.init(aInputStream);
        this.content += si.read(aCount);
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

Services.obs.addObserver({
    observe: function() {
        registrar.unregisterFactory(MarkdownMimeTypeObserver.prototype.classID, MarkdownMimeTypeObserverFactory);
    }
}, 'xpcom-will-shutdown', false);

// Main
var { ToggleButton } = require('sdk/ui/button/toggle');
var ss = require('sdk/simple-storage');
var tabs = require('sdk/tabs');
var panels = require('sdk/panel');
var pageMod = require('sdk/page-mod');

if (!ss.storage.bookmarks) {
    ss.storage.bookmarks = [];
}

function readFileContent(path) {
    var fileIO = require("sdk/io/file");

    var data = {
        dirs: [],
        files: [],
        content: null
    };

    if (fileIO.exists(path)) {
        var reader = fileIO.open(path, "r");
        if (!reader.closed) {
            data.content = reader.read();
            reader.close();
        }
    }

    var dirPath = fileIO.dirname(path);
    var files = fileIO.list(dirPath);

    files.forEach(function(filename) {
        var item = fileIO.join(dirPath, filename);
        if (fileIO.isFile(item)) {
            data.files.push(filename);
        } else {
            data.dirs.push(filename);
        }
    });

    return data;
}

var button = ToggleButton({
    id: 'markdown-viewer',
    label: 'Markdown Viewer',
    icon: {
        '16': './img/icon-16.png',
        '32': './img/icon-32.png',
        '64': './img/icon-64.png'
    },
    onChange: function(state) {
        if (state.checked) {
            panel.show({
                position: button
            });
        }
    }
});

var panel = panels.Panel({
    width: 320,
    height: 420,
    contentURL: './panel.html',
    contentScriptFile: [
        './js/lib/vue.js',
        './js/panel.js'
    ],
    contentScriptOptions: {
        version: require('./package.json').version
    },
    onHide: function() {
        button.state('window', { checked: false });
    }
});

pageMod.PageMod({
    include: 'file://*',
    contentScriptFile: [
        './js/lib/jquery.js',
        './js/lib/marked.js',
        './js/lib/emojione.js',
        './js/lib/highlight.js',
        './js/MarkdownConverter.js',
        './js/index.js'
    ],
    onAttach: function(worker) {
        worker.port.on('request-content', function(path) {
            worker.port.emit('response-content', readFileContent(path));
        });
    }
});

panel.port.emit('load-bookmarks', ss.storage.bookmarks);

panel.port.on('show-bookmark', function(path) {
    tabs.open(path);
    button.state('window', { checked: false });
    panel.hide();
});

panel.port.on('add-bookmark', function(bookmark) {
    ss.storage.bookmarks.push(bookmark);
});

panel.port.on('delete-bookmark', function(bookmark) {
    var deleteIndex = -1;
    ss.storage.bookmarks.forEach(function(b, i) {
        if (b.path === bookmark.path) {
            deleteIndex = i;
        }
    });
    if (0 <= deleteIndex) {
        ss.storage.bookmarks.splice(deleteIndex, 1);
    }
});

panel.port.on('clear-all-data', function() {
    ss.storage.bookmarks = [];
});
