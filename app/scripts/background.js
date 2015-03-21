'use strict';

/* global async */

// send "inject" method to contentscript.js
chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {method: 'inject'});
  });
});


// handle getCookies message from mappingbird.js
chrome.extension.onMessage.addListener(function(request) {
  if (request.method === 'getCookies') {
    // Convert two type of cookies to async tasks and send back to
    // mappingbird.js.
    var tasks = request.names.map(function(name) {
      return function(done) {
        var cookies = { domain: 'stage.mappingbird.com', name: name};
        chrome.cookies.getAll(cookies, function(data) {
          done(null, data);
        });
      };
    });
    async.series(tasks, function(err, results) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          method: request.method,
          data: results
        });
      });
    });
  }
});
