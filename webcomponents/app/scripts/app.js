(function(document) {
  'use strict';



  document.addEventListener('polymer-ready', function() {
    // Perform some behaviour
    console.log('Polymer is ready to rock!');
  });

  //var sayHello = document.querySelector('jdy-dashboard');
  //sayHello.addEventListener('said-hello', function(e) {
  //  console.log('Hello from jdy-dashboard with: ', e);
  //});
  //sayHello.sayHi();

// wrap document so it plays nice with other libraries
// http://www.polymer-project.org/platform/shadow-dom.html#wrappers
})(wrap(document));
