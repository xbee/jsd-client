
(function () {
  'use strict';

  Polymer("jdy-statistic", {

    // define element prototype here
    attached: function () {

      this.model = document.querySelector('#' + this.modelId);
      this.dServer = this.$.downloadServer;
      this.dPeer = this.$.downloadPeer;
      //this.refresh();
      //this.addEventListener('stat-changed', this.onStatChanged);

    },

    modelIdChanged: function() {
      this.model = document.querySelector('#' + this.modelId);
    },

    /*
     bytes: bytes of data
     fn: number of fixed, default is 2
     */
    bytesToSize: function(bytes, fn) {
      if (!fn) fn = 2;
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      if (bytes == 0) return '0 Bytes';
      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      if (i == 0) return bytes + ' ' + sizes[i];
      return (bytes / Math.pow(1024, i)).toFixed(fn) + ' ' + sizes[i];
    }
  });

})();
