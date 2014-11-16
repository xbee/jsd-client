(function() {

    if('ontouchstart' in document.documentElement) {
        document.querySelector('.js-ex').setAttribute('style', 'overflow-x: scroll;');
        document.querySelector('.html-ex').setAttribute('style', 'overflow-x: scroll;');
    }
    var bLazy = new Blazy({
        breakpoints: [{
            width: 420, // max-width
            src: 'data-src-small'
        }]
        , success: function(element) {
            updateCounter();
            setTimeout(function() {
                var parent = element.parentNode;
                parent.className = parent.className.replace(/\bloading\b/,'');
            }, 200);
        }
    });

// not needed, only here to illustrate amount of loaded images
    var imageLoaded = 0;
    var eleCountLoadedImages = document.getElementById('loaded-images');

    function updateCounter() {
        imageLoaded++;
        eleCountLoadedImages.innerHTML = imageLoaded;
    }
})();


