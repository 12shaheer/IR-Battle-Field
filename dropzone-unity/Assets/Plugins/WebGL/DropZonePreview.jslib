mergeInto(LibraryManager.library, {
  DropZoneWebReady: function () { window.dispatchEvent(new CustomEvent('dropzone-ready')); },
  DropZoneWebError: function (message) { window.dispatchEvent(new CustomEvent('dropzone-error', { detail: UTF8ToString(message) })); }
});
