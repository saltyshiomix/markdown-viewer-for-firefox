var app = new Vue({
    el: '#app',
    data: {
        bookmarks: [],
        newBookmark: { title: '', path: '' },
        isActiveModal: false
    },
    created: function() {
        var bookmarks = this.bookmarks;
        self.port.on('load-bookmarks', function(data) {
            data.forEach(function(datum) {
                bookmarks.push({ title: datum.title, path: datum.path });
            });
        });
    },
    methods: {
        showBookmark: function(path) {
            self.port.emit('show-bookmark', path);
        },
        addBookmark: function() {
            if (!this.newBookmark.title || !this.newBookmark.path) {
                return;
            }

            var path = this.newBookmark.path;
            if (!/(\/|\\)$/.test(path) && !/\.m(arkdown|kdn?|d(o?wn)?)(\?.*)?(#.*)?$/i.test(path)) {
                path += path.indexOf('\\') === -1 ? '/' : '\\';
            }
            if (!/file:\/\/+/.test(path) && navigator.platform.indexOf('Win') === -1) {
                path = 'file://' + path;
            }
            var bookmark = {
                title: this.newBookmark.title,
                path: path
            };

            var alreadyRegistered = false;
            this.bookmarks.forEach(function(b) {
                if (b.path === path) {
                    alreadyRegistered = true;
                }
            });
            if (alreadyRegistered) {
                alert('Already registered.');
            } else {
                this.bookmarks.push(bookmark);
                self.port.emit('add-bookmark', bookmark);
            }

            this.newBookmark.title = '';
            this.newBookmark.path = '';
            this.isActiveModal = false;
        },
        deleteBookmark: function(bookmark) {
            var deleteIndex = -1;
            this.bookmarks.forEach(function(b, i) {
                if (b.path === bookmark.path) {
                    deleteIndex = i;
                }
            });
            if (0 <= deleteIndex) {
                this.bookmarks.splice(deleteIndex, 1);
                self.port.emit('delete-bookmark', bookmark);
            }
        },
        clearAllData: function() {
            this.bookmarks = [];
            self.port.emit('clear-all-data');
        },
        toggleModal: function() {
            this.isActiveModal = !this.isActiveModal;
        }
    }
});
