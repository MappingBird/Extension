(function () {

'use strict';



$(document).ready(function () {

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

        $(el).css('display', 'block');
        $(close).css('display', 'none');
        if (msg) {
          $('.loading').html(msg);
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
    }
  })();

  $('#close_btn').click(function () {
    window.close();
  });

  $('.tryagain').click(function () {
    $('.content').css('display', 'none');
    goToStep1(true);
  });

  $('.feedback').click(function () {
    goToFeedback();
  });

  $('.signup').click(function (e) {
    goToSignup();
    return false;
  });
  $('.loginBtn').click(function (e) {
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
  Service.GetActiveWindow(function (data) {
    Service.Scraper(data[0].url);
  });

  /**
   * step 0 - before step 1
   */
  var goToStep1 = function goToStep1 (isError) {
    loading.hide('.content.where');
    $('#searchPlacesInput').focus();
    // new or retry
    $('#whereHeader').html((isError ? 'Try another search words or use address directly.' : 'Where are you going to bookmark?'));
  };

  /**
   * step 1 - where
   */
  var goToStep2 = function goToStep2 () {
    var inputEl = $('#searchPlacesInput');
    var outputEl = $('.content.search');

    loading.show('Searching...');

    Service.GetPlaces({q: $(inputEl).val()}, function (data) {
      var outputHtml ='';
      loading.hide('.content.search');

      if (data == null || data.error || data.places.length <= 0) {
        goToStep1(true);
      }

      // limit 5 data
      for (var i = 0, len = Math.min(10, data.places.length);i<len;i++) {
        outputHtml += generatePlaceTemplate(data.places[i]);
      }

      $(outputEl).prepend(outputHtml);

      // focus first item
      var firstEl = $('.content.search').find('.item')[0];
      $(firstEl).addClass('active');
      Resource.selected = data.places[0];

      $('.content.search .item').click(function () {
        $('.content.search .item').not(this).removeClass('active');
        $(this).addClass('active');
        Resource.selected = data.places[$(this).index()];
      });
    });
  };

  $('#searching').click(function () {
    goToStep2();
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
      'https://maps.googleapis.com/maps/api/staticmap?size=336x200&maptype=roadmap&markers=',
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

    loading.show('Save...');

    Service.SavePoints({
      title: Resource.activeWindow.title,
      url: Resource.activeWindow.url,
      description: '',
      tags: [],
      place_name: Resource.selected.name ? Resource.selected.name : Resource.activeWindow.title,
      place_address: Resource.selected.address,
      place_phone: '',
      coordinates: Resource.selected.coordinates.lat + ',' + Resource.selected.coordinates.lng,
      type: 'misc', // need to define
      // collection: 'xx' // need to replace
    }, function (data) {
      console.log('[Save] ', data);
      loading.hide('.content.save');

      // step 3 save ui data
      $('#saveCompleteTitle').html(Resource.selected.name);
      $('#saveCompleteManage').attr('href', 'https://mappingbird.com/app#/point/' + Resource.savePointId + '/' + Resource.saveCollection);
      if (Resource.scrapeData.images[0]){
        $('#saveCompletePicture').html('<img src="' + Resource.scrapeData.images[0] + '"/>');
      } else if (data.images[0]) {
        $('#saveCompletePicture').attr('src', data.images[0].url);
      }

    });

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
      loading.hide('.content.save');
      $('#updateForm').html('<p style="text-align:center;margin:25px 0;"> Place Updated. </p>');
    });
  });

  /**
   * error page
   */
  var goToError = function goToError() {
    loading.hide('.content.error');
  }

/**
   * feedback page
   */
  var goToFeedback = function goToFeedback() {
    loading.hide('.content.feedback');
  }

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
        })
      });

      var inputError = function inputError () {
        // error ui
        $('#loginEmail,#loginPassword').addClass('errorStyle');
        $('#login_btn').addClass('errorStyle'); //.html('Invalid email or password.');
      }
   }

   /* 
    * signup page
    */
    var goToSignup = function goToSignup() {
      loading.hide('.content.signup');
    }
    $('#signup_btn').click(function (e) {
        if (!$('#signupEmail').val() || !$('#signupPassword1').val() || !$('#signupPassword2').val()) {
          signUpinputError();
          return false;
        }
        // Signup
        loading.show('Signup...');
        Service.Signup({
          email: $('#signupEmail').val(),
          password: $('#signupPassword1').val()
        }, function (data) {
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
        $('#signupEmail,#signupPassword1,#signupPassword2').addClass('errorStyle');
        $('#signup_btn').addClass('errorStyle'); //.html('Invalid email or password.');
      }
});

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
      $.get('https://mappingbird.com/api/user/current')
        .success(function (data) {
          console.log('[Login]', data)
          Resource.userId = data.id;
          Resource.userEmail = data.email;


          // access chrome cookie
          // we will get both domain mappingbird.com www.mappingbird.com but we need mappingbird.com
          chrome.cookies.getAll({domain: 'mappingbird.com',name: 'csrftoken'}, function (data) {
            var csrftoken,
              sessionid;
            for (var i = 0; i < data.length; i++) {
              if (data[i].domain === 'mappingbird.com') {
                csrftoken = data[i].value;
                break;
              }
            }

            chrome.cookies.getAll({domain: 'mappingbird.com', name: 'sessionid'}, function (data2) {

              for (var j = 0; j < data2.length; j++) {
                if (data2[j].domain === 'mappingbird.com') {
                  sessionid = data2[j].value;
                  break;
                }
              }

              $.ajaxSetup({
                headers: {
                  'X-CSRFToken': csrftoken,
                  'sessionid': sessionid
                }
              });
            });

          });

          if (fn) {
            fn(data);
          }
        });
    },
    GetActiveWindow: function (fn) {
      chrome.tabs.query({active: true, currentWindow: true}, function (currentWindow) {
        Resource.activeWindow = currentWindow[0];

        // get selection text value
        chrome.tabs.sendMessage(currentWindow[0].id, {
          method: "getSelection"
        });

        if (fn) {
          fn(currentWindow);
        }
      });

      chrome.extension.onMessage.addListener(function (response, sender) {


        $('#searchPlacesInput').val(Resource.selectionText = response.data);
        //Set text to text area
        // var text = document.getElementById('text');
        // text.value = response.data;
      });

    },
    GetPlaces: function (obj, fn) {
      if (!obj.q) {
        obj.q = Resource.activeWindow.title;
      }
      $.get('https://mappingbird.com/api/places?q=' + encodeURI(obj.q))
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
       *  place_address: 'Jalan P Ramlee, Kuala Lumpur City Centre, Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia',
       *  place_phone: '',
       *  coordinates: '3.157187,101.71121500000004',
       *  type: 'misc'
       * }
       *
       * and also set image
       */
      $.post('https://mappingbird.com/api/points', obj)
        .success(function (data) {
console.log(Resource.scrapeData);
          // save image 因為 api 的關係， post /api/images 得獨立發送
          $.post('https://mappingbird.com/api/images', {point: data.id, url: Resource.scrapeData.images[0]});
          $.post('https://mappingbird.com/api/images', {point: data.id, url: Resource.scrapeData.images[1]});
          $.post('https://mappingbird.com/api/images', {point: data.id, url: Resource.scrapeData.images[2]});
          $.post('https://mappingbird.com/api/images', {point: data.id, url: Resource.scrapeData.images[3]});

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
        url: 'https://mappingbird.com/api/points/' + Resource.savePointId,
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
      // https://www.mappingbird.com/api/tags
      $.get('https://www.mappingbird.com/api/tags')
        .success(function (data) {
          if (data) {
            fn(data);
          }
        });
    },
    Scraper: function (url, fn) {
      // https://github.com/mariachimike/pingismo/wiki/Backend-API#scraper
      $.get('https://mappingbird.com/api/scraper?url=' + encodeURIComponent(url))
        .success(function (data) {

          Resource.scrapeData = data;
          if (fn) {
            fn(data);
          }
        })
    },
    SendFeedback: function (obj, fn) {
      // send feedback
      $.post('https://mappingbird.com/api/feedback', obj)
        .success(function (data) {
          if (fn) {
            fn(data);
          }
      });
    },
    Login: function (obj, fn) {
      // POST /api/user/login
      $.post('https://mappingbird.com/api/user/login', obj)
        .success(function (data) {
          if (fn) {
            fn(data);
          }
        });
    },
    Signup: function (obj, fn) {
      // POST /api/users
      $.post('https://mappingbird.com/api/users', obj)
        .success(function (data) {
          if (fn) {
            fn(data);
          }
        });
    }
  }
})();
