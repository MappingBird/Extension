'use strict';

/* global utils, Promise */

(function() {
  var popup;

  function close() {
    popup.parentElement.removeChild(popup);
    popup = null;
  }

  function sortImages(a,b){
    if(a.width*a.height < b.width*b.height)
      {return 1;}
    if(a.width*a.height > b.width*b.height)
      {return -1;}
    return 0;
  }

  window.addEventListener('message', function(evt) {
    var request = evt.data;
    // Handle events from mappingbird.js
    // get text selection
    if (request.method === 'getSelection') {
      var msg = document.getSelection().toString() || '';

      //Get images of the page
      var imgs = document.getElementsByTagName('img');
      var imgList = [];
      for(var i=0; i < imgs.length; i++){
        if(imgs[i].height > 160 && imgs[i].width > 160){
          imgList.push({
            src: imgs[i].src,
            height: imgs[i].height,
            width: imgs[i].width
          });
        }
      }
      imgList.sort(sortImages);

      //Send selected text and images back to popup.html
      evt.source.postMessage({
        method: request.method,
        data: msg,
        images: imgList,
        url: window.location.href,
        title: document.title
      }, chrome.extension.getURL(''));
    // adjust height for difference panels
    } else if (request.method === 'goto') {
      popup.className = 'mappingbird-frame ' + request.data;
    // Close popup
    } else if (request.method === 'close') {
      close();
    }
  });

  chrome.extension.onMessage.addListener(function (request) {
    // show popup if receive inject message
    if (request.method === 'inject') {
      // clear revious popup content if popup already exists
      if (popup) {
        close();
      }
      // initiate popup
      popup = document.createElement('iframe');
      popup.className = 'mappingbird-frame';
      popup.setAttribute('frameBorder', '0');
      popup.src = chrome.extension.getURL('popup.html');
      document.body.appendChild(popup);
      window.setTimeout(function() {
        popup.classList.add('step1');
      });
    }
    else {
      chrome.extension.sendMessage({});
    } // snub them.
  });

  // start tutorial if this is the first run
  var eiffelTowerUrl = 'http://www.lonelyplanet.com/france/paris/sights/' +
    'landmarks-monuments/eiffel-tower';

  var p = new Promise(function(resolve) {
    chrome.storage.local.get('firstRun', function(items) {
      if (items.firstRun === undefined) {
        chrome.storage.local.set({firstRun: true}, function() {
          resolve(true);
        });
      } else {
        resolve(items.firstRun);
      }
    });
  });

  p.then(function(firstRun) {
    if (!firstRun) {
      return;
    }
    if (window.location.href === eiffelTowerUrl) {
      var popupTooltip;
      var h1 = document.querySelector('h1.copy--h1');
      var rect = h1.getBoundingClientRect();
      var desc = chrome.i18n.getMessage('tipHighlightDescription');

      var eiffelTowerTooltip = utils.createTooltip(chrome.i18n.getMessage('tipHighlightTitle'),
        desc, ['bottom-arrow']);


      eiffelTowerTooltip.style.left = rect.left + 'px';
      eiffelTowerTooltip.style.top = (rect.top - rect.height - 100) + 'px';

      document.body.appendChild(eiffelTowerTooltip);

      document.body.addEventListener('mouseup', function() {
        if (window.getSelection().toString().indexOf('Eiffel Tower') !== -1) {
          if (eiffelTowerTooltip) {
            eiffelTowerTooltip.parentElement.removeChild(eiffelTowerTooltip);
            eiffelTowerTooltip = null;
          }

          popupTooltip = utils.createTooltip(chrome.i18n.getMessage('tipClickTitle'),
            chrome.i18n.getMessage('tipClickDescription'));
          popupTooltip.style.top = '10px';
          popupTooltip.style.right = '10px';
          document.body.appendChild(popupTooltip);
        }
      });

      chrome.extension.onMessage.addListener(function (request) {
        if (popupTooltip && request.method === 'getSelection') {
          popupTooltip.parentElement.removeChild(popupTooltip);
          popupTooltip = null;
        }
      });
    }
  });
})();
