'use strict';

window.Vue = require('vue');

const app = new Vue({
    el: '#app',
    data: {
        version: self.options.version,
        bookmarks: [],
        newBookmark: { title: '', path: '' },
        isActiveModal: false
    },
    created: function() {
        let bookmarks = this.bookmarks;
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

            let path = this.newBookmark.path;

            if (/\.m(arkdown|kdn?|d(o?wn)?)(\?.*)?(#.*)?/i.test(path)) {
                // .md file
            } else if (!/(\/|\\)$/.test(path)) {
                path += navigator.platform.indexOf('Win') === -1 ? '/' : '\\';
            }

            if (!/file:\/\/+/.test(path)) {
                path = navigator.platform.indexOf('Win') === -1
                                ? 'file://' + path
                                : 'file:///' + path.replace('\\', '/');
            }

            var bookmark = {
                title: this.newBookmark.title,
                path: path
            };

            let alreadyRegistered = false;
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
            let deleteIndex = -1;
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
