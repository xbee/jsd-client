
define(['app', 'jquery', 'lodash'], function(jsd, $, _) {

    describe('just checking', function() {

        it('works for app', function() {
            var el = $('<div></div>');

            var app = new jsd.App(el);
            app.render();

            expect(el.text()).toEqual('require.js up and running');
        });

        it('works for lodash', function() {
            // just checking that _ works
            expect(_.size([1,2,3])).toEqual(3);
        });

        it('works for JSD', function() {
            expect(jsd.App).toBeDefined();
            expect(jsd.Uuid).toBeUndefined();
            expect(jsd.Settings).toBeUndefined();
            expect(jsd.SignalSession).toBeDefined();
            expect(jsd.PeerSession).toBeDefined();
            expect(jsd.PeerSessionManager).toBeDefined();
        });

    });

    describe('Test SignalSession', function() {
        var signal = jsd.SignalSession();
        var localIPs = [];

        expect(signal.connect).toBeDefined();
        expect(signal.disconnect).toBeDefined();
        expect(signal.send).toBeDefined();
        expect(signal.enumLocalIPs).toBeDefined();
        expect(signal.localIPs).toBeDefined();

        signal.enumLocalIPs(function (datas) {
            localIPs = datas;
        });
//        expect(localIPs.length).toBeGreaterThan(0);
        expect(signal.localIPs.length).toBeGreaterThan(0);
    });

});
