'use strict';

/* global utils */

(function () {
  $(document).ready(function () {
    var searchTooltip, doneTooltip;

    /**
     * share js for displaying message while transition animation shows
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
            $('.content').css('display', 'none'); //hide all steps content
            $(showEl).css('display', 'block');
          }
        }
      };
    })();

    // when close button is clicked
    $('#close_btn').click(function () {
      window.parent.postMessage({method: 'close'}, '*');
      window.close();
    });

    // when "cannot_find_link" link is clicked
    $('.tryagain').click(function () {
      $('.content').css('display', 'none');
      $('.content.search .item').remove();
      goToStep1(true);
    });

    // when feedback button is clicked
    $('.feedback').click(function () {
      goToFeedback();
    });

    // when signup button is clicked
    $('.signup').click(function () {
      $('#close_btn').click();
      return true;
    });

    // when login button is clicked
    $('.loginBtn').click(function () {
      goToLogin();
      return false;
    });
    $(document).ajaxError(function () {
      // set global ajax error method
      goToError();
    });

    /**
     * init extension dialog
     */
    loading.show(chrome.i18n.getMessage('strLoggingin'));

    //Check if user has logged in
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

    //Get selected text and prefill to name/address field
    Service.GetActiveWindow(function (url) {
      //Get web page data by URL
      Service.Scraper(url);

      // ensure the images are recieved
      console.log(Resource.activeWindow.images);
    });

    /**
     * step 1 - display "where are you going to remember"
     */
    var goToStep1 = function goToStep1 (isError) {
      window.parent.postMessage({method: 'goto', data: 'step1'}, '*'); //show iframe and set its size
      loading.hide('.content.where'); //hide transition page and display .content.where
      $('#searchPlacesInput').focus();
      // new or retry
      $('#whereHeader').html((isError ?
        chrome.i18n.getMessage('tryanotherDescription') :
        chrome.i18n.getMessage('whereDescription')));
      $('#visit_mappingbird_link').text(chrome.i18n.getMessage('strVisitMappingBird'));
    };

    /**
     * step 2 - display search result
     */
    var goToStep2 = function goToStep2 () {
      window.parent.postMessage({method: 'goto', data: 'step2'}, '*'); //set iframe's size
      var inputEl = $('#searchPlacesInput');
      var outputEl = $('.content.search .search-result');

      loading.show( chrome.i18n.getMessage('strLocating') + '<b>' + $(inputEl).val() + '</b>...');

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
        $('.content.search .search-header p').text(chrome.i18n.getMessage('strSearchResultTitle'));
        $('.content.search .search-header span').text(places.length + chrome.i18n.getMessage('strSearchResultDescription'));
        places.forEach(function(place) {
          outputHtml += generatePlaceTemplate(place);
        });

        $(outputEl).prepend(outputHtml);
        $('#cannot_find_link').text(chrome.i18n.getMessage('strCannotFind'));
        $('#save').text(chrome.i18n.getMessage('strSaveBtn'));

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
            searchTooltip = utils.createTooltip(chrome.i18n.getMessage('tipSaveTitle'),
              chrome.i18n.getMessage('tipSaveDescription'),
              ['bottom-arrow', 'popup']);
            $('.footer').append(searchTooltip);
          }
        });
      });
    };

    // Start to searching for place
    $('#searchForm').submit(function(event) {
      if(!$('#searchPlacesInput').val()) {
        $('.content.where').addClass('showError');
        $('.content.where .warningMessage').text(chrome.i18n.getMessage('errEmptyNameorAddress'));
      } else {
        goToStep2();
      }
      event.preventDefault();
    });

    // Create item template for search result page
    var generatePlaceTemplate = function generatePlaceTemplate (data) {
      var output = ['<div class="item"">', // active
      '<p class="title">',
      data.name,
      '</p>',
      '<p class="description">',
      data.address,
      '</p>',
        '<img class="maps" src="',
        'https://maps.googleapis.com/maps/api/staticmap?size=300x180&' +
        'maptype=roadmap&markers=',
        data.coordinates.lat + ',' + data.coordinates.lng,
        '"/>',
      '</div>'].join('');

      return output;
    };

    /**
     * step 3 - Place save completed
     */
    var goToStep3 = function goToStep3 () {
      window.parent.postMessage({method: 'goto', data: 'step3'}, '*');

      loading.show(chrome.i18n.getMessage('strSaving'));

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
        var savedImagesUrls = [];
        for(var i=0;i<4 && i<Resource.activeWindow.images.length; i++){
          savedImagesUrls.push(Resource.activeWindow.images[i].src);
        }
        goToSaveImages(savedImagesUrls);
      });

      if (searchTooltip) {
        searchTooltip.parentElement.remove(searchTooltip);
        searchTooltip = null;
        doneTooltip = utils.createTooltip(chrome.i18n.getMessage('tipDoneTitle'),
          chrome.i18n.getMessage('tipDoneDescription'), ['bottom-arrow', 'done']);
        $('.content.save').prepend(doneTooltip);
      }

    };

    /**
     * save images
     */
    var goToSaveImages = function goToSaveImages(savedImagesUrls){
      loading.show(chrome.i18n.getMessage('strSavingImage'));

      var maxNumberOfImage = savedImagesUrls.length;
      var oriNumberofImage = Resource.saveImages.length;
      var headerImg;

      for(var i=0;i<savedImagesUrls.length; i++){

        Service.SaveImages(savedImagesUrls[i], function(saveImages){
          if((saveImages.length - oriNumberofImage) === maxNumberOfImage){

            console.log('all images are saved.');
            loading.hide('.content.save');

            // step 3 save ui data
            $('#btnEditPhotos').text(chrome.i18n.getMessage('strEditPhotosBtn'));
            $('#saveCompleteTitle').text(Resource.selected.name);
            $('#saveCompleteStatus').text(chrome.i18n.getMessage('strPlaceSavedStatus'));
            $('#saveCompleteManage').text(chrome.i18n.getMessage('strManagePlace'));
            $('#saveCompleteManage').attr('href',
              'http://stage.mappingbird.com/app#/point/' + Resource.savePointId + '/' +
              Resource.saveCollection);

            $('#saveCompletePicture ul').empty();
            for(var j=0; j<saveImages.length; j++){
              headerImg = document.createElement('li');
              headerImg.style.backgroundImage = 'url(' + saveImages[j].src + ')';
              $('#saveCompletePicture ul').append(headerImg);
            }

            // initial pic carousel
            $('#saveHeaderImage').css('width', (saveImages.length*100) + '%');
            if(saveImages.length > 1){
              $('.content.save .pic_actions .next_pic').show();
            }

            $('#saveCompleteDescription').attr('placeholder', chrome.i18n.getMessage('pholdSavedPlaceDescription'));
            $('#update').text(chrome.i18n.getMessage('strUpdateBtn'));

            $('.content.save .save_complete_icon').removeClass('hideme');
            $('.content.save .header').fadeIn(350);
            $('.content.save hr').fadeIn(350);
            $('.content.save form').fadeIn(350);
            $('#saveCompleteManage').fadeIn(350);
          }
        });
      }        
    };

    // When 'Edit Photos' is clicked
    $('#btnEditPhotos').click(function(){
      $('#strEditPhotoHeader .numSelected').text(Resource.saveImages.length);
      $('#strEditPhotoHeader .numTotal').text(Resource.activeWindow.images.length);
      $('#strEditPhotoHeader .strHeader').text(chrome.i18n.getMessage('strEditPhotosHeader'));
      $('#doneSelectPhotos').text(chrome.i18n.getMessage('strEditPhotosDone'));
      $('.content.save .save_complete_icon').addClass('hideme');
      $('.content.save .header').fadeOut(350);
      $('.content.save hr').fadeOut(350);
      $('.content.save form').fadeOut(350);
      $('#saveCompleteManage').fadeOut(350, function(){
        $('.content.photos').fadeIn(500, function(){
          $('.content.save').hide();
          showEditPhotos();
        });
      });
    });

    // When 'Save' button on search result is clicked
    $('#save').click(function () {
      goToStep3();
    });

    // Show Edit Photo page
    var showEditPhotos = function showEditPhotos(){
      window.parent.postMessage({method: 'goto', data: 'selectPhotos'}, '*');

      var itemPhotos;
      var saveImages = Resource.activeWindow.images;
      $('.content.photos .header').fadeIn(800);
      $('#selectPhotoList').fadeIn(500);
      $('.content.photos .footer').fadeIn(800, function(){
        $('.content.photos .photo-list').css('height','');
        
        $('#selectPhotoList').empty();
        for(var i=0; i<saveImages.length; i++){
          itemPhotos = document.createElement('li');
          itemPhotos.style.backgroundImage = 'url(' + saveImages[i].src + ')';
          itemPhotos.style.backgroundSize = (saveImages[i].width > saveImages[i].height)? 'auto 100%':'100% auto';
          itemPhotos.onclick = function(){ clickPhotos($(this)); };
          if($.grep(Resource.saveImages, function(e){ return e.src == saveImages[i].src;}) == 0){
            /* do nothing for now */
          } else {
            $(itemPhotos).append('<img src="../images/blue_check_mark.png" class="selected" />');
            $(itemPhotos).addClass('saved');
          }          
          $('#selectPhotoList').append(itemPhotos);
        }
      });
    }

    // Trigger click photo when click on check-mark icon
    $('selectPhotoList .selected').click(function(){ clickPhotos($(this).parent()); });

    // When each photo is clicked
    var clickPhotos = function clickPhotos(clickedPhoto){
      if($(clickedPhoto).attr('class') == 'saved'){
        $(clickedPhoto).removeClass('saved');
        $(clickedPhoto).children('.selected').fadeOut(150);
      } else {
        $(clickedPhoto).addClass('saved');
        $(clickedPhoto).append('<img src="../images/blue_check_mark.png" class="selected" />');
      }
      $('#strEditPhotoHeader .numSelected').text($('#selectPhotoList li.saved').length);
    }

    // When "Done" button on select-photo page is clicked
    $('#doneSelectPhotos').click(function(){
      $('.content.photos .footer').fadeOut(800, function(){
        $('#selectPhotoList').fadeOut(500);
        $('.content.photos .photo-list').animate({height: '0'}, 500, function(){
          $('.content.photos .header').fadeOut(800, function(){
            
            // Get current selected photos
            var newSelectedPhotos = $('#selectPhotoList li.saved'); //all selected photos from the web page
            var oriSavedPhotos = Resource.saveImages; //default selected photos
            var newSavedPhotos = newSelectedPhotos;
            var removePhotos = oriSavedPhotos;
            var newSavedPhotoUrls = [];

            // Get photos which need to be saved
            for(var i=0;i<oriSavedPhotos.length;i++){
              newSavedPhotos = $.grep(newSavedPhotos, function(e){
                return $(e).css('background-image').replace('url(', '').replace(')','') != oriSavedPhotos[i].src;
              });
            }

            // Get photos which need to be removed
            for(var j=0;j<newSelectedPhotos.length;j++){
              removePhotos = $.grep(removePhotos, function(e){
                return e.src != $(newSelectedPhotos[j]).css('background-image').replace('url(', '').replace(')','')
              });
            }

            // Remove deselected images
            
            for(var n=0; n<removePhotos.length; n++){
              Service.RemoveImages(removePhotos[n].imgID);
              Resource.saveImages = $.grep(Resource.saveImages, function(e){
                return e.imgID != removePhotos[n].imgID;
              });
            }
            
            console.log(Resource.saveImages);

            // Add new selected images
            for(var k=0;k<newSavedPhotos.length;k++){
              newSavedPhotoUrls.push($(newSavedPhotos[k]).css('background-image').replace('url(', '').replace(')',''));
            }
            console.log(newSavedPhotoUrls);
            goToSaveImages(newSavedPhotoUrls);

            
          });
        });
      });
    });

    // When "comment" field is clicked
    $('#saveCompleteDescription').focus(function(){
      window.parent.postMessage({method: 'goto', data: 'addcomments'}, '*');
      $('#saveCompleteDescription').addClass('onFocus');
      $('#update').addClass('showme');
    });
    /**
     * step 4 - update place information (tags, comments)
     */
    $('#update').click(function () {
      loading.show(chrome.i18n.getMessage('strUpdating'));

      Service.UpdatePoint({
        tags: $('#saveCompleteTag').val(),
        description: $('#saveCompleteDescription').val()
      }, function () {
        window.parent.postMessage({method: 'goto', data: 'step4'}, '*');
        loading.hide('.content.update');
        /*$('#updateForm').html('<p style="text-align:center;margin:25px 0;"> ' +
          'Place Updated. </p>');*/
        $('.content.update .header').text(chrome.i18n.getMessage('strUpdateTitle'));
        $('.content.update .view').text(chrome.i18n.getMessage('strViewSavedPlace'));
      });

      if (doneTooltip) {
        doneTooltip.parentElement.remove(doneTooltip);
        doneTooltip = null;
        chrome.storage.local.set({firstRun: false}, function() {
          console.log('tutorial has been finished');
        });
      }
    });

    /**
     * header picture carousel
     */
     $('.content.save .pic_actions .next_pic').click(function(){

      $('#saveHeaderImage').animate({
        marginLeft: '-=' + $('#saveHeaderImage li').width()
      }, 250, function(){
        if($('#saveHeaderImage').css('margin-left') != '0px'){
          $('.content.save .pic_actions .pre_pic').css('display', 'block');
        }
        if($('#saveHeaderImage').css('margin-left') == ('-' + $('#saveHeaderImage li').width()*(Resource.saveImages.length-1)+'px')){
          $('.content.save .pic_actions .next_pic').css('display', 'none');
        }
        if(parseInt($('#saveHeaderImage').css('margin-left')) < parseInt('-' + $('#saveHeaderImage li').width()*(Resource.saveImages.length-1))){
          $('#saveHeaderImage').css('margin-left', ('-' + $('#saveHeaderImage li').width()*(Resource.saveImages.length-1)+'px'));
        }
      });
     });

     $('.content.save .pic_actions .pre_pic').click(function(){
      $('#saveHeaderImage').animate({
        marginLeft: '+=' + $('#saveHeaderImage li').width()
      }, 250, function(){
        if($('#saveHeaderImage').css('margin-left') == '0px'){
          $('.content.save .pic_actions .pre_pic').css('display', 'none');
        }
        if($('#saveHeaderImage').css('margin-left') != ('-' + $('#saveHeaderImage li').width()*(Resource.saveImages.length-1)+'px')){
          $('.content.save .pic_actions .next_pic').css('display', 'block');
        }
        if(parseInt($('#saveHeaderImage').css('margin-left')) > 0){
          $('#saveHeaderImage').css('margin-left','0px');
        }
      });
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
      window.parent.postMessage({method: 'goto', data: 'error'}, '*');
      loading.hide('.content.error');
      $('#errTitle').text(chrome.i18n.getMessage('strErrorTitle'));
      $('#errDescription').text(chrome.i18n.getMessage('strErrorDescription'));
      $('#btnTryAgain').text(chrome.i18n.getMessage('strTryAgainBtn'));
      $('#btnFeedback').text(chrome.i18n.getMessage('strFeedbackBtn'));

    };

  /**
     * feedback page
     */
    var goToFeedback = function goToFeedback() {
      window.parent.postMessage({method: 'goto', data: 'feedback'}, '*');
      loading.hide('.content.feedback');
      $('#feedback_title').text(chrome.i18n.getMessage('strFeedbackTitle'));
      $('#feedbackMessage').attr('placeholder', chrome.i18n.getMessage('pholdFeedbackField'));
      $('#feedback_btn').text(chrome.i18n.getMessage('strFeedBackGo'));

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
      $('#login_header').text(chrome.i18n.getMessage('strLoginHeader'));
      $('#login_btn').text(chrome.i18n.getMessage('strLoginBtn'));
      $('#signup_btn').text(chrome.i18n.getMessage('strSignupBtn'));

      $('#login_btn').click(function () {
        if (!$('#loginEmail').val() || !$('#loginPassword').val()) {
          inputError();
          return;
        }
        // login
        loading.show(chrome.i18n.getMessage('strLoggingin'));
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
    activeWindow: {},
    scrapeData: '',
    selected: {},
    savePointId: null,
    saveCollection: null,
    saveImages: []
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
        if (evt.data.method === 'getSelection') {
          Resource.activeWindow = {
            images: evt.data.images,
            url: evt.data.url,
            title: evt.data.title
          };
          $('#searchPlacesInput').val(Resource.selectionText = evt.data.data);
          if (fn) {
            fn(evt.data.url);
          }
        }
      });
    },
    GetPlaces: function (obj, fn) {
      var url = Resource.activeWindow.url;
      if (!obj.q) {
        obj.q = Resource.activeWindow.title;
      }
      $.get('http://stage.mappingbird.com/api/places?q=' + encodeURI(obj.q) +'&url=' + encodeURI(url))
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

          // save id
          Resource.savePointId = data.id;

          // save collection
          Resource.saveCollection = data.collection;

          if (fn) {
            fn(data);
          }
          
        });
    },
    SaveImages: function (imgUrl, fn) {
      var apiUrl = 'http://stage.mappingbird.com/api/images';
      $.post(apiUrl, {point: Resource.savePointId, url: imgUrl})
      .done(function(img){
        Resource.saveImages.push({
          imgID: img.id,
          src: img.url
        });
        if(fn){
          fn(Resource.saveImages);
        }
      });
    },
    RemoveImages: function (imgID, fn){
      $.ajax({
        url: 'http://stage.mappingbird.com/api/images/' + imgID,
        type: 'DELETE'
      })
        .success(function(){
          if(fn){
            fn();
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
