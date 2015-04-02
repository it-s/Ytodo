/*jshint unused:false */
(function (exports) {
    'use strict';
    exports.LocalDrive = {
        fetch: function (STORAGE_KEY) {
            if (!STORAGE_KEY) return false;
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        },
        save: function (STORAGE_KEY, data) {
            if (!STORAGE_KEY) return false;
            return localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
    };
})(window);