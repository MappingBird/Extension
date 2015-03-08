'use strict';

(function() {

  chrome.extension.onMessage.addListener(function (request, sender) {
    //Hanlde request based on method
    if (request.method == 'getSelection') {
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

  // start tutorial if this is the first run
  var eiffelTowerUrl = 'http://www.lonelyplanet.com/france/paris/sights/' +
    'landmarks-monuments/eiffel-tower';

  var p = new Promise(function(resolve, reject) {
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

      var eiffelTowerTooltip = document.createElement('div');
      var desc = 'Once you\'ve found a place you want to save, highlight ' +
                 '(text-select) the name or address of the place first';

      var eiffelTowerTooltip = utils.createTooltip('Highlight "Eiffel Tower"', desc,
        ['bottom-arrow']);


      eiffelTowerTooltip.style.left = rect.left + 'px';
      eiffelTowerTooltip.style.top = (rect.top - rect.height - 100) + 'px';

      document.body.appendChild(eiffelTowerTooltip);

      document.body.addEventListener('mouseup', function() {
        if (window.getSelection().toString().indexOf('Eiffel Tower') !== -1) {
          if (eiffelTowerTooltip) {
            eiffelTowerTooltip.parentElement.removeChild(eiffelTowerTooltip);
            eiffelTowerTooltip = null;
          }

          popupTooltip = utils.createTooltip('Click MappingBird button',
            'After highlight the text, hit the MappingBird exntesion you just ' +
            'installed.');
          popupTooltip.style.top = '10px';
          popupTooltip.style.right = '10px';
          document.body.appendChild(popupTooltip);
        }
      });

      chrome.extension.onMessage.addListener(function (request, sender) {
        if (popupTooltip && request.method == 'getSelection') {
          popupTooltip.parentElement.removeChild(popupTooltip);
          popupTooltip = null;
        }
      });
    }
  });
})();
