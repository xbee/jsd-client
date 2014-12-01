
(function () {
  'use strict';

  Polymer("jdy-dashboard", {

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
      pn: peerNum
      up: upload
      dwn: download
      pd: peerDown
      sd: serverDown
      pp: peerPercent
      sp: serverPercent
     */
    refresh: function() {
      this.peer_num_text = String(this.model.peerNum);
      this.upload_text = this.bytesToSize(this.model.upload);
      this.download_text = this.bytesToSize(this.model.download);
      this.peer_down_text = this.bytesToSize(this.model.peerDown);
      this.server_down_text = this.bytesToSize(this.model.serverDown);
      this.peer_percent_text = String(this.model.peerPercent);
      this.server_percent_text = String(this.model.serverPercent);
      this.dPeer.value = this.model.peerPercent;
      this.dServer.value = this.model.serverPercent;
    },

    sayHi: function() {
      this.fire('said-hello');
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
