'use strict';

chrome.extension.onMessage.addListener(function (request, sender) {
  //Hanlde request based on method
  if (request.method == "getSelection") {
    var msg = document.getSelection().toString();

    //Send selected text back to popup.html
    if (msg) {
      chrome.extension.sendMessage({
        data: msg
      });
    }

  }
  else {
    chrome.extension.sendMessage({});
  } // snub them.
});
