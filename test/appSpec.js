
define(['app', 'jquery', 'lodash'], function(jsd, $, _) {

    describe('just checking', function() {

        it('works for lodash', function() {
            // just checking that _ works
            expect(_.size([1,2,3])).toEqual(3);
        });

        it('works for JSD', function() {
            expect(jsd.Client).toBeDefined();
            expect(jsd._debuging).toBeDefined();
            if (jsd._debuging) {
                expect(jsd.Uuid).toBeDefined();
                expect(jsd.Uuid.generate).toBeDefined();
//                var uuid = new jsd.Uuid();
//                expect(uuid.generate).toBeDefined();
//                expect(uuid.generate().length).toEqual(36);
//                expect(jsd.settings.uuid).toEqual('11111111-2222-3333-4444-cb8c4b75b564');
            } else {
                expect(jsd.Uuid).toBeUndefined();
            }
            expect(jsd.settings).toBeDefined();
            expect(jsd.SignalSession).toBeDefined();
            expect(jsd.PeerSession).toBeDefined();
            expect(jsd.PeerSessionManager).toBeDefined();
            expect(jsd.settings.uuid).toBeDefined();
            expect(jsd.settings.signalServer.host).toEqual('localhost');
            expect(jsd.settings.signalServer.port).toEqual(3081);
        });

    });

    describe('Test SignalSession', function() {
        var el = $('<div></div>');
        var app = new jsd.App(el);
        var signal = new jsd.SignalSession();

        expect(signal.connect).toBeDefined();
        expect(signal.disconnect).toBeDefined();
        expect(signal.send).toBeDefined();
//        expect(jsd.enumLocalIPs).toBeDefined();
        expect(signal.localIPs).toBeDefined();

//        signal.enumLocalIPs.call(signal, function(data) {
//
//        });

//        signal.enumLocalIPs(function (datas) {
//            localIPs = datas;
//        });
//        expect(localIPs.length).toBeGreaterThan(0);
//        expect(signal.localIPs.length).toBeGreaterThan(0);
    });

});
