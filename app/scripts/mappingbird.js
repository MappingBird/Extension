'use strict';

/* global utils */

(function () {
  $(document).ready(function () {
    var searchTooltip, doneTooltip;

    /**
     * share js
     */
    var loading = (function loading () {
      var el = $('.loading'),
        close = $('#close_btn');

      return {
        show: function (msg) {
          // when loading show, hide all content
          $('.content').css('display', 'none');

          $(el).css('display', 'flex');
          $(close).css('display', 'none');
          if (msg) {
            $('.loading span').html(msg);
          }
        },
        hide: function (showEl) {
          $(el).css('display', 'none');
          $(close).css('display', 'block');

          // remove all error style
          $('.errorStyle').removeClass('.errorStyle');
          // show the specific element
          if (showEl) {
            $('.content').css('display', 'none');
            $(showEl).css('display', 'block');
          }
        }
      };
    })();

    $('#close_btn').click(function () {
      window.parent.postMessage({method: 'close'}, '*');
      window.close();
    });

    $('.tryagain').click(function () {
      $('.content').css('display', 'none');
      $('.content.search .item').remove();
      goToStep1(true);
    });

    $('.feedback').click(function () {
      goToFeedback();
    });

    $('.signup').click(function () {
      goToSignup();
      return false;
    });
    $('.loginBtn').click(function () {
      goToLogin();
      return false;
    });
    $(document).ajaxError(function () {
      // set global ajax error method
      goToError();
    });

    /**
     * init extension
     */
    loading.show('Login...');
    Service.GetCurrentUser(function (data) {
      console.log('[Login] ', data);
      if (!data.id || !data.email) {
        // goToError();
        goToLogin();
      } else {
        // goToError();
        goToStep1();
      }
    });
    Service.GetActiveWindow(function (url) {
      Service.Scraper(url);
    });

    /**
     * step 0 - before step 1
     */
    var goToStep1 = function goToStep1 (isError) {
      window.parent.postMessage({method: 'goto', data: 'step1'}, '*');
      loading.hide('.content.where');
      $('#searchPlacesInput').focus();
      // new or retry
      $('#whereHeader').html((isError ?
        'Try another search words or use address directly.' :
        'Where are you going to bookmark?'));
    };

    /**
     * step 1 - where
     */
    var goToStep2 = function goToStep2 () {
      window.parent.postMessage({method: 'goto', data: 'step2'}, '*');
      var inputEl = $('#searchPlacesInput');
      var outputEl = $('.content.search');

      loading.show('Searching...');

      Service.GetPlaces({q: $(inputEl).val()}, function (data) {
        var outputHtml ='';
        loading.hide('.content.search');

        if (data === null || data.error || data.places.length <= 0) {
          goToStep1(true);
        }

        // limit 10 data
        var places = data.places.filter(function(place, index) {
          return index < 10;
        });
        places.forEach(function(place) {
          outputHtml += generatePlaceTemplate(place);
        });

        $(outputEl).prepend(outputHtml);

        // focus first item
        var firstEl = $('.content.search').find('.item')[0];
        $(firstEl).addClass('active');
        Resource.selected = places[0];

        $('.content.search .item').click(function () {
          $('.content.search .item').not(this).removeClass('active');
          $(this).addClass('active');
          Resource.selected = places[$(this).index()];
        });

        chrome.storage.local.get('firstRun', function(items) {
          var firstRun = items.firstRun;
          var place = $('#searchPlacesInput').val();
          if (firstRun && place.indexOf('Eiffel Tower') !== -1) {
            searchTooltip = utils.createTooltip('Save Eiffel Tower',
              'After confirming which oen to save, click "Save"',
              ['bottom-arrow', 'popup']);
            $('.footer').append(searchTooltip);
          }
        });
      });
    };

    $('#searchForm').submit(function(event) {
      if(!$('#searchPlacesInput').val()) {
        $('.content.where').addClass('showError');
      } else {
        goToStep2();
      }
      event.preventDefault();
    });

    var generatePlaceTemplate = function generatePlaceTemplate (data) {
      var output = ['<div class="item"">', // active
      '<p class="title">',
      data.name,
      '</p>',
      '<p class="description">',
      data.address,
      '</p>',
        '<img class="maps" src="',
        'https://maps.googleapis.com/maps/api/staticmap?size=336x200&' +
        'maptype=roadmap&markers=',
        data.coordinates.lat + ',' + data.coordinates.lng,
        '"/>',
      '<hr/>',
      '</div>'].join('');

      return output;
    };

    /**
     * step 2 - search
     */
    var goToStep3 = function goToStep3 () {
      window.parent.postMessage({method: 'goto', data: 'step3'}, '*');

      loading.show('Save...');

      Service.SavePoints({
        'title': Resource.activeWindow.title,
        'url': Resource.activeWindow.url,
        'description': '',
        'tags': [],
        'place_name': Resource.selected.name ? Resource.selected.name :
                      Resource.activeWindow.title,
        'place_address': Resource.selected.address,
        'place_phone': '',
        'coordinates': Resource.selected.coordinates.lat + ',' +
                       Resource.selected.coordinates.lng,
        'type': 'misc', // need to define
        // collection: 'xx' // need to replace
      }, function (data) {
        console.log('[Save] ', data);
        loading.hide('.content.save');

        // step 3 save ui data
        $('#saveCompleteTitle').html(Resource.selected.name);
        $('#saveCompleteManage').attr('href',
          'http://stage.mappingbird.com/app#/point/' + Resource.savePointId + '/' +
          Resource.saveCollection);
        if (Resource.scrapeData.images[0]){
          $('#saveCompletePicture').html(
            '<img src="' + Resource.scrapeData.images[0] + '"/>'
          );
        } else if (data.images[0]) {
          $('#saveCompletePicture').attr('src', data.images[0].url);
        }

      });

      if (searchTooltip) {
        searchTooltip.parentElement.remove(searchTooltip);
        searchTooltip = null;
        doneTooltip = utils.createTooltip('Awesome! Place saved',
          'That\'s it. Now you can decide whether to update tags, ' +
          'comments or not', ['bottom-arrow', 'done']);
        $('.content.save').prepend(doneTooltip);
      }

    };

    $('#save').click(function () {
      goToStep3();
    });

    /**
     * step 3 - save
     */
    $('#update').click(function () {
      loading.show('Update...');

      Service.UpdatePoint({
        tags: $('#saveCompleteTag').val(),
        description: $('#saveCompleteDescription').val()
      }, function () {
        window.parent.postMessage({method: 'goto', data: 'step4'}, '*');
        loading.hide('.content.save');
        $('#updateForm').html('<p style="text-align:center;margin:25px 0;"> ' +
          'Place Updated. </p>');
      });

      if (doneTooltip) {
        doneTooltip.parentElement.remove(doneTooltip);
        doneTooltip = null;
        chrome.storage.local.set({firstRun: false}, function() {
          console.log('tutorial has been finished');
        });
      }
    });

    $('#saveCompleteTag').keypress(function(event) {
      // Prevent popup show again if enter key is pressed
      if (event.which === 13) {
        event.preventDefault();
      }
    });

    /**
     * error page
     */
    var goToError = function goToError() {
      loading.hide('.content.error');
    };

  /**
     * feedback page
     */
    var goToFeedback = function goToFeedback() {
      loading.hide('.content.feedback');
    };

    $('#feedback_btn').click(function () {
      loading.show('Sending...');
      Service.SendFeedback({
        email: $('#feedbackEmail').val(),
        subject: 'Extension Feedback',
        message: $('#feedbackMessage').val()
      }, function () {
        loading.hide();
        goToStep1();
      });

      return false;
    });

    /**
     * login page
     */
    var goToLogin = function goToLogin() {
      window.parent.postMessage({method: 'goto', data: 'login'}, '*');
      loading.hide('.content.login');

      $('#login_btn').click(function () {
        if (!$('#loginEmail').val() || !$('#loginPassword').val()) {
          inputError();
          return;
        }
        // login
        loading.show('Login...');
        Service.Login({
          email: $('#loginEmail').val(),
          password: $('#loginPassword').val()
        }, function (data) {
          if (data.user) {
            Service.GetCurrentUser();
            goToStep1();
          } else if (data.error) {
            loading.hide('.content.login');
            inputError();
          }
        });
      });

      var inputError = function inputError () {
        // error ui
        $('#loginEmail,#loginPassword').addClass('errorStyle');
        $('#login_btn').addClass('errorStyle');
      };
    };

    /*
     * signup page
     */
    var goToSignup = function goToSignup() {
      loading.hide('.content.signup');
    };
    $('#signup_btn').click(function () {
      if (!$('#signupEmail').val() || !$('#signupPassword1').val() ||
          !$('#signupPassword2').val()) {
        signUpinputError();
        return false;
      }
      // Signup
      loading.show('Signup...');
      Service.Signup({
        email: $('#signupEmail').val(),
        password: $('#signupPassword1').val()
      },
      function (data) {
        if (data.email) {
          goToLogin();
        } else if (data.error) {
          loading.hide('.content.signup');
          signUpinputError();
        }
      });
      return false;
    });

    var signUpinputError = function inputError () {
      // error ui
      $('#signupEmail,#signupPassword1,#signupPassword2')
        .addClass('errorStyle');
      $('#signup_btn').addClass('errorStyle');
    };
  }
);

  /**
   * Resource and Service
   */
  var Resource = {
    userId: '',
    userEmail: '',
    token: '',
    selectionText: '',
    activeWindow: '',
    scrapeData: '',
    selected: {},
    savePointId: null,
    saveCollection: null
  };

  var Service = {
    GetCurrentUser: function (fn) {
      /**
       * Not login, get the user instantly if already login
       */
      $.get('http://stage.mappingbird.com/api/user/current')
        .success(function (data) {
          console.log('[Login]', data);
          Resource.userId = data.id;
          Resource.userEmail = data.email;


          // access chrome cookie
          // we will get both domain stage.mappingbird.com
          // www.stage.mappingbird.com but we
          // need stage.mappingbird.com
          var options = {
            method: 'getCookies',
            names: ['csrftoken', 'sessionid']
          };
          chrome.extension.sendMessage(options);
          chrome.extension.onMessage.addListener(function(request) {
            var csrftoken, sessionid;
            if (request.method === 'getCookies') {
              csrftoken = request.data[0].filter(function(cookie) {
                return cookie.domain === 'stage.mappingbird.com';
              })[0].value;
              sessionid = request.data[1].filter(function(cookie) {
                return cookie.domain === 'stage.mappingbird.com';
              })[0].value;
              $.ajaxSetup({
                headers: {
                  'X-CSRFToken': csrftoken,
                  'sessionid': sessionid
                }
              });
            }
          });

          if (fn) {
            fn(data);
          }
        });
    },
    GetActiveWindow: function (fn) {
      window.parent.postMessage({method: 'getSelection'}, '*');
      window.addEventListener('message', function(evt) {
        $('#searchPlacesInput').val(Resource.selectionText = evt.data.data);
        if (fn) {
          fn(evt.data.url);
        }
      });
    },
    GetPlaces: function (obj, fn) {
      if (!obj.q) {
        obj.q = Resource.activeWindow.title;
      }
      $.get('http://stage.mappingbird.com/api/places?q=' + encodeURI(obj.q))
        .success(function (data) {

          if (fn) {
            fn(data);
          }
        });
    },
    SavePoints: function (obj, fn) {
      /**
       * {
       *  title: 'Suria KLCC Sdn Bhd - Corporate',
       *  url: 'http://www.suriaklcc.com.my/index.htm',
       *  description: '',
       *  tags: '',
       *  place_name: 'Suria KLCC',
       *  place_address: 'Jalan P Ramlee, Kuala Lumpur City Centre,
       *                  Kuala Lumpur, Federal Territory of Kuala Lumpur,
                          Malaysia',
       *  place_phone: '',
       *  coordinates: '3.157187,101.71121500000004',
       *  type: 'misc'
       * }
       *
       * and also set image
       */
      $.post('http://stage.mappingbird.com/api/points', obj)
        .success(function (data) {
          console.log(Resource.scrapeData);
          // save image 因為 api 的關係， post /api/images 得獨立發送
          var imageUrl = 'http://stage.mappingbird.com/api/images';
          Resource.scrapeData.images.forEach(function(image, index) {
            if (index < 4) {
              $.post(imageUrl, {point: data.id, url: image});
            }
          });

          // save id
          Resource.savePointId = data.id;

          // save collection
          Resource.saveCollection = data.collection;

          if (fn) {
            fn(data);
          }
        });
    },
    UpdatePoint: function (obj, fn) {
      /**
       * tags: 'tags1, tags2'
       * description: 'something else'
       */
      $.ajax({
        url: 'http://stage.mappingbird.com/api/points/' + Resource.savePointId,
        data: {
          tags: obj.tags,
          description: obj.description,
          collection: Resource.saveCollection
        },
        type: 'PUT'
      })
        .success(function (data) {
          if (fn) {
            fn(data);
          }
        });
    },
    GetTags: function (fn) {
      // https://www.stage.mappingbird.com/api/tags
      $.get('https://www.stage.mappingbird.com/api/tags')
        .success(function (data) {
          if (data) {
            fn(data);
          }
        });
    },
    Scraper: function (url, fn) {
      // https://github.com/mariachimike/pingismo/wiki/Backend-API#scraper
      var scraperUrl = 'http://stage.mappingbird.com/api/scraper?url=' +
                       encodeURIComponent(url);
      $.get(scraperUrl)
        .success(function (data) {

          Resource.scrapeData = data;
          if (fn) {
            fn(data);
          }
        });
    },
    SendFeedback: function (obj, fn) {
      // send feedback
      $.post('http://stage.mappingbird.com/api/feedback', obj)
        .success(function (data) {
          if (fn) {
            fn(data);
          }
        }
      );
    },
    Login: function (obj, fn) {
      // POST /api/user/login
      $.post('http://stage.mappingbird.com/api/user/login', obj)
        .success(function (data) {
          if (fn) {
            fn(data);
          }
        });
    },
    Signup: function (obj, fn) {
      // POST /api/users
      $.post('http://stage.mappingbird.com/api/users', obj)
        .success(function (data) {
          if (fn) {
            fn(data);
          }
        });
    }
  };
})();
